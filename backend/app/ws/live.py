from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import asyncio
from datetime import datetime
from app.utils.logger import logger

router = APIRouter()

@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    logger.info(f"WebSocket connection established from {ws.client.host}")
    
    try:
        # Send initial connection message
        await ws.send_json({
            "event": "connected", 
            "timestamp": datetime.now().isoformat(),
            "message": "WebSocket connection established"
        })
        
        # Start ping task
        ping_task = asyncio.create_task(send_pings(ws))
        
        # Main message handling loop
        while True:
            try:
                # Wait for client messages with timeout
                data = await asyncio.wait_for(ws.receive_text(), timeout=1.0)
                message = json.loads(data)
                logger.info(f"Received WebSocket message: {message}")
                
                # Handle different message types
                if message.get("type") == "subscribe":
                    await ws.send_json({
                        "event": "subscribed",
                        "channels": message.get("channels", []),
                        "timestamp": datetime.now().isoformat()
                    })
                    logger.info(f"Client subscribed to channels: {message.get('channels', [])}")
                
                elif message.get("type") == "ping":
                    # Respond to client ping
                    await ws.send_json({
                        "event": "pong",
                        "timestamp": datetime.now().isoformat()
                    })
                
            except asyncio.TimeoutError:
                # No message received, continue loop
                continue
            except json.JSONDecodeError:
                logger.warning("Invalid JSON received from WebSocket")
            except WebSocketDisconnect:
                logger.info("WebSocket disconnected by client")
                break
            except Exception as e:
                logger.error(f"Error processing WebSocket message: {e}")
                # Don't break on message errors, continue listening
                
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for {ws.client.host}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        # Cancel ping task
        if 'ping_task' in locals():
            ping_task.cancel()
            try:
                await ping_task
            except asyncio.CancelledError:
                pass
        
        logger.info(f"WebSocket connection closed for {ws.client.host}")

async def send_pings(ws: WebSocket):
    """Send periodic ping messages to keep connection alive"""
    try:
        while True:
            await asyncio.sleep(1)  # Wait 1 second
            
            try:
                # Send ping message
                await ws.send_json({
                    "event": "ping",
                    "timestamp": datetime.now().isoformat()
                })
                logger.debug("Ping sent successfully")
            except Exception as e:
                logger.error(f"Failed to send ping: {e}")
                break
                
    except asyncio.CancelledError:
        logger.info("Ping task cancelled")
    except Exception as e:
        logger.error(f"Ping task error: {e}")
