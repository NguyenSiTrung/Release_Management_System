#!/bin/bash

# Print a line of dashes
function print_line() {
  printf '%*s\n' "${COLUMNS:-$(tput cols)}" '' | tr ' ' -
}

# Function to start backend
function start_backend() {
  print_line
  echo "Starting NMT Release Management Backend..."
  print_line
  
  cd backend
  
  # Check if virtual environment exists
  if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
  fi
  
  # Activate virtual environment
  source venv/bin/activate
  
  # Install requirements if needed
  if [ ! -f ".requirements_installed" ]; then
    echo "Installing dependencies..."
    pip install -r requirements.txt
    touch .requirements_installed
  fi
  
  # Start backend server
  echo "Starting FastAPI server..."
  uvicorn app.main:app --reload --host 0.0.0.0 --port 6868 &
  BACKEND_PID=$!
  cd ..
  
  echo "Backend started with PID: $BACKEND_PID"
  print_line
}

# Function to start frontend
function start_frontend() {
  print_line
  echo "Starting NMT Release Management Frontend..."
  print_line
  
  cd frontend
  
  # Install dependencies if needed
  if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
  fi
  
  # Start frontend server
  echo "Starting React development server..."
  npm start &
  FRONTEND_PID=$!
  cd ..
  
  echo "Frontend started with PID: $FRONTEND_PID"
  print_line
}

# Print welcome message
clear
echo "NMT Release Management System v1.0.0"
echo "by trungns_ares"
print_line

# Start services
start_backend
start_frontend

# Show success message
echo "Services started successfully!"
echo "- Backend: http://localhost:6868"
echo "- Frontend: http://localhost:3000"
echo "- API Docs: http://localhost:6868/docs"
print_line
echo "Press CTRL+C to stop all services"

# Trap SIGINT to handle CTRL+C
trap 'kill $BACKEND_PID $FRONTEND_PID; echo "Shutting down services..."; exit' INT

# Wait for user to press CTRL+C
wait 