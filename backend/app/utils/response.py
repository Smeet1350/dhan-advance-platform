import uuid
from fastapi import Request

def success(data, trace_id=None):
    return {"ok": True, "data": data, "trace_id": trace_id or str(uuid.uuid4())}

def error(code, message, details=None, trace_id=None):
    return {"ok": False, "error": {"code": code, "message": message, "details": details}, "trace_id": trace_id or str(uuid.uuid4())}
