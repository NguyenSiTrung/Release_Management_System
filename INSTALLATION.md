# Installation Guide - NMT Release Management System v7.1

## 🎯 **Production-Ready Installation**

This comprehensive guide covers installation and deployment of the NMT Release Management System in both development and production environments.

**System Status**: ✅ Production Ready with 7 Complete Modules  
**Latest Version**: 7.1 - Enhanced SQE Results with Intelligent Analytics

## 📋 **Prerequisites**

### **System Requirements**
- **OS**: Linux (Ubuntu 20.04+, CentOS 8+) or macOS 10.15+
- **Python**: 3.10+ (3.11+ recommended for production)
- **Node.js**: 18.x LTS or higher
- **Memory**: Minimum 4GB RAM (8GB+ recommended for production)
- **Storage**: Minimum 10GB free space for models and logs
- **Network**: Internet access for dependency installation

### **Required Software**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y python3.10 python3.10-venv python3-pip nodejs npm git curl

# CentOS/RHEL
sudo dnf install -y python3 python3-pip nodejs npm git curl

# macOS (via Homebrew)
brew install python@3.10 node git
```

### **Optional Production Components**
- **Nginx**: Reverse proxy (recommended for production)
- **Supervisor/Systemd**: Process management (included in setup)
- **Docker**: For NMT evaluation engine (optional)

## 🚀 **Quick Installation (Recommended)**

### **1. Clone and Setup**
```bash
# Clone the repository
git clone <repository-url>
cd NMT_Managemnt_Experiments

# One-command setup (recommended)
chmod +x run.sh
./run.sh
```

**Access immediately:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### **2. Create First Admin User**
1. Navigate to http://localhost:3000
2. Click "Sign Up"
3. Fill in admin credentials:
   ```
   Username: admin
   Email: admin@example.com
   Password: [secure-password]
   Role: admin
   ```
4. First admin user is auto-approved

## 🛠 **Manual Installation (Development)**

### **Backend Setup**

#### **1. Python Environment Setup**
```bash
cd backend

# Create virtual environment
python3.10 -m venv venv

# Activate virtual environment
# Linux/macOS:
source venv/bin/activate
# Windows:
# venv\Scripts\activate

# Upgrade pip
pip install --upgrade pip
```

#### **2. Install Dependencies**
```bash
# Install production dependencies
pip install -r requirements.txt

# Verify installation
python -c "import fastapi, sqlalchemy, pydantic; print('Dependencies OK')"
```

#### **3. Environment Configuration**
```bash
# Create environment file
cp .env.example .env  # if exists, or create new

# Edit .env with your settings
nano .env
```

**Required Environment Variables:**
```env
# Database
DATABASE_URL=sqlite:///./nmt_release_management.db

# Security
SECRET_KEY=your-super-secret-key-here-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Storage
STORAGE_BASE_PATH=./storage
TESTSETS_STORAGE_PATH=./storage/testsets

# Evaluation (optional)
DOCKER_NMT_IMAGE=nmt-evaluation:latest
FAKE_EVALUATION_MODE=true

# Logging
LOG_LEVEL=INFO
```

#### **4. Database Initialization**
```bash
# Database will be created automatically on first run
# To manually initialize with sample data:
python -c "
from app.db.database import engine
from app.db import models
models.Base.metadata.create_all(bind=engine)
print('Database initialized')
"
```

#### **5. Start Backend Development Server**
```bash
# Development server with hot reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Verify backend is running
curl http://localhost:8000/api/v1/system/health
```

### **Frontend Setup**

#### **1. Install Dependencies**
```bash
cd frontend

# Install Node.js dependencies
npm install

# Verify installation
npm list react react-dom typescript
```

#### **2. Environment Configuration**
```bash
# Create environment file (if needed)
cp .env.example .env.local  # if exists

# Frontend typically uses default API URL
echo "REACT_APP_API_URL=http://localhost:8000/api/v1" > .env.local
```

#### **3. Start Frontend Development Server**
```bash
# Development server with hot reload
npm start

# Build for production
npm run build
```

## 🏭 **Production Deployment**

### **Automated Production Setup**
```bash
# Install production services (requires sudo)
sudo ./install-prod-services.sh

# Check service status
sudo systemctl status nmt-backend nmt-frontend-prod

# View logs
sudo journalctl -u nmt-backend -f
sudo journalctl -u nmt-frontend-prod -f
```

### **Manual Production Setup**

#### **1. Backend Production Configuration**

**Create production environment:**
```bash
# Production environment file
sudo nano /etc/nmt-backend/config.env
```

```env
# Production settings
DATABASE_URL=sqlite:///var/lib/nmt-backend/nmt_release_management.db
SECRET_KEY=CHANGE-THIS-TO-A-SECURE-RANDOM-KEY
ACCESS_TOKEN_EXPIRE_MINUTES=60
STORAGE_BASE_PATH=/var/lib/nmt-backend/storage
LOG_LEVEL=INFO
FAKE_EVALUATION_MODE=false
```

**Systemd service configuration:**
```bash
# Backend service
sudo cp nmt-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable nmt-backend
sudo systemctl start nmt-backend
```

#### **2. Frontend Production Build**
```bash
cd frontend

# Build production bundle
npm run build

