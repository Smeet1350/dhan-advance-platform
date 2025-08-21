from fastapi import APIRouter, Request, HTTPException, Query
from typing import List, Optional
from app.services.dhan_client import dhan_client
from app.utils.response import (
    success, error, validation_error, upstream_error,
    unauthorized_error, timeout_error, rate_limit_error
)
from app.models.schemas import ErrorCode
from app.utils.logger import logger

router = APIRouter()

@router.post("/squareoff/{position_id}")
async def squareoff_position(
    position_id: str,
    request: Request,
    quantity: Optional[int] = Query(None, description="Quantity to square off (default: full position)")
):
    """Square off a specific position"""
    try:
        logger.info(f"Square-off request for position {position_id}, quantity: {quantity}")
        
        # Validate position exists
        positions = dhan_client.fetch_positions()
        position = next((p for p in positions if p.id == position_id), None)
        
        if not position:
            return validation_error(
                "Position not found", 
                {"position_id": position_id}, 
                request.state.trace_id
            )
        
        # Validate quantity
        if quantity and quantity > position.qty:
            return validation_error(
                "Invalid quantity", 
                {"requested": quantity, "available": position.qty}, 
                request.state.trace_id
            )
        
        # Execute square-off
        result = await dhan_client.squareoff_position_async(position_id, quantity or position.qty)
        
        if result:
            logger.info(f"Successfully squared off position {position_id}")
            return success({
                "message": "Position squared off successfully",
                "position_id": position_id,
                "quantity": quantity or position.qty,
                "order_id": result.get("order_id"),
                "status": "executed"
            }, request.state.trace_id)
        else:
            return upstream_error(
                "Failed to square off position", 
                {"position_id": position_id}, 
                request.state.trace_id
            )
            
    except Exception as e:
        logger.error(f"Error squaring off position {position_id}: {e}")
        return upstream_error(
            "Failed to square off position", 
            {"error": str(e)}, 
            request.state.trace_id
        )

@router.post("/squareoff/bulk")
async def squareoff_all_positions(
    request: Request,
    confirm: bool = Query(..., description="Confirmation required for bulk square-off")
):
    """Square off all open positions (requires confirmation)"""
    try:
        if not confirm:
            return validation_error(
                "Confirmation required for bulk square-off", 
                {"confirm": "Must be true to proceed"}, 
                request.state.trace_id
            )
        
        logger.info("Bulk square-off request initiated")
        
        # Get all positions
        positions = dhan_client.fetch_positions()
        if not positions:
            return success({
                "message": "No open positions to square off",
                "positions_closed": 0
            }, request.state.trace_id)
        
        # Execute bulk square-off
        results = []
        for position in positions:
            try:
                result = await dhan_client.squareoff_position_async(position.id, position.qty)
                if result:
                    results.append({
                        "position_id": position.id,
                        "symbol": position.symbol,
                        "quantity": position.qty,
                        "status": "executed",
                        "order_id": result.get("order_id")
                    })
                else:
                    results.append({
                        "position_id": position.id,
                        "symbol": position.symbol,
                        "quantity": position.qty,
                        "status": "failed"
                    })
            except Exception as e:
                logger.error(f"Error squaring off position {position.id}: {e}")
                results.append({
                    "position_id": position.id,
                    "symbol": position.symbol,
                    "quantity": position.qty,
                    "status": "error",
                    "error": str(e)
                })
        
        successful = len([r for r in results if r["status"] == "executed"])
        total = len(results)
        
        logger.info(f"Bulk square-off completed: {successful}/{total} successful")
        
        return success({
            "message": f"Bulk square-off completed: {successful}/{total} positions closed",
            "total_positions": total,
            "successful": successful,
            "failed": total - successful,
            "results": results
        }, request.state.trace_id)
        
    except Exception as e:
        logger.error(f"Error in bulk square-off: {e}")
        return upstream_error(
            "Failed to execute bulk square-off", 
            {"error": str(e)}, 
            request.state.trace_id
        )

