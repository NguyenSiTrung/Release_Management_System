#!/bin/bash

# Lấy địa chỉ IP của máy
IP_ADDRESS=$(hostname -I | awk '{print $1}')

echo "================================================="
echo "    NMT RELEASE MANAGEMENT DEVELOPMENT SERVER"
echo "================================================="
echo
echo "IP máy chủ: $IP_ADDRESS"
echo

# Khởi động backend
echo "Đang khởi động backend..."
cd backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --reload --port 8000 &
BACKEND_PID=$!
cd ..
echo "Backend đã khởi động ở http://$IP_ADDRESS:8000"
echo

# Khởi động frontend 
echo "Đang khởi động frontend..."
cd frontend
HOST=0.0.0.0 REACT_APP_API_URL="http://$IP_ADDRESS:8000/api/v1" npm start &
FRONTEND_PID=$!
cd ..
echo "Frontend đã khởi động ở http://$IP_ADDRESS:3000"
echo

echo "================================================="
echo "CÁC ĐƯỜNG DẪN TRUY CẬP:"
echo "- Frontend: http://$IP_ADDRESS:3000"
echo "- Backend API: http://$IP_ADDRESS:8000"
echo "- API Docs: http://$IP_ADDRESS:8000/docs"
echo "================================================="
echo
echo "Nhấn CTRL+C để dừng tất cả dịch vụ"

# Xử lý tín hiệu SIGINT (CTRL+C)
trap 'kill $BACKEND_PID $FRONTEND_PID; echo "Đang dừng dịch vụ..."; exit' INT

# Chờ người dùng dừng
wait 