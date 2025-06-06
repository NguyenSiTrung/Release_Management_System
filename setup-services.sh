#!/bin/bash

# Kiểm tra quyền root
if [[ $EUID -ne 0 ]]; then
   echo "Script này cần được chạy với quyền root (sudo)" 
   exit 1
fi

# Đường dẫn tuyệt đối đến thư mục dự án
PROJECT_DIR="/home/trung/Documents/ML/Translation"
cd "$PROJECT_DIR"

# Lấy địa chỉ IP
IP_ADDRESS=$(hostname -I | awk '{print $1}')
echo "Cài đặt dịch vụ với IP: $IP_ADDRESS"

# 1. Backend Service
echo "[+] Tạo service cho backend..."
cat > /etc/systemd/system/nmt-backend.service << EOF
[Unit]
Description=NMT Release Management Backend API
After=network.target

[Service]
User=trung
WorkingDirectory=$PROJECT_DIR/backend
ExecStart=$PROJECT_DIR/backend/venv/bin/python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5
Environment="PYTHONPATH=$PROJECT_DIR/backend"
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# 2. Frontend Service (dev mode)
echo "[+] Tạo service cho frontend (development)..."
cat > /etc/systemd/system/nmt-frontend-dev.service << EOF
[Unit]
Description=NMT Release Management Frontend (Development)
After=network.target

[Service]
User=trung
WorkingDirectory=$PROJECT_DIR/frontend
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
Environment="HOST=0.0.0.0"
Environment="REACT_APP_API_URL=http://$IP_ADDRESS:8000/api/v1"
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# 3. Frontend Service (production mode)
echo "[+] Cài đặt 'serve' để phục vụ frontend..."
npm install -g serve

echo "[+] Tạo service cho frontend (production)..."
cat > /etc/systemd/system/nmt-frontend-prod.service << EOF
[Unit]
Description=NMT Release Management Frontend (Production)
After=network.target

[Service]
User=trung
WorkingDirectory=$PROJECT_DIR/frontend
ExecStart=/usr/bin/npx serve -s build -l 3000
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd để nhận cấu hình mới
echo "[+] Cập nhật systemd..."
systemctl daemon-reload

# Hướng dẫn người dùng
echo
echo "Các service đã được cài đặt thành công!"
echo "------------------------------------------"
echo "Để khởi động backend:"
echo "  sudo systemctl start nmt-backend"
echo
echo "Để khởi động frontend (development):"
echo "  sudo systemctl start nmt-frontend-dev"
echo 
echo "Để khởi động frontend (production):"
echo "  # Trước tiên, xây dựng frontend:"
echo "  cd $PROJECT_DIR/frontend && REACT_APP_API_URL=\"http://$IP_ADDRESS:8000/api/v1\" npm run build"
echo "  # Sau đó khởi động service:"
echo "  sudo systemctl start nmt-frontend-prod"
echo
echo "Backend API:   http://$IP_ADDRESS:8000"
echo "Frontend:      http://$IP_ADDRESS:3000"
echo "------------------------------------------" 