#!/bin/bash
# Production initialization script for SpotPass

echo "🚀 Starting SpotPass production initialization..."

# For SQLite, we don't need to wait for a database server
echo "📦 Checking database..."
echo "Database should already be initialized from previous runs"

echo "🎉 SpotPass backend is ready!"
echo "🌐 API available at: http://localhost:5001"
echo "📚 API Documentation: http://localhost:5001/docs"

# Start the FastAPI server
echo "🚀 Starting FastAPI server..."
echo "PYTHONPATH: $PYTHONPATH"
echo "PWD: $(pwd)"
echo "WHOAMI: $(whoami)"
echo "Testing uvicorn import..."
/home/app/venv/bin/python -c "import uvicorn; print('uvicorn import OK')"
echo "Testing main import..."
/home/app/venv/bin/python -c "import main; print('main import OK')"
echo "Starting uvicorn..."
PYTHONPATH=/app /home/app/venv/bin/uvicorn main:app --host 0.0.0.0 --port 5001
