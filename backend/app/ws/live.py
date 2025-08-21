import asyncio
import json
import hashlib
import random
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Set
from enum import Enum
import structlog
from fastapi import WebSocket, WebSocketDisconnect
from app.services.dhan_client import dhan_client

logger = structlog.get_logger()

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
    ERROR = "error"

class Channel(str, Enum):
    POSITIONS = "positions"
    ORDERS = "orders"
    HOLDINGS = "holdings"
    TRADES = "trades"
    PNL = "pnl"

class ChangeEvent:
    def __init__(self, upsert: List[Dict], remove: List[str]):
        self.upsert = upsert
        self.remove = remove

class SummaryEvent:
    def __init__(self, snapshot_hash: str, counts: Dict[str, int]):
        self.snapshot_hash = snapshot_hash
        self.counts = counts

class ResumeRequest:
    def __init__(self, last_seq: int):
        self.last_seq = last_seq

class WebSocketManager:
    def __init__(self):
        self.active_connections: Dict[str, Dict[str, Any]] = {}
        self.total_connections = 0
        self.peak_concurrent_connections = 0
        self.sequence_number = 0
        self.start_time = datetime.now()
        
        # Event tracking for debug features
        self.recent_events: List[Dict[str, Any]] = []
        self.recent_errors: List[Dict[str, Any]] = []
        self.max_events_to_keep = 100
        self.max_errors_to_keep = 50
        
        # Polling state
        self.polling_active = False
        self.last_poll_times: Dict[str, datetime] = {}
        self.last_snapshots: Dict[str, Any] = {}
        self.last_hashes: Dict[str, str] = {}
        
        # Polling intervals with jitter
        self.poll_intervals = {
            Channel.POSITIONS: (1, 2),    # 1-2 seconds
            Channel.ORDERS: (2, 3),       # 2-3 seconds
            Channel.HOLDINGS: (20, 30),   # 20-30 seconds
            Channel.TRADES: (30, 60),     # 30-60 seconds
            Channel.PNL: (1, 2)           # 1-2 seconds
        }

    def _log_event(self, event_type: str, channel: str = None, details: Dict[str, Any] = None):
        """Log an event for debugging purposes"""
        event = {
            "timestamp": datetime.now().isoformat(),
            "type": event_type,
            "channel": channel,
            "seq": self.get_next_seq(),
            "connection_count": len(self.active_connections),
            "details": details or {}
        }
        
        self.recent_events.append(event)
        
        # Keep only recent events
        if len(self.recent_events) > self.max_events_to_keep:
            self.recent_events = self.recent_events[-self.max_events_to_keep:]
        
        logger.debug(f"WebSocket event logged: {event_type} for {channel}")

    def _log_error(self, error_type: str, error_message: str, trace_id: str = None, details: Dict[str, Any] = None):
        """Log an error for debugging purposes"""
        error_entry = {
            "timestamp": datetime.now().isoformat(),
            "error_type": error_type,
            "error_message": error_message,
            "trace_id": trace_id,
            "details": details or {}
        }
        
        self.recent_errors.append(error_entry)
        
        # Keep only recent errors
        if len(self.recent_errors) > self.max_errors_to_keep:
            self.recent_errors = self.recent_errors[-self.max_errors_to_keep:]
        
        logger.error(f"WebSocket error logged: {error_type} - {error_message}")

    def get_next_seq(self) -> int:
        """Get next sequence number"""
        self.sequence_number += 1
        return self.sequence_number

    def compute_hash(self, data: Any) -> str:
        """Compute hash of data for change detection"""
        data_str = json.dumps(data, sort_keys=True, default=str)
        return hashlib.md5(data_str.encode()).hexdigest()

    def detect_changes(self, channel: str, new_data: Any) -> bool:
        """Detect if data has changed"""
        new_hash = self.compute_hash(new_data)
        old_hash = self.last_hashes.get(channel)
        
        if old_hash != new_hash:
            self.last_hashes[channel] = new_hash
            self.last_snapshots[channel] = new_data
            return True
        
        return False

    def compute_delta(self, channel: str, old_data: List, new_data: List, id_field: str = "id") -> Dict[str, Any]:
        """Compute delta between old and new data"""
        old_ids = {item[id_field] for item in old_data}
        new_ids = {item[id_field] for item in new_data}
        
        # Find items to remove
        remove_ids = old_ids - new_ids
        
        # Find items to upsert (new or modified)
        upsert_items = []
        for new_item in new_data:
            old_item = next((item for item in old_data if item[id_field] == new_item[id_field]), None)
            if not old_item or self.compute_hash(old_item) != self.compute_hash(new_item):
                upsert_items.append(new_item)
        
        return {
            "upsert": upsert_items,
            "remove": list(remove_ids)
        }

    async def connect(self, websocket: WebSocket, client_id: str):
        """Handle new WebSocket connection"""
        await websocket.accept()
        
        # Track connection
        self.active_connections[client_id] = {
            "websocket": websocket,
            "connected_at": datetime.now(),
            "last_activity": datetime.now(),
            "subscriptions": set(),
            "last_sequence": 0,
            "client_info": {},
            "is_alive": True
        }
        
        self.total_connections += 1
        self.peak_concurrent_connections = max(self.peak_concurrent_connections, len(self.active_connections))
        
        # Send hello message
        hello_message = {
            "type": MessageType.HELLO.value,
            "protocol": "v1",
            "serverTime": datetime.now().isoformat(),
            "channels": [channel.value for channel in Channel],
            "seq": self.get_next_seq()
        }
        
        await websocket.send_text(json.dumps(hello_message))
        
        # Log connection event
        self._log_event("connection_established", details={"client_id": client_id})
        
        logger.info(f"WebSocket connected: {client_id}. Total connections: {len(self.active_connections)}")

    async def disconnect(self, client_id: str):
        """Handle WebSocket disconnection"""
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            
            # Log disconnection event
            self._log_event("connection_closed", details={"client_id": client_id})
            
            logger.info(f"WebSocket disconnected: {client_id}. Active connections: {len(self.active_connections)}")

    async def handle_message(self, client_id: str, message: Dict[str, Any]):
        """Handle incoming WebSocket message"""
        try:
            message_type = message.get("type")
            client_conn = self.active_connections.get(client_id)
            
            if not client_conn:
                return
            
            # Update last activity
            client_conn["last_activity"] = datetime.now()
            
            if message_type == MessageType.PING.value:
                # Handle ping
                pong_message = {
                    "type": MessageType.PONG.value,
                    "serverTime": datetime.now().isoformat(),
                    "seq": self.get_next_seq()
                }
                await client_conn["websocket"].send_text(json.dumps(pong_message))
                
                # Log ping event
                self._log_event("ping_received", details={"client_id": client_id})
                
            elif message_type == MessageType.SUBSCRIBE.value:
                # Handle subscription
                channels = message.get("channels", [])
                client_conn["subscriptions"].update(channels)
                
                # Log subscription event
                self._log_event("subscription_added", details={"client_id": client_id, "channels": channels})
                
                logger.info(f"Client {client_id} subscribed to channels: {channels}")
                
            elif message_type == MessageType.UNSUBSCRIBE.value:
                # Handle unsubscription
                channels = message.get("channels", [])
                client_conn["subscriptions"].difference_update(channels)
                
                # Log unsubscription event
                self._log_event("subscription_removed", details={"client_id": client_id, "channels": channels})
                
                logger.info(f"Client {client_id} unsubscribed from channels: {channels}")
                
            elif message_type == MessageType.RESUME.value:
                # Handle resume request
                last_seq = message.get("lastSeq", 0)
                client_conn["last_sequence"] = last_seq
                
                # For now, always send resume.ack (in production, you'd check if events are buffered)
                resume_ack = {
                    "type": MessageType.RESUME_ACK.value,
                    "seq": self.get_next_seq(),
                    "serverTime": datetime.now().isoformat()
                }
                await client_conn["websocket"].send_text(json.dumps(resume_ack))
                
                # Log resume event
                self._log_event("resume_request", details={"client_id": client_id, "last_seq": last_seq})
                
                logger.info(f"Client {client_id} resumed from sequence {last_seq}")
                
        except Exception as e:
            # Log error
            self._log_error("message_handling_error", str(e), details={"client_id": client_id, "message": message})
            logger.error(f"Error handling WebSocket message: {e}")

    async def emit_delta(self, channel: str, changes: Dict[str, Any]):
        """Emit delta update to subscribed clients"""
        try:
            seq = self.get_next_seq()
            server_time = datetime.now().isoformat()
            
            # Map channel to correct message type
            if channel == Channel.POSITIONS:
                message_type = MessageType.POSITIONS_DELTA
            elif channel == Channel.ORDERS:
                message_type = MessageType.ORDERS_DELTA
            elif channel == Channel.HOLDINGS:
                message_type = MessageType.HOLDINGS_DELTA
            elif channel == Channel.TRADES:
                message_type = MessageType.TRADES_DELTA
            elif channel == Channel.PNL:
                message_type = MessageType.PNL_UPDATE
            else:
                message_type = f"{channel}.delta"
            
            if message_type == MessageType.PNL_UPDATE:
                message = {
                    "type": message_type.value,
                    "seq": seq,
                    "serverTime": server_time,
                    "totals": changes.get("totals", {}),
                    "perSymbol": changes.get("perSymbol", [])
                }
            else:
                message = {
                    "type": message_type.value,
                    "seq": seq,
                    "serverTime": server_time,
                    "changes": changes
                }
            
            # Send to subscribed clients
            await self.broadcast_message(message, channel)
            
            # Log delta emission
            self._log_event("delta_emitted", channel, {
                "sequence": seq,
                "changes_count": len(changes.get("upsert", [])),
                "removes_count": len(changes.get("remove", []))
            })
            
            logger.debug(f"Emitted {channel} delta: seq={seq}")
            
        except Exception as e:
            # Log error
            self._log_error("delta_emission_error", str(e), details={"channel": channel, "changes": changes})
            logger.error(f"Error emitting delta for {channel}: {e}")

    async def emit_summary(self, channel: str, snapshot_hash: str, counts: Dict[str, int]):
        """Emit summary for backpressure handling"""
        try:
            seq = self.get_next_seq()
            server_time = datetime.now().isoformat()
            
            message = {
                "type": f"{channel}.summary",
                "seq": seq,
                "serverTime": server_time,
                "snapshotHash": snapshot_hash,
                "counts": counts
            }
            
            # Send to all clients
            await self.broadcast_message(message)
            
            # Log summary emission
            self._log_event("summary_emitted", channel, {
                "sequence": seq,
                "snapshot_hash": snapshot_hash,
                "counts": counts
            })
            
            logger.debug(f"Emitted {channel} summary: seq={seq}")
            
        except Exception as e:
            # Log error
            self._log_error("summary_emission_error", str(e), details={"channel": channel, "snapshot_hash": snapshot_hash})
            logger.error(f"Error emitting summary for {channel}: {e}")

    async def broadcast_message(self, message: Dict[str, Any], channel: str = None):
        """Broadcast message to all connected clients"""
        disconnected_clients = []
        
        for client_id, client_conn in self.active_connections.items():
            try:
                # Check if client is subscribed to this channel
                if channel and client_conn["subscriptions"] and channel not in client_conn["subscriptions"]:
                    continue
                
                await client_conn["websocket"].send_text(json.dumps(message))
                
            except Exception as e:
                # Log error
                self._log_error("broadcast_error", str(e), details={"client_id": client_id, "message_type": message.get("type")})
                logger.error(f"Error broadcasting to client {client_id}: {e}")
                disconnected_clients.append(client_id)
        
        # Clean up disconnected clients
        for client_id in disconnected_clients:
            await self.disconnect(client_id)

    async def start_polling(self):
        """Start polling for data changes"""
        if self.polling_active:
            return
        
        self.polling_active = True
        logger.info("Starting WebSocket polling...")
        
        # Start polling tasks for each channel
        for channel in Channel:
            asyncio.create_task(self._poll_channel(channel))

    async def stop_polling(self):
        """Stop polling for data changes"""
        self.polling_active = False
        logger.info("Stopping WebSocket polling...")

    async def _poll_channel(self, channel: Channel):
        """Poll a specific channel for changes"""
        while self.polling_active:
            try:
                # Get polling interval with jitter
                min_interval, max_interval = self.poll_intervals[channel]
                interval = random.uniform(min_interval, max_interval)
                
                await asyncio.sleep(interval)
                
                if not self.polling_active:
                    break
                
                # Fetch data from dhan_client
                data = await self._fetch_channel_data(channel)
                if data is None:
                    continue
                
                # Check for changes
                if self.detect_changes(channel.value, data):
                    # Compute delta
                    old_data = self.last_snapshots.get(channel.value, [])
                    delta = self._compute_delta(channel.value, old_data, data)
                    
                    # Emit delta if there are changes
                    if delta["upsert"] or delta["remove"]:
                        await self.emit_delta(channel.value, delta)
                
                # Update last poll time
                self.last_poll_times[channel.value] = datetime.now()
                
            except Exception as e:
                # Log error
                self._log_error("polling_error", str(e), details={"channel": channel.value})
                logger.error(f"Error polling {channel}: {e}")
                await asyncio.sleep(5)  # Wait longer on error

    async def _fetch_channel_data(self, channel: Channel):
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
                return await dhan_client.get_pnl_async()
            else:
                return None
        except Exception as e:
            # Log error
            self._log_error("data_fetch_error", str(e), details={"channel": channel.value})
            logger.error(f"Error fetching data for {channel}: {e}")
            return None

    def _compute_delta(self, channel: str, old_data: List, new_data: List) -> Dict[str, Any]:
        """Compute delta for a specific channel"""
        try:
            if channel == Channel.POSITIONS.value:
                return self._compute_positions_delta(old_data, new_data)
            elif channel == Channel.ORDERS.value:
                return self._compute_orders_delta(old_data, new_data)
            elif channel == Channel.HOLDINGS.value:
                return self._compute_holdings_delta(old_data, new_data)
            elif channel == Channel.TRADES.value:
                return self._compute_trades_delta(old_data, new_data)
            elif channel == Channel.PNL.value:
                return self._compute_pnl_delta(old_data, new_data)
            else:
                return {"upsert": [], "remove": []}
        except Exception as e:
            # Log error
            self._log_error("delta_computation_error", str(e), details={"channel": channel})
            logger.error(f"Error computing delta for {channel}: {e}")
            return {"upsert": [], "remove": []}

    def _compute_positions_delta(self, old_data: List, new_data: List) -> Dict[str, Any]:
        """Compute positions delta"""
        return self.compute_delta(Channel.POSITIONS.value, old_data, new_data, "id")

    def _compute_orders_delta(self, old_data: List, new_data: List) -> Dict[str, Any]:
        """Compute orders delta with status counts"""
        delta = self.compute_delta(Channel.ORDERS.value, old_data, new_data, "order_id")
        
        # Add status counts
        status_counts = {}
        for order in new_data:
            status = order.status
            status_counts[status] = status_counts.get(status, 0) + 1
        
        delta["statusCounts"] = status_counts
        return delta

    def _compute_holdings_delta(self, old_data: List, new_data: List) -> Dict[str, Any]:
        """Compute holdings delta"""
        return self.compute_delta(Channel.HOLDINGS.value, old_data, new_data, "isin")

    def _compute_trades_delta(self, old_data: List, new_data: List) -> Dict[str, Any]:
        """Compute trades delta"""
        return self.compute_delta(Channel.TRADES.value, old_data, new_data, "trade_id")

    def _compute_pnl_delta(self, old_data: Any, new_data: Any) -> Dict[str, Any]:
        """Compute PnL delta"""
        # For PnL, we return the full data since it's a single object
        return {
            "totals": new_data.totals if hasattr(new_data, 'totals') else {},
            "perSymbol": new_data.per_symbol if hasattr(new_data, 'per_symbol') else []
        }

