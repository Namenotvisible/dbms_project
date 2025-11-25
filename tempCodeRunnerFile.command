#!/bin/bash

# Change to project directory
cd "$(dirname "$0")"

echo "🚀 SAU E-Rickshaw Transport System"
echo "=================================="
echo "🗺️  Now with Live Maps Integration!"
echo ""

# Kill any existing processes
echo "🛑 Stopping any existing servers..."
pkill -f "node.*server.js" 2>/dev/null
pkill -f "http-server" 2>/dev/null

# Wait a moment
sleep 2

# Start Backend
echo "🔧 Starting backend server..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait for backend
echo "⏳ Waiting for backend to start..."
sleep 5

# Start Frontend
echo "🌐 Starting frontend server..."
cd frontend
npx http-server -p 8000 -c-1 &
FRONTEND_PID=$!
cd ..

# Wait for servers to start
sleep 3

# Open browser automatically
echo "📖 Opening browser..."
open "http://localhost:8000"

echo ""
echo "✅ Application is running!"
echo "🌐 URL: http://localhost:8000"
echo "🗺️  Features: Live Campus Maps, Auto Tracking, Route Visualization"
echo ""
echo "🔑 Login Credentials:"
echo "   Admin:   admin@sau.ac.in / password"
echo "   Student: amit.sharma@sau.ac.in / password"
echo "   Driver:  rajesh.driver@sau.ac.in / password"
echo ""
echo "💡 Map Tip: Click on auto markers to see driver details!"
echo ""
echo "Press Ctrl+C to stop servers"

# Keep script running
wait