import asyncio
import json
import hashlib
import time
from datetime import datetime
from typing import Dict, List, Set, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.utils.logger import logger
from app.services.dhan_client import dhan_client
from app.utils.response import error
from app.models.schemas import ErrorCode

router = APIRouter()

class MessageType(str, Enum):
    HELLO = "hello"
    PING = "ping"
    PONG = "pong"
    SUBSCRIBE = "subscribe"
    UNSUBSCRIBE = "unsubscribe"
    RESUME = "resume"
    RESUME_ACK = "resume.ack"
    RESUME_NACK = "resume.nack"
    POSITIONS_DELTA = "positions.delta"
    ORDERS_DELTA = "orders.delta"
    HOLDINGS_DELTA = "holdings.delta"
    TRADES_DELTA = "trades.delta"
    PNL_UPDATE = "pnl.update"
    POSITIONS_SUMMARY = "positions.summary"
    ORDERS_SUMMARY = "orders.summary"
    HOLDINGS_SUMMARY = "holdings.summary"
    TRADES_SUMMARY = "trades.summary"
    ERROR = "error"

class Channel(str, Enum):
    POSITIONS = "positions"
    ORDERS = "orders"
    HOLDINGS = "holdings"
    TRADES = "trades"
    PNL = "pnl"

@dataclass
class ChangeEvent:
    type: MessageType
    seq: int
    server_time: str
    changes: Dict[str, Any]
    channel: Optional[str] = None

@dataclass
class SummaryEvent:
    type: MessageType
    seq: int
    snapshot_hash: str
    counts: Dict[str, int]
    channel: str

@dataclass
class ResumeRequest:
    last_seq: int
    channels: List[str]