# Serve with production server
sudo cp nmt-frontend-prod.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable nmt-frontend-prod
sudo systemctl start nmt-frontend-prod
```

#### **3. Nginx Configuration (Optional)**
```nginx
# /etc/nginx/sites-available/nmt-system
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API Documentation
    location /docs {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/nmt-system /etc/nginx/sites-enabled/
sudo systemctl reload nginx
```

## 🔧 **Advanced Configuration**

### **Database Migration (Future Updates)**
```bash
cd backend

# Install Alembic (if not already installed)
pip install alembic

# Initialize migration environment (first time only)
alembic init alembic

# Create migration
alembic revision --autogenerate -m "Description"

# Apply migration
alembic upgrade head
```

### **Storage Management**
```bash
# Create storage directories
mkdir -p storage/models storage/testsets storage/temp/evaluation_temp

# Set proper permissions (production)
sudo chown -R nmt-user:nmt-group /var/lib/nmt-backend/storage
sudo chmod -R 755 /var/lib/nmt-backend/storage
```

### **Logging Configuration**
```bash
# Development: logs in backend/logs/
ls -la backend/logs/

# Production: systemd logs
sudo journalctl -u nmt-backend --since today
sudo journalctl -u nmt-frontend-prod --since today

# Log rotation is automatic (daily rotation, 30-day retention)
```

## 🧪 **Verification & Testing**

### **1. Health Checks**
```bash
# Backend health
curl http://localhost:8000/api/v1/system/health

# Frontend access
curl http://localhost:3000

# Database verification
curl http://localhost:8000/api/v1/language-pairs
```

### **2. Feature Testing**
```bash
# Test authentication
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'

# Test file upload capability
ls -la storage/models storage/testsets

# Test background tasks
curl http://localhost:8000/api/v1/evaluations
```

### **3. Performance Verification**
```bash
# Check response times
time curl http://localhost:8000/api/v1/model-versions?page=1&size=10

# Monitor resource usage
htop
df -h
```

## 🚨 **Troubleshooting**

### **Common Issues**

#### **Backend Issues**
```bash
# Check backend logs
tail -f backend/logs/app_*.log

# Database permissions
ls -la nmt_release_management.db

# Port conflicts
lsof -i :8000
```

#### **Frontend Issues**
```bash
# Clear npm cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Check frontend build
npm run build
ls -la build/
```

#### **Production Service Issues**
```bash
# Service status
sudo systemctl status nmt-backend nmt-frontend-prod

# Restart services
sudo systemctl restart nmt-backend
sudo systemctl restart nmt-frontend-prod

# Check service logs
sudo journalctl -u nmt-backend --lines 50
sudo journalctl -u nmt-frontend-prod --lines 50
```

### **Database Recovery**
```bash
# Backup current database
cp nmt_release_management.db nmt_release_management.db.backup.$(date +%Y%m%d)

# Reset database (caution: data loss)
rm nmt_release_management.db
python -c "from app.db.database import engine; from app.db import models; models.Base.metadata.create_all(bind=engine)"
```

### **Performance Issues**
```bash
# Check disk space
df -h storage/

# Clean temporary files
find storage/temp/ -name "evaluation_*" -mtime +7 -exec rm -rf {} \;

# Optimize database (if needed)
sqlite3 nmt_release_management.db "VACUUM;"
```

## 🔒 **Security Considerations**

### **Production Security**
- **Change default SECRET_KEY** in production environment
- **Use HTTPS** with proper SSL certificates
- **Configure firewall** to restrict access to necessary ports only
- **Regular updates** of dependencies and system packages
- **Backup strategy** for database and storage files

### **File Permissions**
```bash
# Secure production directories
sudo chmod 750 /var/lib/nmt-backend
sudo chmod 640 /etc/nmt-backend/config.env
sudo chown nmt-user:nmt-group /var/lib/nmt-backend/storage
```

## 📊 **Monitoring & Maintenance**

### **Regular Maintenance**
```bash
# Log cleanup (automatic via systemd)
# Manual cleanup if needed:
sudo journalctl --vacuum-time=30d

# Storage cleanup
python backend/cleanup_temp_evaluations.py --dry-run --days-old 7

# Database maintenance
sqlite3 nmt_release_management.db "ANALYZE; VACUUM;"
```

### **Health Monitoring**
- **System health**: http://localhost:8000/api/v1/system/health
- **Storage usage**: Dashboard → System Overview
- **Service status**: `systemctl status nmt-*`
- **Application logs**: `backend/logs/` or `journalctl -u nmt-backend`

## 🎯 **Post-Installation Steps**

1. **Create Language Pairs**: Add your translation language pairs
2. **Upload Test Models**: Test the model upload functionality
3. **Create Testsets**: Upload source/target test files
4. **Configure Evaluation**: Set up Docker integration (if using)
5. **Create Users**: Add team members with appropriate roles
6. **Test Workflows**: Run through complete model evaluation workflow
7. **Setup Monitoring**: Configure log monitoring and alerts

## 📞 **Support**

**Installation Issues:**
- Check logs in `backend/logs/` or via `journalctl`
- Verify all prerequisites are installed
- Ensure ports 3000 and 8000 are available
- Review environment variable configuration

**Performance Issues:**
- Monitor system resources with `htop`
- Check disk space with `df -h`
- Review database performance
- Consider scaling options for large deployments

---

**Installation Guide Version**: 7.1  
**Last Updated**: 06/06/2025  
**Status**: ✅ Production Ready - Complete Setup Instructions 