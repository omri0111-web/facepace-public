#!/bin/bash
# 🔄 Easy Backend Restart Script
# Just run: ./restart.sh

echo "🔄 Restarting FacePace Backend..."
echo ""

# Stop first
./stop.sh

# Wait a moment
sleep 2

# Start again
./start.sh