class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.sequence_counter = 0
        self.last_snapshots: Dict[str, Any] = {}
        self.snapshot_hashes: Dict[str, str] = {}
        self.client_subscriptions: Dict[WebSocket, Set[Channel]] = {}
        self.event_buffer: List[ChangeEvent] = []
        self.buffer_size = 1000  # Keep last 1000 events for resume
        
        # Polling intervals (in seconds)
        self.polling_intervals = {
            Channel.POSITIONS: 1.5,  # 1-2s with jitter
            Channel.ORDERS: 2.5,     # 2-3s with jitter
            Channel.HOLDINGS: 25,    # 20-30s with jitter
            Channel.TRADES: 45,      # 30-60s with jitter
            Channel.PNL: 1.5         # 1-2s with jitter
        }
        
        # Polling tasks
        self.polling_tasks: Dict[str, asyncio.Task] = {}
        
    def get_next_seq(self) -> int:
        """Get next sequence number"""
        self.sequence_counter += 1
        return self.sequence_counter
    
    def compute_hash(self, data: Any) -> str:
        """Compute hash of data for change detection"""
        if isinstance(data, (dict, list)):
            # Sort dict keys and list items for consistent hashing
            normalized = json.dumps(data, sort_keys=True, default=str)
        else:
            normalized = str(data)
        return hashlib.md5(normalized.encode()).hexdigest()
    
    def detect_changes(self, channel: str, new_data: Any) -> Optional[Dict[str, Any]]:
        """Detect changes and return delta if changed"""
        new_hash = self.compute_hash(new_data)
        
        if channel not in self.snapshot_hashes or self.snapshot_hashes[channel] != new_hash:
            old_data = self.last_snapshots.get(channel)
            self.last_snapshots[channel] = new_data
            self.snapshot_hashes[channel] = new_hash
            
            if old_data is not None:
                return self.compute_delta(channel, old_data, new_data)
            else:
                # First time, return full data as upsert
                return {"upsert": new_data, "remove": []}
        
        return None
    
    def compute_delta(self, channel: str, old_data: Any, new_data: Any) -> Dict[str, Any]:
        """Compute delta between old and new data"""
        if channel == Channel.POSITIONS:
            return self._compute_positions_delta(old_data, new_data)
        elif channel == Channel.ORDERS:
            return self._compute_orders_delta(old_data, new_data)
        elif channel == Channel.HOLDINGS:
            return self._compute_holdings_delta(old_data, new_data)
        elif channel == Channel.TRADES:
            return self._compute_trades_delta(old_data, new_data)
        elif channel == Channel.PNL:
            return self._compute_pnl_delta(old_data, new_data)
        else:
            return {"upsert": new_data, "remove": []}
    
    def _compute_positions_delta(self, old_positions: List, new_positions: List) -> Dict[str, Any]:
        """Compute positions delta"""
        old_ids = {pos.get('id') for pos in old_positions}
        new_ids = {pos.get('id') for pos in new_positions}
        
        removed = list(old_ids - new_ids)
        upsert = []
        
        for pos in new_positions:
            pos_id = pos.get('id')
            old_pos = next((p for p in old_positions if p.get('id') == pos_id), None)
            
            if old_pos is None or pos != old_pos:
                upsert.append(pos)
        
        return {"upsert": upsert, "remove": removed}
    
    def _compute_orders_delta(self, old_orders: List, new_orders: List) -> Dict[str, Any]:
        """Compute orders delta with status counts"""
        old_ids = {order.get('order_id') for order in old_orders}
        new_ids = {order.get('order_id') for order in new_orders}
        
        removed = list(old_ids - new_ids)
        upsert = []
        
        for order in new_orders:
            order_id = order.get('order_id')
            old_order = next((o for o in old_orders if o.get('order_id') == order_id), None)
            
            if old_order is None or order != old_order:
                upsert.append(order)
        
        # Compute status counts
        status_counts = {"open": 0, "completed": 0, "cancelled": 0}
        for order in new_orders:
            status = order.get('status', '').lower()
            if status in status_counts:
                status_counts[status] += 1
        
        return {"upsert": upsert, "remove": removed, "statusCounts": status_counts}
    
    def _compute_holdings_delta(self, old_holdings: List, new_holdings: List) -> Dict[str, Any]:
        """Compute holdings delta"""
        old_isins = {holding.get('isin') for holding in old_holdings}
        new_isins = {holding.get('isin') for holding in new_holdings}
        
        removed = list(old_isins - new_isins)
        upsert = []
        
        for holding in new_holdings:
            isin = holding.get('isin')
            old_holding = next((h for h in old_holdings if h.get('isin') == isin), None)
            
            if old_holding is None or holding != old_holding:
                upsert.append(holding)
        
        return {"upsert": upsert, "remove": removed}
    
    def _compute_trades_delta(self, old_trades: List, new_trades: List) -> Dict[str, Any]:
        """Compute trades delta"""
        old_ids = {trade.get('trade_id') for trade in old_trades}
        new_ids = {trade.get('trade_id') for trade in new_trades}
        
        removed = list(old_ids - new_ids)
        upsert = []
        
        for trade in new_trades:
            trade_id = trade.get('trade_id')
            old_trade = next((t for t in old_trades if t.get('trade_id') == trade_id), None)
            
            if old_trade is None or trade != old_trade:
                upsert.append(trade)
        
        return {"upsert": upsert, "remove": removed}
    
    def _compute_pnl_delta(self, old_pnl: Dict, new_pnl: Dict) -> Dict[str, Any]:
        """Compute PnL delta"""
        return {
            "totals": new_pnl.get('totals', {}),
            "perSymbol": new_pnl.get('perSymbol', [])
        }
    
    async def connect(self, websocket: WebSocket):
        """Handle new WebSocket connection"""
        await websocket.accept()
        self.active_connections.append(websocket)
        self.client_subscriptions[websocket] = set(Channel)  # Subscribe to all channels by default
        
        # Send hello message
        hello_msg = {
            "type": MessageType.HELLO,
            "protocol": "v1",
            "serverTime": datetime.now().isoformat(),
            "channels": [channel.value for channel in Channel]
        }
        await websocket.send_json(hello_msg)
        
        logger.info(f"WebSocket connected: {websocket.client.host}")
    
    def disconnect(self, websocket: WebSocket):
        """Handle WebSocket disconnection"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if websocket in self.client_subscriptions:
            del self.client_subscriptions[websocket]
        logger.info(f"WebSocket disconnected: {websocket.client.host}")
    
    async def send_to_client(self, websocket: WebSocket, message: Dict[str, Any]):
        """Send message to specific client"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Failed to send message to client: {e}")
            self.disconnect(websocket)
    
    async def broadcast(self, message: Dict[str, Any], channels: Optional[List[str]] = None):
        """Broadcast message to all connected clients"""
        disconnected = []
        
        for websocket in self.active_connections:
            if channels is None or any(channel in self.client_subscriptions.get(websocket, set()) for channel in channels):
                try:
                    await websocket.send_json(message)
                except Exception as e:
                    logger.error(f"Failed to broadcast to client: {e}")
                    disconnected.append(websocket)
        
        # Remove disconnected clients
        for websocket in disconnected:
            self.disconnect(websocket)
    
    async def handle_message(self, websocket: WebSocket, message: Dict[str, Any]):
        """Handle incoming WebSocket message"""
        msg_type = message.get("type")
        
        try:
            if msg_type == MessageType.PING:
                # Handle ping with pong response
                pong_msg = {
                    "type": MessageType.PONG,
                    "serverTime": datetime.now().isoformat()
                }
                await self.send_to_client(websocket, pong_msg)
                
            elif msg_type == MessageType.SUBSCRIBE:
                # Handle subscription
                channels = message.get("channels", [])
                if channels:
                    self.client_subscriptions[websocket] = set(Channel(ch) for ch in channels if ch in [c.value for c in Channel])
                else:
                    self.client_subscriptions[websocket] = set(Channel)
                
                logger.info(f"Client {websocket.client.host} subscribed to: {channels}")
                
            elif msg_type == MessageType.UNSUBSCRIBE:
                # Handle unsubscription
                channels = message.get("channels", [])
                if websocket in self.client_subscriptions:
                    for ch in channels:
                        if ch in [c.value for c in Channel]:
                            self.client_subscriptions[websocket].discard(Channel(ch))
                
                logger.info(f"Client {websocket.client.host} unsubscribed from: {channels}")
                
            elif msg_type == MessageType.RESUME:
                # Handle resume request
                await self.handle_resume(websocket, message)
                
            else:
                logger.warning(f"Unknown message type: {msg_type}")
                
        except Exception as e:
            logger.error(f"Error handling message: {e}")
            error_msg = {
                "type": MessageType.ERROR,
                "code": ErrorCode.VALIDATION_ERROR,
                "message": f"Failed to process message: {str(e)}",
                "trace_id": str(int(time.time() * 1000))
            }
            await self.send_to_client(websocket, error_msg)
    
    async def handle_resume(self, websocket: WebSocket, message: Dict[str, Any]):
        """Handle resume request"""
        last_seq = message.get("lastSeq", 0)
        requested_channels = message.get("channels", [])
        
        if not requested_channels:
            requested_channels = [channel.value for channel in Channel]
        
        # Check if we can resume
        if last_seq > 0 and last_seq <= self.sequence_counter:
            # Can resume, send missed events
            missed_events = [event for event in self.event_buffer if event.seq > last_seq]
            
            if missed_events:
                # Send resume.ack with missed events
                ack_msg = {
                    "type": MessageType.RESUME_ACK,
                    "lastSeq": last_seq,
                    "missedEvents": len(missed_events)
                }
                await self.send_to_client(websocket, ack_msg)
                
                # Send missed events
                for event in missed_events:
                    if event.channel in requested_channels:
                        await self.send_to_client(websocket, asdict(event))
            else:
                # No missed events
                ack_msg = {
                    "type": MessageType.RESUME_ACK,
                    "lastSeq": last_seq,
                    "missedEvents": 0
                }
                await self.send_to_client(websocket, ack_msg)
        else:
            # Cannot resume, send nack
            nack_msg = {
                "type": MessageType.RESUME_NACK,
                "lastSeq": last_seq,
                "message": "Resume not possible, refetch snapshots"
            }
            await self.send_to_client(websocket, nack_msg)
    
    async def emit_delta(self, channel: str, changes: Dict[str, Any]):
        """Emit delta event for a channel"""
        event = ChangeEvent(
            type=MessageType(f"{channel}.delta"),
            seq=self.get_next_seq(),
            server_time=datetime.now().isoformat(),
            changes=changes,
            channel=channel
        )
        
        # Add to buffer for resume
        self.event_buffer.append(event)
        if len(self.event_buffer) > self.buffer_size:
            self.event_buffer.pop(0)
        
        # Broadcast to subscribed clients
        await self.broadcast(asdict(event), [channel])
        
        logger.debug(f"Emitted {channel} delta: seq={event.seq}")
    
    async def emit_summary(self, channel: str, data: Any):
        """Emit summary event for backpressure"""
        counts = {}
        if isinstance(data, list):
            counts = {"total": len(data)}
        elif isinstance(data, dict):
            counts = {"total": 1}
        
        summary = SummaryEvent(
            type=MessageType(f"{channel}.summary"),
            seq=self.get_next_seq(),
            snapshot_hash=self.snapshot_hashes.get(channel, ""),
            counts=counts,
            channel=channel
        )
        
        await self.broadcast(asdict(summary), [channel])
        logger.debug(f"Emitted {channel} summary: seq={summary.seq}")
    
    async def start_polling(self):
        """Start polling for data changes"""
        for channel in Channel:
            if channel not in self.polling_tasks or self.polling_tasks[channel].done():
                self.polling_tasks[channel] = asyncio.create_task(
                    self._poll_channel(channel)
                )
    
    async def _poll_channel(self, channel: Channel):
        """Poll a specific channel for changes"""
        while True:
            try:
                # Add jitter to avoid thundering herd
                jitter = (asyncio.get_event_loop().time() % 1) * 0.5
                await asyncio.sleep(self.polling_intervals[channel] + jitter)
                
                # Fetch data from dhan_client
                data = await self._fetch_channel_data(channel)
                if data is not None:
                    # Detect changes
                    changes = self.detect_changes(channel.value, data)
                    if changes:
                        await self.emit_delta(channel.value, changes)
                    
                    # Check for backpressure (if clients are slow)
                    if len(self.active_connections) > 0:
                        await self.emit_summary(channel.value, data)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error polling {channel}: {e}")
                await asyncio.sleep(5)  # Wait before retrying
    
    async def _fetch_channel_data(self, channel: Channel) -> Optional[Any]:
        """Fetch data for a specific channel"""
        try:
            if channel == Channel.POSITIONS:
                return await dhan_client.fetch_positions_async()
            elif channel == Channel.ORDERS:
                return await dhan_client.fetch_orders_async()
            elif channel == Channel.HOLDINGS:
                return await dhan_client.fetch_holdings_async()
            elif channel == Channel.TRADES:
                return await dhan_client.fetch_trades_async()
            elif channel == Channel.PNL:
                # Use enhanced PnL calculation with consistency checks
                return await dhan_client.get_pnl_async()
            else:
                return None
        except Exception as e:
            logger.error(f"Error fetching {channel} data: {e}")
            return None
    
    async def stop_polling(self):
        """Stop all polling tasks"""
        for task in self.polling_tasks.values():
            if not task.done():
                task.cancel()
        
        # Wait for all tasks to complete
        if self.polling_tasks:
            await asyncio.gather(*self.polling_tasks.values(), return_exceptions=True)
            self.polling_tasks.clear()

