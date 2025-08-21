#!/usr/bin/env python3

try:
    print("Step 1: Importing uvicorn...")
    import uvicorn
    print("✓ Uvicorn imported successfully")
    
    print("Step 2: Importing app...")
    from app.main import app
    print("✓ App imported successfully")
    
    print("Step 3: Starting server...")
    uvicorn.run(app, host="127.0.0.1", port=8002, log_level="info")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
