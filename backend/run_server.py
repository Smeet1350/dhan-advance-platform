#!/usr/bin/env python3
"""
Working server script for Dhan Automation Backend
"""
import asyncio
import uvicorn
import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def main():
    try:
        print("🚀 Starting Dhan Automation Backend Server...")
        print("📍 Server will be available at: http://localhost:8000")
        print("🔍 Health check: http://localhost:8000/healthz")
        print("📚 API docs: http://localhost:8000/docs")
        print("⏹️  Press Ctrl+C to stop the server")
        print()
        
        # Import and create the app
        from app.main import app
        print("✅ FastAPI app imported successfully")
        print(f"✅ App has {len(app.routes)} routes")
        
        # Start the server
        config = uvicorn.Config(
            app=app,
            host="0.0.0.0",
            port=8000,
            log_level="info",
            reload=False,
            access_log=True
        )
        
        server = uvicorn.Server(config)
        await server.serve()
        
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        sys.exit(1)
