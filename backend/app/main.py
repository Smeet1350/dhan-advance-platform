from fastapi import FastAPI, Request
import uuid
from app.utils.logger import logger
from app.routes.logging import router as logging_router

app = FastAPI()

# Include routers
app.include_router(logging_router, prefix="/api/v1")

@app.on_event("startup")
async def startup_event():
    logger.info("Dhan Automation Backend Application started successfully")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Dhan Automation Backend Application shutting down")

# Log application startup
logger.info("Starting Dhan Automation Backend Application")

@app.middleware("http")
async def add_trace_id(request: Request, call_next):
    request.state.trace_id = str(uuid.uuid4())
    logger.info(f"Request started - Method: {request.method}, Path: {request.url.path}, Trace ID: {request.state.trace_id}")
    
    response = await call_next(request)
    
    logger.info(f"Request completed - Method: {request.method}, Path: {request.url.path}, Status: {response.status_code}, Trace ID: {request.state.trace_id}")
    return response

@app.get("/healthz")
def healthz():
    logger.info("Health check endpoint called")
    return {"ok": True, "msg": "backend alive"}

@app.get("/test-trace")
def test_trace(request: Request):
    logger.info(f"Test trace endpoint called with trace ID: {request.state.trace_id}")
    return {"trace_id": request.state.trace_id}
