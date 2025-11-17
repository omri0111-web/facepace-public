#!/bin/bash
# 🚀 Easy Backend Starter Script
# Just run: ./start.sh

echo "🔧 Starting FacePace Backend..."
echo ""

# Kill any old backend on port 8000
echo "🧹 Cleaning up old processes..."
kill -9 $(lsof -ti:8000) 2>/dev/null
sleep 1

# Go to the backend directory
cd "$(dirname "$0")"

# Activate virtual environment
echo "⚙️  Activating Python environment..."
source venv/bin/activate

# Check if Supabase packages are installed
echo "📦 Checking dependencies..."
python -c "import supabase" 2>/dev/null || {
    echo "📥 Installing/updating packages..."
    pip install --upgrade supabase==2.24.0 websockets==15.0.1 -q
}

# Start the backend
echo ""
echo "✅ Starting backend server..."
echo "📍 Backend will run on: http://127.0.0.1:8000"
echo "🛑 Press CTRL+C to stop the server"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

python main.py

