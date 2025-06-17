# NMT Management System - Changelog

## [7.1.1] - 2025-06-17 - CRITICAL FIX RELEASE 🔧

### 🔧 **CRITICAL BUG FIX: Model Version Deletion Issue**

**Fixed critical database integrity error that prevented model version deletion when SQE results existed.**

#### **🐛 Issue Resolved**
- **Problem**: `sqlite3.IntegrityError: NOT NULL constraint failed: sqe_results.version_id` when deleting model versions
- **Root Cause**: Missing CASCADE delete constraint on SQE results foreign key
- **Impact**: Model versions with SQE results could not be deleted, blocking cleanup workflows

#### **✅ Fix Implementation**
- **Database Schema**: Added `ondelete="CASCADE"` to SQE results foreign key constraint
- **ORM Relationships**: Enhanced ModelVersion relationship with `cascade="all, delete-orphan"`
- **CRUD Logic**: Improved deletion logic with explicit SQE results cleanup
- **Migration**: Created migration script `006_fix_sqe_results_cascade_delete.py`
- **Logging**: Added comprehensive logging for deletion tracking

#### **🔄 Technical Changes**

**Backend Database Models** (`app/db/models.py`):
```python
# Fixed SQE Results foreign key with CASCADE delete
version_id = Column(Integer, ForeignKey("model_versions.version_id", ondelete="CASCADE"), nullable=False)

# Enhanced ModelVersion relationship
sqe_result = relationship("SQEResult", back_populates="model_version", cascade="all, delete-orphan")
```

**Enhanced CRUD Operations** (`app/crud/crud_model_version.py`):
```python
def remove(db: Session, *, version_id: int) -> ModelVersion:
    # Added explicit SQE results cleanup for backward compatibility
    try:
        sqe_results = db.query(SQEResult).filter(SQEResult.version_id == version_id).all()
        if sqe_results:
            logger.info(f"Deleting {len(sqe_results)} SQE result(s) for model version {version_id}")
            for sqe_result in sqe_results:
                db.delete(sqe_result)
    except Exception as e:
        logger.warning(f"Error deleting SQE results for model version {version_id}: {e}")
```

**Database Migration** (`alembic/versions/006_fix_sqe_results_cascade_delete.py`):
- SQLite-compatible migration using `batch_alter_table`
- Proper constraint recreation with CASCADE delete
- Rollback capability for downgrade operations

#### **📋 Deployment Instructions**

**For Existing Production Systems:**
1. **Backup Database**: `cp nmt_release_management.db nmt_release_management.db.backup`
2. **Apply Code Changes**: Deploy updated backend code
3. **Run Migration**: Execute migration script or SQL commands
4. **Verify Fix**: Test model version deletion functionality

**Migration Script** (for manual execution):
```bash
# Create and run migration script
cd backend/
python3 run_migration.py  # (script provided in fix)
```

#### **🎯 Benefits**
- ✅ **Data Consistency**: Proper cascade deletion maintains database integrity
- ✅ **User Experience**: Model versions can now be deleted without errors
- ✅ **Maintenance**: Simplified cleanup workflows for administrators
- ✅ **Reliability**: Robust error handling with comprehensive logging
- ✅ **Backward Compatibility**: Supports existing databases without data loss

---

## [7.1.0] - 2025-06-06 - ENHANCED ANALYTICS RELEASE 🎯

### 🎯 **MAJOR ENHANCEMENT: Intelligent Critical Issues Logic**

**The NMT Release Management System receives significant analytics enhancements with intelligent Critical Issues assessment and professional UI refinements.**

### 🧠 **Critical Issues Logic Enhancement**

#### **Smart Language Pair-Based Counting**
- **Previous Logic**: Simple aggregation counting all SQE results with 1-point test cases
- **New Logic**: Intelligent Language Pair-based assessment:
  * Each Language Pair contributes **maximum 1** Critical Issue
  * Based on **latest SQE result** by `test_date` (DESC) for each Language Pair
  * If latest result has no 1-point cases → no Critical Issue contribution
  * If latest result has 1-point cases → contributes 1 Critical Issue

#### **Enhanced Backend Implementation**
- **New Methods in `crud_sqe_results.py`**:
  ```python
  def _count_critical_language_pairs(self, db: Session) -> int:
      """Count language pairs with critical issues in their latest SQE result"""
      
  def _language_pair_has_critical_issues(self, db: Session, language_pair_id: int) -> bool:
      """Check if language pair has critical issues in latest SQE result"""
  ```
- **Updated Methods**: Enhanced `get_overall_stats()` and `get_cross_language_comparison()` with new logic
- **Performance Optimization**: Efficient database queries avoiding complex aggregations

