from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import uuid
from app.utils.logger import logger
from app.routes.logging import router as logging_router
from app.routes import data
from app.routes import actions
from app.ws import live
from app.settings import settings

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(logging_router, prefix="/api/v1")
app.include_router(data.router)  # No prefix - endpoints at root level
app.include_router(actions.router)  # Trading actions (square-off, etc.)
app.include_router(live.router)  # WebSocket for real-time updates

@app.on_event("startup")
async def startup_event():
    logger.info("Dhan Automation Backend Application started successfully")
    logger.info(f"Using {'MOCK' if settings.USE_MOCK_DATA else 'REAL'} data mode")

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
