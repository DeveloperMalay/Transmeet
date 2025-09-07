#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Transmeet Services...${NC}"
echo "================================"

# Function to check if port is in use
check_port() {
    lsof -i :$1 > /dev/null 2>&1
    return $?
}

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down services...${NC}"
    kill $FRONTEND_PID $BACKEND_PID 2>/dev/null
    wait $FRONTEND_PID $BACKEND_PID 2>/dev/null
    echo -e "${GREEN}Services stopped.${NC}"
    exit 0
}

# Trap ctrl-c and call cleanup
trap cleanup INT

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo -e "${RED}Error: Bun is not installed. Please install Bun first.${NC}"
    exit 1
fi

# Check and clean ports if needed
if check_port 3000; then
    echo -e "${YELLOW}Port 3000 is in use. Attempting to free it...${NC}"
    lsof -ti:3000 | xargs kill -9 2>/dev/null
    sleep 1
fi

if check_port 4000; then
    echo -e "${YELLOW}Port 4000 is in use. Attempting to free it...${NC}"
    lsof -ti:4000 | xargs kill -9 2>/dev/null
    sleep 1
fi

# Start Backend first (Frontend depends on it)
echo -e "${GREEN}Starting Backend on port 4000...${NC}"
cd backend
PORT=4000 bun run dev &
BACKEND_PID=$!
cd ..

# Give backend a moment to start
sleep 3

# Start Frontend
echo -e "${GREEN}Starting Frontend on port 3000...${NC}"
cd frontend
PORT=3000 bun run dev &
FRONTEND_PID=$!
cd ..

# Give frontend a moment to start
sleep 2

echo "================================"
echo -e "${GREEN}Services are running:${NC}"
echo -e "  Frontend: ${YELLOW}http://localhost:3000${NC}"
echo -e "  Backend:  ${YELLOW}http://localhost:4000${NC}"
echo -e "  Health:   ${YELLOW}http://localhost:4000/health${NC}"
echo "================================"
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"

# Wait for both processes
wait $FRONTEND_PID $BACKEND_PID