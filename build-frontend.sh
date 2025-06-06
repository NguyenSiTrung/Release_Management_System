#!/bin/bash

# Lấy địa chỉ IP của máy
IP_ADDRESS=$(hostname -I | awk '{print $1}')

echo "================================================="
echo "    BUILDING NMT FRONTEND FOR PRODUCTION"
echo "================================================="
echo

cd frontend

echo "Installing dependencies..."
npm install

echo "Building production version..."
REACT_APP_API_URL="http://$IP_ADDRESS:8000/api/v1" npm run build

echo "================================================="
echo "Build completed successfully!"
echo "=================================================" 