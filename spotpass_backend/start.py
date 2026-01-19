#!/usr/bin/env python3
"""
Simple script to start the SpotPass Backend application.
This script sets up the correct Python path before starting uvicorn.
"""

import os
import sys

# Add parent directory to Python path so spotpass_backend can be imported
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, parent_dir)

if __name__ == "__main__":
    import uvicorn

    from main import app

    uvicorn.run(app, host="0.0.0.0", port=5001, reload=True)
