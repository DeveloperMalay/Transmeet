#!/bin/bash

# Start script for Transmeet application

echo "🚀 Starting Transmeet Application..."
echo ""

# Function to kill processes on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

# Set up trap to call cleanup on script exit
trap cleanup EXIT INT TERM

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Please install Bun first:"
    echo "   curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready -q; then
    echo "⚠️  PostgreSQL is not running. Please start PostgreSQL first."
    echo "   On macOS: brew services start postgresql"
    echo "   On Ubuntu: sudo systemctl start postgresql"
    exit 1
fi

# Start backend server
echo "📦 Starting Backend Server (Port 4000)..."
cd backend
bun run dev &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start frontend server
echo "🎨 Starting Frontend Server (Port 3000)..."
cd frontend
bun run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Transmeet is running!"
echo ""
echo "📍 Frontend: http://localhost:3000"
echo "📍 Backend:  http://localhost:4000"
echo "📍 Database: http://localhost:4000/health (health check)"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Wait for processes
wait