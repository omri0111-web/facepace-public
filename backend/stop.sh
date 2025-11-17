#!/bin/bash
# 🛑 Easy Backend Stopper Script
# Just run: ./stop.sh

echo "🛑 Stopping FacePace Backend..."

# Kill backend on port 8000
kill -9 $(lsof -ti:8000) 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Backend stopped successfully!"
else
    echo "ℹ️  No backend was running."
fi