# Global WebSocket manager instance
ws_manager = WebSocketManager()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint with v1 protocol"""
    await ws_manager.connect(websocket)
    
    try:
        # Start polling if not already started
        if not ws_manager.polling_tasks:
            await ws_manager.start_polling()
        
        # Main message handling loop
        while True:
            try:
                # Wait for client messages
                data = await websocket.receive_text()
                message = json.loads(data)
                
                logger.debug(f"Received WebSocket message: {message}")
                await ws_manager.handle_message(websocket, message)
                
            except WebSocketDisconnect:
                break
            except json.JSONDecodeError:
                logger.warning("Invalid JSON received from WebSocket")
                error_msg = {
                    "type": MessageType.ERROR,
                    "code": ErrorCode.VALIDATION_ERROR,
                    "message": "Invalid JSON format",
                    "trace_id": str(int(time.time() * 1000))
                }
                await ws_manager.send_to_client(websocket, error_msg)
            except Exception as e:
                logger.error(f"Error processing WebSocket message: {e}")
                error_msg = {
                    "type": MessageType.ERROR,
                    "code": ErrorCode.UPSTREAM_FAIL,
                    "message": f"Internal server error: {str(e)}",
                    "trace_id": str(int(time.time() * 1000))
                }
                await ws_manager.send_to_client(websocket, error_msg)
                
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected by client")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        ws_manager.disconnect(websocket)

@router.on_event("startup")
async def startup_event():
    """Start WebSocket polling on startup"""
    logger.info("Starting WebSocket polling...")
    await ws_manager.start_polling()

@router.on_event("shutdown")
async def shutdown_event():
    """Stop WebSocket polling on shutdown"""
    logger.info("Stopping WebSocket polling...")
    await ws_manager.stop_polling()
