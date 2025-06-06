# Quick Start Guide - NMT Release Management System v7.1

## 🚀 **Get Running in 5 Minutes**

This guide provides the fastest path to get the NMT Release Management System up and running with all 7 production modules.

**System Status**: ✅ Production Ready - All Modules Complete  
**Latest Version**: 7.1 - Enhanced SQE Results with Intelligent Analytics

## ⚡ **Lightning Start**

### **1. One-Command Setup**
```bash
# Clone and start everything
git clone <repository-url>
cd NMT_Managemnt_Experiments
chmod +x run.sh
./run.sh
```

### **2. Instant Access**
- **Frontend**: http://localhost:3000 (Professional UI)
- **Backend API**: http://localhost:8000 (FastAPI)
- **API Docs**: http://localhost:8000/docs (Interactive)

### **3. First Login**
```
1. Go to http://localhost:3000
2. Click "Sign Up" 
3. Create admin account:
   - Username: admin
   - Email: admin@example.com  
   - Password: [your-secure-password]
   - Role: admin
4. Auto-approved, login immediately
```

## 🎯 **Core System Overview**

### **✅ All 7 Production Modules**
1. **👥 Authentication & User Management** - Role-based access control
2. **🌐 Language Pair Management** - Source ↔ Target language combinations
3. **📦 Model Version Management** - ML model lifecycle tracking
4. **📊 Testset Management** - Translation test datasets
5. **📈 Training Results & Visualization** - Performance metrics & charts
6. **🔄 Evaluation Workflow** - Automated model testing pipeline
7. **✨ Enhanced SQE Results** - Quality engineering with intelligent analytics

### **🎨 Professional UI Features**
- **Argon Dashboard Design** - Modern gradient styling
- **Responsive Layout** - Works on desktop, tablet, mobile
- **Interactive Charts** - Real-time data visualization
- **Advanced Tables** - Sorting, filtering, pagination
- **File Management** - Drag-and-drop upload/download

## 📋 **Essential Workflows**

### **🌐 1. Language Pair Setup**
```
Navigation: Language Pairs → Add New
Purpose: Define translation directions (e.g., en → th, zh → en)
Required: Source language code, Target language code
Example: English (en) → Thai (th)
```

**Quick Setup:**
1. Click **"Add New Language Pair"**
2. Enter source: `en`, target: `th`
3. Name: `English → Thai`
4. Description: `English to Thai translation`
5. **Save** → Ready for models!

### **📦 2. Model Version Management**
```
Navigation: Model Versions → Add New Model Version
Purpose: Upload and track ML translation models
Features: File upload, metadata, version control
```

**Upload Process:**
1. Select **Language Pair** from dropdown
2. Enter **Version Name** (e.g., "v2.1-finetuned")
3. **Upload Files**:
   - Model files (.pt, .pth, .bin)
   - Hyperparameters (.json, .yaml)
   - Base model files (optional)
4. Add **Description** and **Release Date**
5. **Save** → Model ready for evaluation!

### **📊 3. Testset Creation**
```
Navigation: Testsets → Add New Testset
Purpose: Upload test data for model evaluation
Required: Source file, Target file (parallel texts)
```

**Upload Steps:**
1. Select **Language Pair**
2. Enter **Testset Name** (e.g., "WMT2023-test")
3. **Upload Files**:
   - Source file (.txt) - sentences in source language
   - Target file (.txt) - reference translations
4. **Auto-validation** checks file alignment
5. **Save** → Ready for evaluation!

### **🔄 4. Automated Evaluation**
```
Location: Model Version Details → Evaluation Tab
Purpose: Automated BLEU/COMET score calculation
Features: Background processing, real-time progress
```

**Evaluation Process:**
1. **Open Model Version** details page
2. Click **"Start Evaluation"**
3. **Select Testset** for evaluation
4. **Choose Mode**:
   - Base model only
   - Finetuned model only  
   - Both (comparison)
5. **Start** → Background processing begins
6. **Monitor Progress** → Real-time updates
7. **View Results** → BLEU/COMET scores + output comparison

### **📈 5. Training Results Tracking**
```
Location: Model Version Details → Training Results Tab
Purpose: Record and track training metrics
Features: Score comparison, trend analysis
```

**Adding Results:**
1. **Open Model Version** → Training Results tab
2. Click **"Add Training Result"**
3. **Select Testset** used for training evaluation
4. **Enter Scores**:
   - Base BLEU score
   - Finetuned BLEU score
   - COMET scores (optional)
5. **Training Notes** (hyperparameters, training time, etc.)
6. **Save** → Automatic comparison calculation

### **✨ 6. SQE Quality Assessment**
```
Navigation: SQE Results → Add New Result
Purpose: Software Quality Engineering evaluation
Features: Score tracking, critical issue detection, analytics
```

**SQE Workflow:**
1. **Navigate to SQE Results**
2. Click **"Add New SQE Result"**
3. **Select Model Version**
4. **Quality Assessment**:
   - Average Score (1.0-10.0 scale)
   - Total Test Cases evaluated
   - Critical Issues flag (any 1-point cases)
   - Change percentage from previous
5. **Save** → Contributes to analytics
6. **View Dashboard** → Critical Issues intelligence

### **📝 7. Release Notes Management**
```
Location: Model Version Details → Release Notes Tab
Purpose: Document changes, improvements, known issues
Features: Rich text editor, version control
```

**Creating Release Notes:**
1. **Open Model Version** → Release Notes tab
2. Click **"Create/Edit Release Note"**
3. **Enter Content**:
   - Release title
   - Changes and improvements
   - Known issues
   - Migration notes
