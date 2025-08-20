from fastapi import APIRouter, Request
from app.utils.response import success
from app.utils.logger import logger

router = APIRouter()

@router.get("/logs")
def get_logs(request: Request):
    logger.info("Logs requested")
    return success({"logs": ["dummy log entry"]}, trace_id=request.state.trace_id)
