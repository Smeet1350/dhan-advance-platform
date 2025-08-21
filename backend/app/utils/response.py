import uuid
from fastapi import Request
from app.models.schemas import ErrorCode

def success(data, trace_id=None):
    return {"ok": True, "data": data, "trace_id": trace_id or str(uuid.uuid4())}

def error(code: ErrorCode, message: str, details=None, trace_id=None):
    return {
        "ok": False, 
        "error": {
            "code": code, 
            "message": message, 
            "details": details
        }, 
        "trace_id": trace_id or str(uuid.uuid4())
    }

def get_trace_id(request: Request):
    """Get trace_id from request state if available"""
    return getattr(request.state, 'trace_id', None)

# Convenience functions for common error types
def unauthorized_error(message: str = "Unauthorized access", details=None, trace_id=None):
    return error(ErrorCode.DHAN_UNAUTHORIZED, message, details, trace_id)

def timeout_error(message: str = "Request timeout", details=None, trace_id=None):
    return error(ErrorCode.DHAN_TIMEOUT, message, details, trace_id)

def rate_limit_error(message: str = "Rate limit exceeded", details=None, trace_id=None):
    return error(ErrorCode.DHAN_RATE_LIMIT, message, details, trace_id)

def upstream_error(message: str = "Upstream service error", details=None, trace_id=None):
    return error(ErrorCode.UPSTREAM_FAIL, message, details, trace_id)

def validation_error(message: str = "Validation error", details=None, trace_id=None):
    return error(ErrorCode.VALIDATION_ERROR, message, details, trace_id)

def position_not_open_error(message: str = "Position not open", details=None, trace_id=None):
    return error(ErrorCode.POSITION_NOT_OPEN, message, details, trace_id)

def order_rejected_error(message: str = "Order rejected", details=None, trace_id=None):
    return error(ErrorCode.ORDER_REJECTED, message, details, trace_id)

def zero_qty_error(message: str = "Zero quantity", details=None, trace_id=None):
    return error(ErrorCode.ZERO_QTY, message, details, trace_id)

def ltp_stale_error(message: str = "Last traded price is stale", details=None, trace_id=None):
    return error(ErrorCode.LTP_STALE, message, details, trace_id)