### 🎨 **Professional UI/UX Enhancements**

#### **Critical Issues Card Redesign**
- **Status Messages**: Replaced meaningless percentages with actionable status:
  * `0 issues`: "All systems clear" (Green)
  * `1 issue`: "Requires attention" (Red)
  * `2-3 issues`: "Multiple issues found" (Red)
  * `>3 issues`: "Critical review needed" (Red)
- **Professional Icon Design**: Removed unnecessary shadows with `noIconShadow` prop
- **Dynamic Gradient Colors**: 
  * No issues: Green gradient `['#4caf50', '#66bb6a']`
  * Has issues: Red gradient `['#f44336', '#ef5350']`
- **Educational Tooltips**: Comprehensive explanations of Critical Issues logic

#### **Advanced Analytics Filtering**
- **Language Pair Filtering for Score Distribution**:
  * "All Language Pairs" default view (green indicator)
  * Individual language pair filtering (blue indicators)
  * Dynamic chart titles based on selection
  * Result count displays with appropriate messaging
  * Professional empty states for filtered views

### 🔧 **Technical Achievements**

#### **Backend Enhancements**
- **Database Query Optimization**: Enhanced performance with intelligent counting algorithms
- **API Enhancement**: Updated analytics endpoints to support language pair filtering
- **Error Handling**: Comprehensive validation for edge cases and data consistency
- **Relationship Management**: Proper Language Pair → ModelVersion → SQEResult navigation

#### **Frontend Improvements**
- **StatCard Component**: Added `noIconShadow` prop for professional appearance
- **Service Layer**: Enhanced `sqeService.ts` with `getScoreDistribution()` function
- **Chart Components**: Dynamic filtering and visualization updates
- **TypeScript Integration**: Full type safety with proper error boundaries

### 📊 **User Experience Improvements**

#### **Enhanced User Guidance**
- **Comprehensive Tooltips**: Educational tooltips explaining Critical Issues logic
- **Dynamic Alerts**: Context-aware alert messages based on critical count
- **Visual Feedback**: Color-coded indicators showing filter status
- **Professional Messaging**: Clear, actionable status descriptions

#### **Advanced Analytics Interface**
- **Filter Controls**: Professional Material-UI dropdown for language pair selection
- **Auto-refresh**: Automatic data refresh when filter selection changes
- **Mobile Optimization**: Responsive filter controls with proper spacing
- **Empty State Handling**: Professional guidance for filtered views

### 🎯 **Impact & Benefits**

#### **Accurate Quality Assessment**
- **Intelligent Logic**: Critical Issues now accurately reflect Language Pair status
- **Latest Result Priority**: Assessment based on most recent test results
- **Meaningful Metrics**: Actionable status messages replacing confusing percentages
- **Educational Guidance**: User understanding through comprehensive tooltips

#### **Enhanced Analytics Capabilities**
- **Granular Filtering**: Language pair-specific insights for Score Distribution
- **Professional Interface**: Clean, intuitive design matching industry standards
- **Performance Optimization**: Efficient queries providing fast response times
- **User Experience**: Improved workflows with clear guidance and feedback

### 🔍 **Files Modified**

#### **Backend Files**
- `backend/app/crud/crud_sqe_results.py` - Enhanced critical counting logic
- `backend/app/api/v1/endpoints/sqe_results.py` - Analytics endpoint improvements

#### **Frontend Files**
- `frontend/src/pages/SQEResults.tsx` - Critical Issues card redesign và status messages
- `frontend/src/components/common/StatCard.tsx` - Added `noIconShadow` prop
- `frontend/src/components/SQEResults/SQEAnalyticsCharts.tsx` - Language pair filtering
- `frontend/src/services/sqeService.ts` - Enhanced service functions

### 📋 **Migration Notes**

#### **Database**
- No schema changes required - enhancement uses existing data relationships
- Backward compatible with all existing SQE results data
- Automatic migration of critical counting logic on deployment

#### **Frontend**
- Enhanced user interface with improved visual design
- Existing functionality preserved with enhanced capabilities
- No user training required - intuitive improvements

### 🎉 **Production Readiness**

**Enhanced System Status**: All improvements tested and verified in production environment
- ✅ **Intelligent Analytics**: Language Pair-based Critical Issues assessment
- ✅ **Professional UI**: Enhanced visual design with clean appearance
- ✅ **Advanced Filtering**: Granular analytics with language pair context
- ✅ **Educational Guidance**: Comprehensive user understanding through tooltips
- ✅ **Performance Optimization**: Efficient database queries and enhanced logic
- ✅ **Production Verification**: All enhancements validated in production environment

---

*Previous versions continue below...*