@router.post("/orders/place")
async def place_order(
    request: Request,
    order_data: dict
):
    """Place a new order"""
    try:
        logger.info(f"Order placement request: {order_data}")
        
        # Validate required fields
        required_fields = ["symbol", "side", "type", "quantity"]
        for field in required_fields:
            if field not in order_data:
                return validation_error(
                    f"Missing required field: {field}", 
                    {"missing_field": field}, 
                    request.state.trace_id
                )
        
        # Execute order placement
        result = await dhan_client.place_order_async(order_data)
        
        if result:
            logger.info(f"Order placed successfully: {result.get('order_id')}")
            return success({
                "message": "Order placed successfully",
                "order_id": result.get("order_id"),
                "status": "placed",
                "order_details": result
            }, request.state.trace_id)
        else:
            return upstream_error(
                "Failed to place order", 
                {"order_data": order_data}, 
                request.state.trace_id
            )
            
    except Exception as e:
        logger.error(f"Error placing order: {e}")
        return upstream_error(
            "Failed to place order", 
            {"error": str(e)}, 
            request.state.trace_id
        )

@router.put("/orders/{order_id}/modify")
async def modify_order(
    order_id: str,
    request: Request,
    modify_data: dict
):
    """Modify an existing order"""
    try:
        logger.info(f"Order modification request for {order_id}: {modify_data}")
        
        # Execute order modification
        result = await dhan_client.modify_order_async(order_id, modify_data)
        
        if result:
            logger.info(f"Order {order_id} modified successfully")
            return success({
                "message": "Order modified successfully",
                "order_id": order_id,
                "status": "modified",
                "modifications": modify_data
            }, request.state.trace_id)
        else:
            return upstream_error(
                "Failed to modify order", 
                {"order_id": order_id}, 
                request.state.trace_id
            )
            
    except Exception as e:
        logger.error(f"Error modifying order {order_id}: {e}")
        return upstream_error(
            "Failed to modify order", 
            {"error": str(e)}, 
            request.state.trace_id
        )

@router.delete("/orders/{order_id}")
async def cancel_order(
    order_id: str,
    request: Request,
    confirm: bool = Query(..., description="Confirmation required to cancel order")
):
    """Cancel an existing order"""
    try:
        if not confirm:
            return validation_error(
                "Confirmation required to cancel order", 
                {"confirm": "Must be true to proceed"}, 
                request.state.trace_id
            )
        
        logger.info(f"Order cancellation request for {order_id}")
        
        # Execute order cancellation
        result = await dhan_client.cancel_order_async(order_id)
        
        if result:
            logger.info(f"Order {order_id} cancelled successfully")
            return success({
                "message": "Order cancelled successfully",
                "order_id": order_id,
                "status": "cancelled"
            }, request.state.trace_id)
        else:
            return upstream_error(
                "Failed to cancel order", 
                {"order_id": order_id}, 
                request.state.trace_id
            )
            
    except Exception as e:
        logger.error(f"Error cancelling order {order_id}: {e}")
        return upstream_error(
            "Failed to cancel order", 
            {"error": str(e)}, 
            request.state.trace_id
        )

@router.get("/positions/{position_id}/risk")
async def get_position_risk(
    position_id: str,
    request: Request
):
    """Get risk metrics for a specific position"""
    try:
        logger.info(f"Risk analysis request for position {position_id}")
        
        # Get position details
        positions = dhan_client.fetch_positions()
        position = next((p for p in positions if p.id == position_id), None)
        
        if not position:
            return validation_error(
                "Position not found", 
                {"position_id": position_id}, 
                request.state.trace_id
            )
        
        # Calculate risk metrics
        risk_metrics = {
            "position_id": position_id,
            "symbol": position.symbol,
            "current_value": position.qty * position.ltp,
            "unrealized_pnl": position.unrealized or 0,
            "pnl_percentage": ((position.unrealized or 0) / (position.qty * position.avg_price)) * 100 if position.qty * position.avg_price > 0 else 0,
            "risk_level": "LOW" if abs(position.unrealized or 0) < 1000 else "MEDIUM" if abs(position.unrealized or 0) < 5000 else "HIGH",
            "stop_loss_suggestion": position.avg_price * 0.95 if position.side == "LONG" else position.avg_price * 1.05,
            "take_profit_suggestion": position.avg_price * 1.10 if position.side == "LONG" else position.avg_price * 0.90
        }
        
        return success(risk_metrics, request.state.trace_id)
        
    except Exception as e:
        logger.error(f"Error calculating risk for position {position_id}: {e}")
        return upstream_error(
            "Failed to calculate position risk", 
            {"error": str(e)}, 
            request.state.trace_id
        )