# Global WebSocket manager instance
ws_manager = WebSocketManager()

async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time data streaming"""
    client_id = f"client_{len(ws_manager.active_connections) + 1}"
    
    try:
        await ws_manager.connect(websocket, client_id)
        
        # Start polling if not already started
        if not ws_manager.polling_active:
            await ws_manager.start_polling()
        
        # Handle messages
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                await ws_manager.handle_message(client_id, message)
                
            except WebSocketDisconnect:
                break
            except json.JSONDecodeError as e:
                # Log error
                ws_manager._log_error("json_decode_error", str(e), details={"client_id": client_id, "raw_data": data})
                logger.error(f"JSON decode error from client {client_id}: {e}")
                continue
            except Exception as e:
                # Log error
                ws_manager._log_error("message_processing_error", str(e), details={"client_id": client_id})
                logger.error(f"Error processing message from client {client_id}: {e}")
                continue
                
    except Exception as e:
        # Log error
        ws_manager._log_error("websocket_error", str(e), details={"client_id": client_id})
        logger.error(f"WebSocket error for client {client_id}: {e}")
        
    finally:
        await ws_manager.disconnect(client_id)

# Startup and shutdown events
async def startup():
    """Startup event handler"""
    logger.info("Starting WebSocket manager...")
    await ws_manager.start_polling()

async def shutdown():
    """Shutdown event handler"""
    logger.info("Stopping WebSocket manager...")
    await ws_manager.stop_polling()
