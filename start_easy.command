#!/bin/bash

cd /Users/sp/Desktop/SAU_Transport

echo "🔧 Setting up real-time features..."

# Install axios if needed
cd backend
npm install axios

# Stop servers
echo "🛑 Stopping servers..."
pkill -f "node.*server.js"
pkill -f "http-server"
sleep 2

# Start servers
echo "🚀 Starting servers..."
npm run dev &

cd ../frontend
npx http-server -p 8000 -c-1 &

echo "✅ Real-time setup complete!"
echo "🌐 Open: http://localhost:8000"
echo "📡 Real-time features are now enabled!"