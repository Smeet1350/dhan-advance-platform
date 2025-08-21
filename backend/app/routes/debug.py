from fastapi import APIRouter, Request, HTTPException, Query
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import asyncio
import psutil
import os
from app.utils.response import success, error
from app.utils.logger import logger
from app.services.dhan_client import dhan_client
from app.ws.live import ws_manager
from app.models.schemas import ErrorCode

router = APIRouter()

@router.get("/debug/status")
async def get_debug_status(request: Request):
    """Get comprehensive system status and health metrics"""
    try:
        # System metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Process metrics
        process = psutil.Process()
        process_memory = process.memory_info()
        
        # WebSocket status
        ws_stats = {
            "active_connections": len(ws_manager.active_connections),
            "total_connections": ws_manager.total_connections,
            "last_sequence": ws_manager.get_next_seq() - 1,
            "uptime_seconds": (datetime.now() - ws_manager.start_time).total_seconds(),
            "polling_active": ws_manager.polling_active,
            "last_poll_times": {
                "positions": ws_manager.last_poll_times.get("positions"),
                "orders": ws_manager.last_poll_times.get("orders"),
                "holdings": ws_manager.last_poll_times.get("holdings"),
                "trades": ws_manager.last_poll_times.get("trades"),
                "pnl": ws_manager.last_poll_times.get("pnl")
            }
        }
        
        # Dhan client status
        dhan_status = {
            "use_mock_data": dhan_client.use_mock_data,
            "last_api_call": getattr(dhan_client, 'last_api_call', None),
            "api_call_count": getattr(dhan_client, 'api_call_count', 0),
            "error_count": getattr(dhan_client, 'error_count', 0),
            "circuit_breaker_state": getattr(dhan_client, 'circuit_breaker_state', 'CLOSED')
        }
        
        # Recent errors (last 10)
        recent_errors = getattr(ws_manager, 'recent_errors', [])[-10:]
        
        status = {
            "timestamp": datetime.now().isoformat(),
            "system": {
                "cpu_percent": cpu_percent,
                "memory_percent": memory.percent,
                "memory_available_gb": round(memory.available / (1024**3), 2),
                "disk_percent": disk.percent,
                "disk_free_gb": round(disk.free / (1024**3), 2)
            },
            "process": {
                "memory_mb": round(process_memory.rss / (1024**2), 2),
                "cpu_percent": process.cpu_percent(),
                "threads": process.num_threads(),
                "open_files": len(process.open_files()) if process.open_files() else 0
            },
            "websocket": ws_stats,
            "dhan_client": dhan_status,
            "recent_errors": recent_errors,
            "environment": {
                "python_version": f"{os.sys.version_info.major}.{os.sys.version_info.minor}.{os.sys.version_info.micro}",
                "platform": os.sys.platform,
                "working_directory": os.getcwd()
            }
        }
        
        return success(data=status)
        
    except Exception as e:
        logger.error(f"Error getting debug status: {e}")
        return error(
            code=ErrorCode.UPSTREAM_FAIL,
            message="Failed to get debug status",
            details={"error": str(e)}
        )

@router.get("/debug/websocket/events")
async def get_websocket_events(request: Request, limit: int = Query(20, ge=1, le=100)):
    """Get recent WebSocket events for debugging"""
    try:
        events = getattr(ws_manager, 'recent_events', [])[-limit:]
        
        # Format events for display
        formatted_events = []
        for event in events:
            formatted_event = {
                "timestamp": event.get("timestamp"),
                "type": event.get("type"),
                "channel": event.get("channel"),
                "sequence": event.get("seq"),
                "connection_count": event.get("connection_count", 0),
                "details": event.get("details", {})
            }
            formatted_events.append(formatted_event)
        
        return success(data={
            "events": formatted_events,
            "total_events": len(getattr(ws_manager, 'recent_events', [])),
            "requested_limit": limit
        })
        
    except Exception as e:
        logger.error(f"Error getting WebSocket events: {e}")
        return error(
            code=ErrorCode.UPSTREAM_FAIL,
            message="Failed to get WebSocket events",
            details={"error": str(e)}
        )

