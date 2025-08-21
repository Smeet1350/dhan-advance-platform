#!/usr/bin/env python3
"""
Simple script to start the FastAPI server
"""
import uvicorn
import sys
import traceback
from app.main import app

if __name__ == "__main__":
    try:
        print("Starting Dhan Automation Backend Server...")
        print(f"Server will be available at: http://127.0.0.1:8001")
        print(f"Health check: http://127.0.0.1:8001/healthz")
        print(f"API docs: http://127.0.0.1:8001/docs")
        print("Press Ctrl+C to stop the server")
        
        uvicorn.run(
            app,
            host="127.0.0.1",  # Use localhost only
            port=8001,
            log_level="info",
            reload=False,
            access_log=True
        )
    except Exception as e:
        print(f"Error starting server: {e}")
        traceback.print_exc()
        sys.exit(1)
