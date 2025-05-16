#!/bin/bash

# Lấy địa chỉ IP của máy
IP_ADDRESS=$(hostname -I | awk '{print $1}')

echo "================================================="
echo "    INSTALLING NMT RELEASE MANAGEMENT SERVICES"
echo "            (PRODUCTION VERSION)"
echo "================================================="
echo

# Đầu tiên build frontend cho production
echo "Building frontend for production..."
./build-frontend.sh

# Copy services vào thư mục systemd
echo "Copying service files to /etc/systemd/system/"
sudo cp nmt-backend.service /etc/systemd/system/
sudo cp nmt-frontend-prod.service /etc/systemd/system/nmt-frontend.service

# Cài đặt serve nếu chưa có
echo "Installing 'serve' package for serving static files..."
sudo npm install -g serve

# Reload systemd daemon
echo "Reloading systemd daemon"
sudo systemctl daemon-reload

# Enable và start các services
echo "Enabling and starting services"
sudo systemctl enable nmt-backend.service
sudo systemctl start nmt-backend.service
sudo systemctl enable nmt-frontend.service
sudo systemctl start nmt-frontend.service

echo "================================================="
echo "NMT production services installed successfully!"
echo "Frontend available at: http://$IP_ADDRESS:3000"
echo "Backend API available at: http://$IP_ADDRESS:8000"
echo "API Docs available at: http://$IP_ADDRESS:8000/docs"
echo "================================================="
echo
echo "To check service status:"
echo "  sudo systemctl status nmt-backend.service"
echo "  sudo systemctl status nmt-frontend.service"
echo
echo "To view logs:"
echo "  sudo journalctl -u nmt-backend.service -f"
echo "  sudo journalctl -u nmt-frontend.service -f" 