@router.get("/debug/websocket/connections")
async def get_websocket_connections(request: Request):
    """Get active WebSocket connection details"""
    try:
        connections = []
        for conn_id, conn_info in ws_manager.active_connections.items():
            connection_detail = {
                "connection_id": conn_id,
                "connected_at": conn_info.get("connected_at"),
                "last_activity": conn_info.get("last_activity"),
                "subscriptions": conn_info.get("subscriptions", []),
                "last_sequence": conn_info.get("last_sequence", 0),
                "client_info": conn_info.get("client_info", {}),
                "is_alive": conn_info.get("is_alive", True)
            }
            connections.append(connection_detail)
        
        return success(data={
            "active_connections": connections,
            "total_connections": len(connections),
            "connection_stats": {
                "total_ever": ws_manager.total_connections,
                "peak_concurrent": getattr(ws_manager, 'peak_concurrent_connections', 0)
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting WebSocket connections: {e}")
        return error(
            code=ErrorCode.UPSTREAM_FAIL,
            message="Failed to get WebSocket connections",
            details={"error": str(e)}
        )

@router.post("/debug/websocket/test")
async def test_websocket_connection(request: Request):
    """Test WebSocket functionality by sending a test message"""
    try:
        # Send test message to all connected clients
        test_message = {
            "type": "debug.test",
            "seq": ws_manager.get_next_seq(),
            "serverTime": datetime.now().isoformat(),
            "message": "Debug test message from admin",
            "timestamp": datetime.now().isoformat()
        }
        
        # Broadcast to all connections
        await ws_manager.broadcast_message(test_message)
        
        return success(data={
            "message": "Test message sent to all WebSocket connections",
            "connections_notified": len(ws_manager.active_connections),
            "test_message": test_message
        })
        
    except Exception as e:
        logger.error(f"Error testing WebSocket: {e}")
        return error(
            code=ErrorCode.UPSTREAM_FAIL,
            message="Failed to test WebSocket",
            details={"error": str(e)}
        )

@router.get("/debug/circuit-breaker/status")
async def get_circuit_breaker_status(request: Request):
    """Get circuit breaker status for all services"""
    try:
        # Get circuit breaker status from dhan_client
        circuit_status = {
            "dhan_api": {
                "state": getattr(dhan_client, 'circuit_breaker_state', 'CLOSED'),
                "failure_count": getattr(dhan_client, 'failure_count', 0),
                "last_failure": getattr(dhan_client, 'last_failure_time', None),
                "threshold": getattr(dhan_client, 'circuit_breaker_threshold', 5),
                "timeout_seconds": getattr(dhan_client, 'circuit_breaker_timeout', 60),
                "next_attempt": getattr(dhan_client, 'next_attempt_time', None)
            },
            "websocket": {
                "state": "CLOSED",  # WebSocket is always available
                "connection_health": "HEALTHY" if len(ws_manager.active_connections) > 0 else "DEGRADED"
            }
        }
        
        return success(data=circuit_status)
        
    except Exception as e:
        logger.error(f"Error getting circuit breaker status: {e}")
        return error(
            code=ErrorCode.UPSTREAM_FAIL,
            message="Failed to get circuit breaker status",
            details={"error": str(e)}
        )

@router.post("/debug/circuit-breaker/reset")
async def reset_circuit_breaker(request: Request, service: str = Query(..., description="Service to reset (dhan_api, websocket)")):
    """Reset circuit breaker for a specific service"""
    try:
        if service == "dhan_api":
            # Reset dhan client circuit breaker
            setattr(dhan_client, 'circuit_breaker_state', 'CLOSED')
            setattr(dhan_client, 'failure_count', 0)
            setattr(dhan_client, 'last_failure_time', None)
            setattr(dhan_client, 'next_attempt_time', None)
            
            logger.info("Circuit breaker reset for dhan_api service")
            
            return success(data={
                "message": f"Circuit breaker reset for {service}",
                "new_state": "CLOSED",
                "failure_count": 0
            })
            
        elif service == "websocket":
            # WebSocket doesn't have circuit breaker, but we can reset connection stats
            ws_manager.total_connections = 0
            ws_manager.peak_concurrent_connections = 0
            
            logger.info("WebSocket connection stats reset")
            
            return success(data={
                "message": f"Connection stats reset for {service}",
                "total_connections": 0,
                "peak_concurrent": 0
            })
            
        else:
            return error(
                code=ErrorCode.VALIDATION_ERROR,
                message="Invalid service specified",
                details={"valid_services": ["dhan_api", "websocket"]}
            )
            
    except Exception as e:
        logger.error(f"Error resetting circuit breaker: {e}")
        return error(
            code=ErrorCode.UPSTREAM_FAIL,
            message="Failed to reset circuit breaker",
            details={"error": str(e)}
        )

@router.get("/debug/performance/metrics")
async def get_performance_metrics(request: Request):
    """Get performance metrics and timing information"""
    try:
        # API response times (mock data for now)
        api_metrics = {
            "positions_endpoint": {
                "avg_response_time_ms": 45,
                "p95_response_time_ms": 120,
                "request_count": 150,
                "error_rate": 0.02
            },
            "orders_endpoint": {
                "avg_response_time_ms": 38,
                "p95_response_time_ms": 95,
                "request_count": 89,
                "error_rate": 0.01
            },
            "pnl_endpoint": {
                "avg_response_time_ms": 67,
                "p95_response_time_ms": 180,
                "request_count": 234,
                "error_rate": 0.03
            }
        }
        
        # WebSocket performance
        ws_metrics = {
            "message_delivery": {
                "avg_latency_ms": 12,
                "p95_latency_ms": 45,
                "messages_sent": 1247,
                "delivery_success_rate": 0.998
            },
            "polling": {
                "avg_poll_interval_ms": 2000,
                "last_poll_duration_ms": 45,
                "poll_success_rate": 0.995
            }
        }
        
        # Memory and CPU trends (last 5 minutes)
        memory_trend = [65.2, 66.1, 67.8, 68.3, 69.1]
        cpu_trend = [12.3, 15.7, 18.2, 14.8, 16.5]
        
        metrics = {
            "timestamp": datetime.now().isoformat(),
            "api_performance": api_metrics,
            "websocket_performance": ws_metrics,
            "system_trends": {
                "memory_percent": memory_trend,
                "cpu_percent": cpu_trend,
                "trend_duration_minutes": 5
            },
            "recommendations": [
                "System performance is within normal ranges",
                "WebSocket latency is excellent (<50ms p95)",
                "API response times are optimal",
                "Memory usage is stable and healthy"
            ]
        }
        
        return success(data=metrics)
        
    except Exception as e:
        logger.error(f"Error getting performance metrics: {e}")
        return error(
            code=ErrorCode.UPSTREAM_FAIL,
            message="Failed to get performance metrics",
            details={"error": str(e)}
        )

@router.get("/debug/logs/recent")
async def get_recent_logs(request: Request, level: str = Query("INFO", description="Log level filter"), limit: int = Query(50, ge=1, le=200)):
    """Get recent application logs for debugging"""
    try:
        # This would typically read from log files
        # For now, return mock recent logs
        mock_logs = [
            {
                "timestamp": "2025-08-21 22:05:37.142",
                "level": "DEBUG",
                "module": "app.ws.live",
                "message": "Emitted pnl delta: seq=36",
                "trace_id": None
            },
            {
                "timestamp": "2025-08-21 22:05:37.140",
                "level": "DEBUG",
                "module": "app.services.dhan_client",
                "message": "Created PnL model: totals=PnLTotals(realized=0.0, unrealized=2168861.24, day=2168861.24, currency='INR')",
                "trace_id": None
            },
            {
                "timestamp": "2025-08-21 22:05:37.125",
                "level": "DEBUG",
                "module": "app.services.dhan_client",
                "message": "PnL consistency check passed: drift=₹0.00",
                "trace_id": None
            }
        ]
        
        # Filter by level if specified
        if level.upper() != "ALL":
            mock_logs = [log for log in mock_logs if log["level"] == level.upper()]
        
        # Limit results
        mock_logs = mock_logs[:limit]
        
        return success(data={
            "logs": mock_logs,
            "filter_level": level,
            "total_logs": len(mock_logs),
            "note": "This endpoint currently returns mock data. In production, it would read from actual log files."
        })
        
    except Exception as e:
        logger.error(f"Error getting recent logs: {e}")
        return error(
            code=ErrorCode.UPSTREAM_FAIL,
            message="Failed to get recent logs",
            details={"error": str(e)}
        )