4. **Rich Text Formatting** available
5. **Save** → Professional documentation ready

## 🎨 **UI Navigation Guide**

### **Sidebar Navigation**
- **Dashboard** - System overview, statistics, charts
- **Language Pairs** - Manage translation directions
- **Model Versions** - Upload and track models  
- **Testsets** - Manage test datasets
- **Training Results** - Performance tracking (deprecated, use Model Version tabs)
- **Evaluation & Translation** - Evaluation workflows
- **SQE Results** - Quality engineering dashboard
- **Visualizations** - Advanced charts and analytics
- **Users** - User management (Admin only)

### **Dashboard Features**
- **📊 System Statistics** - Real-time counts and percentages
- **📈 Interactive Charts** - Model performance trends
- **🔍 Recent Activity** - Latest system events
- **💾 Storage Overview** - File usage and space
- **⚠️ Critical Issues** - Intelligent quality alerts

## 🎯 **User Roles & Permissions**

### **👑 Admin**
- **Full system access** - All modules and operations
- **User management** - Create, approve, manage users
- **Data export** - Excel/Markdown exports
- **System monitoring** - Health checks, logs, cleanup
- **Delete operations** - Remove data with confirmations

### **👨‍💼 Release Manager**
- **Model management** - Create, upload, edit model versions
- **Evaluation control** - Start evaluations, manage results
- **Release notes** - Create and edit documentation
- **Training results** - Add and track performance metrics
- **SQE management** - Quality assessment and tracking

### **👤 Member**
- **View access** - All data and visualizations
- **Read-only dashboards** - Charts, statistics, trends
- **Export capabilities** - Download results and reports
- **No editing** - Cannot modify system data

## 📊 **Key Features Highlights**

### **🎨 Professional UI/UX**
- **Argon Dashboard Styling** - Modern gradients and shadows
- **Responsive Design** - Mobile-first approach
- **Interactive Elements** - Smooth animations and transitions
- **Loading States** - Professional progress indicators
- **Error Handling** - User-friendly error messages

### **⚡ Performance Features**
- **Server-side Pagination** - Handle large datasets efficiently
- **Real-time Updates** - Background task progress tracking
- **Intelligent Caching** - Fast data loading
- **Optimized Queries** - Database performance optimization
- **File Streaming** - Efficient large file handling

### **🔒 Security & Reliability**
- **JWT Authentication** - Secure token-based access
- **Role-based Access** - Granular permission control
- **Input Validation** - Comprehensive data verification
- **Error Recovery** - Graceful error handling
- **Audit Logging** - Complete activity tracking

## 🚀 **Advanced Workflows**

### **📈 Analytics & Monitoring**
```
1. Dashboard → View system overview
2. SQE Results → Analytics tab → Interactive charts
3. Visualizations → Advanced data analysis
4. Model Versions → Performance comparison
5. System monitoring → Storage and health checks
```

### **🔄 Complete Evaluation Pipeline**
```
1. Create Language Pair (en → th)
2. Upload Model Version (with files)
3. Create Testset (source + target files)
4. Start Evaluation → Background processing
5. Add Training Results → Performance tracking
6. SQE Assessment → Quality evaluation  
7. Release Notes → Documentation
8. Monitor → Dashboard analytics
```

### **📊 Data Export & Reporting**
```
1. Model Versions → Export Data (Admin)
2. SQE Results → Analytics → Charts
3. Training Results → Performance reports
4. Evaluation Results → Comparison outputs
5. System Reports → Health and usage stats
```

## 🛠 **Development Tips**

### **Backend Development**
```bash
# Development server with hot reload
cd backend
source venv/bin/activate
uvicorn app.main:app --reload

# Check API documentation
open http://localhost:8000/docs
```

### **Frontend Development**
```bash
# Development server with hot reload
cd frontend  
npm start

# Build for production
npm run build
```

### **Database Management**
```bash
# View database directly
sqlite3 backend/nmt_release_management.db

# Check logs
tail -f backend/logs/app_*.log

# Storage overview
ls -la backend/storage/
```

## 🚨 **Quick Troubleshooting**

### **🔧 Common Issues**
```bash
# Port conflicts
lsof -i :3000 :8000

# Clear frontend cache
rm -rf frontend/node_modules frontend/package-lock.json
cd frontend && npm install

# Reset database (caution: data loss)
rm backend/nmt_release_management.db

# Check service status (production)
sudo systemctl status nmt-backend nmt-frontend-prod
```

### **📞 Support Resources**
- **Installation Issues**: [Installation Guide](INSTALLATION.md)
- **Technical Details**: [Developer Guide](DEVELOPER_GUIDE.md)  
- **API Reference**: http://localhost:8000/docs
- **System Status**: Dashboard → System Overview

## 🎯 **Next Steps**

### **After Quick Start**
1. **Explore Features** - Try all 7 modules
2. **Upload Real Data** - Add your models and testsets
3. **Run Evaluations** - Test the automation pipeline
4. **Create Users** - Add team members with roles
5. **Setup Production** - Follow [Installation Guide](INSTALLATION.md)
6. **Monitor System** - Use dashboard and analytics

### **Production Deployment**
```bash
# Quick production setup
sudo ./install-prod-services.sh

# Check production status
sudo systemctl status nmt-backend nmt-frontend-prod
```

---

**Quick Start Guide Version**: 7.1  
**Last Updated**: 06/06/2025  
**Status**: ✅ Complete - All Features Ready  
**Time to Productive**: ~5 minutes 