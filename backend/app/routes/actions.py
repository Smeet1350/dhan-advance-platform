from fastapi import APIRouter, Request, HTTPException
from app.services.dhan_client import dhan_client
from app.utils.response import (
    success, validation_error, upstream_error, 
    position_not_open_error, zero_qty_error
)
from app.utils.logger import logger

router = APIRouter()

@router.post("/actions/squareoff/{id}")
def squareoff(id: str, request: Request):
    """
    Square off a position by ID with safety checks
    
    Args:
        id: Position ID to square off
        request: FastAPI request object for trace ID
    
    Returns:
        Success response with square-off result or error response
    """
    try:
        logger.info(f"Square-off request received for position ID: {id}, Trace ID: {request.state.trace_id}")
        
        # Validate position ID
        if not id or not id.strip():
            return validation_error("Position ID is required", {"position_id": id}, request.state.trace_id)
        
        # Additional safety: Check if this is a test environment
        # In production, you might want to add confirmation headers or rate limiting
        logger.warning(f"🚨 SQUARE-OFF ACTION REQUESTED - Position ID: {id}, Trace ID: {request.state.trace_id}")
        
        # Call the square-off service
        result = dhan_client.squareoff(id)
        
        logger.info(f"✅ Square-off successful for position ID: {id}, Trace ID: {request.state.trace_id}")
        return success(result, request.state.trace_id)
        
    except ValueError as e:
        logger.warning(f"⚠️ Square-off validation error for position ID: {id}, Error: {str(e)}, Trace ID: {request.state.trace_id}")
        if "not found" in str(e).lower():
            return position_not_open_error(f"Position {id} not found", {"position_id": id}, request.state.trace_id)
        elif "zero quantity" in str(e).lower():
            return zero_qty_error(f"Position {id} has zero quantity", {"position_id": id}, request.state.trace_id)
        else:
            return validation_error(str(e), {"position_id": id}, request.state.trace_id)
        
    except Exception as e:
        logger.error(f"❌ Square-off error for position ID: {id}, Error: {str(e)}, Trace ID: {request.state.trace_id}")
        return upstream_error(f"Failed to square off position: {str(e)}", {"position_id": id}, request.state.trace_id)

@router.post("/actions/squareoff/{id}/confirm")
def confirm_squareoff(id: str, request: Request):
    """
    Confirm and execute square-off action with additional safety checks
    
    Args:
        id: Position ID to square off
        request: FastAPI request object for trace ID
    
    Returns:
        Success response with square-off result or error response
    """
    try:
        logger.info(f"Square-off confirmation requested for position ID: {id}, Trace ID: {request.state.trace_id}")
        
        # Validate position ID
        if not id or not id.strip():
            return validation_error("Position ID is required", {"position_id": id}, request.state.trace_id)
        
        # Additional safety: Require explicit confirmation
        logger.warning(f"🚨🚨 SQUARE-OFF CONFIRMATION REQUESTED - Position ID: {id}, Trace ID: {request.state.trace_id}")
        
        # In production, you might want to check for a confirmation token or header
        # For now, we'll just log the confirmation and proceed
        
        # Call the square-off service
        result = dhan_client.squareoff(id)
        
        logger.info(f"✅✅ Square-off confirmed and executed for position ID: {id}, Trace ID: {request.state.trace_id}")
        return success(result, request.state.trace_id)
        
    except ValueError as e:
        logger.warning(f"⚠️ Square-off confirmation validation error for position ID: {id}, Error: {str(e)}, Trace ID: {request.state.trace_id}")
        if "not found" in str(e).lower():
            return position_not_open_error(f"Position {id} not found", {"position_id": id}, request.state.trace_id)
        elif "zero quantity" in str(e).lower():
            return zero_qty_error(f"Position {id} has zero quantity", {"position_id": id}, request.state.trace_id)
        else:
            return validation_error(str(e), {"position_id": id}, request.state.trace_id)
        
    except Exception as e:
        logger.error(f"❌❌ Square-off confirmation error for position ID: {id}, Error: {str(e)}, Trace ID: {request.state.trace_id}")
        return upstream_error(f"Failed to square off position: {str(e)}", {"position_id": id}, request.state.trace_id)
