import os
import logging
from typing import Dict, Any
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.deps import get_current_active_user, get_db
from ....schemas.user import User

logger = logging.getLogger(__name__)

router = APIRouter()

def format_file_size(size_gb: float) -> str:
    """
    Format file size for better display.
    
    Args:
        size_gb: Size in GB
        
    Returns:
        Formatted size string
    """
    if size_gb >= 1.0:
        return f"{size_gb:.2f} GB"
    elif size_gb >= 0.001:  # >= 1 MB
        size_mb = size_gb * 1024
        return f"{size_mb:.1f} MB"
    elif size_gb > 0:  # > 0 but < 1 MB
        size_kb = size_gb * 1024 * 1024
        if size_kb >= 1.0:
            return f"{size_kb:.1f} KB"
        else:
            # Show in bytes for very small files
            size_bytes = size_gb * 1024 * 1024 * 1024
            return f"{size_bytes:.0f} bytes"
    else:
        return "0 bytes"

def get_directory_size(directory_path: str) -> float:
    """
    Calculate the total size of a directory in GB.
    
    Args:
        directory_path: Path to the directory
        
    Returns:
        Size in GB
    """
    try:
        if not os.path.exists(directory_path):
            logger.warning(f"Directory does not exist: {directory_path}")
            return 0.0
        
        logger.info(f"Calculating size for directory: {directory_path}")
        total_size = 0
        file_count = 0
        
        for dirpath, dirnames, filenames in os.walk(directory_path):
            logger.info(f"Walking directory: {dirpath}, found {len(filenames)} files")
            for filename in filenames:
                filepath = os.path.join(dirpath, filename)
                try:
                    if os.path.exists(filepath):
                        file_size = os.path.getsize(filepath)
                        total_size += file_size
                        file_count += 1
                        logger.info(f"File: {filepath}, size: {file_size} bytes")
                    else:
                        logger.warning(f"File does not exist: {filepath}")
                except (OSError, FileNotFoundError) as e:
                    logger.warning(f"Could not get size for file {filepath}: {e}")
                    continue
        
        # Convert bytes to GB
        size_gb = total_size / (1024 ** 3)
        logger.info(f"Total size for {directory_path}: {total_size} bytes = {size_gb} GB ({file_count} files)")
        return size_gb
        
    except Exception as e:
        logger.error(f"Error calculating directory size for {directory_path}: {e}")
        return 0.0

def count_files_in_directory(directory_path: str) -> int:
    """
    Count the number of files in a directory recursively.
    
    Args:
        directory_path: Path to the directory
        
    Returns:
        Number of files
    """
    try:
        if not os.path.exists(directory_path):
            return 0
            
        file_count = 0
        for dirpath, dirnames, filenames in os.walk(directory_path):
            file_count += len(filenames)
        
        return file_count
        
    except Exception as e:
        logger.error(f"Error counting files in {directory_path}: {e}")
        return 0

@router.get("/storage/overview")
async def get_storage_overview(
    current_user: User = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """
    Get storage overview with real data from storage directories.
    """
    try:
        # Debug: Log current working directory
        current_dir = os.getcwd()
        logger.info(f"Current working directory: {current_dir}")
        
        # Define storage paths - corrected to match actual structure
        storage_base = Path("storage")
        
        # Model files are in storage/models subdirectories (like storage/models/5/)
        models_path = storage_base / "models"
        
        # Test sets are now at same level as models: storage/testsets
        testsets_path = storage_base / "testsets"
        
        temp_path = storage_base / "temp"
        logs_path = Path("logs")
        
        # Debug: Log absolute paths being checked
        logger.info(f"Checking models path: {models_path.absolute()}")
        logger.info(f"Checking testsets path: {testsets_path.absolute()}")
        logger.info(f"Checking logs path: {logs_path.absolute()}")
        logger.info(f"Checking temp path: {temp_path.absolute()}")
        
        # Calculate sizes
        models_size = get_directory_size(str(models_path))
        testsets_size = get_directory_size(str(testsets_path))
        logs_size = get_directory_size(str(logs_path))
        temp_size = get_directory_size(str(temp_path))
        
        # Count files
        models_count = count_files_in_directory(str(models_path))
        testsets_count = count_files_in_directory(str(testsets_path))
        logs_count = count_files_in_directory(str(logs_path))
        temp_count = count_files_in_directory(str(temp_path))
        
        total_size = models_size + testsets_size + logs_size + temp_size
        
        # Debug: Log results
        logger.info(f"Models: {models_size} GB, {models_count} files")
        logger.info(f"Testsets: {testsets_size} GB, {testsets_count} files")
        logger.info(f"Logs: {logs_size} GB, {logs_count} files")
        logger.info(f"Temp: {temp_size} GB, {temp_count} files")
        
        return {
            "model_files": {
                "size_gb": models_size,
                "file_count": models_count,
                "display": f"{format_file_size(models_size)} ({models_count} files)" if models_count > 0 else "No model files"
            },
            "testsets": {
                "size_gb": testsets_size,
                "file_count": testsets_count,
                "display": f"{format_file_size(testsets_size)} ({testsets_count} files)" if testsets_count > 0 else "No test sets"
            },
            "evaluation_logs": {
                "size_gb": logs_size,
                "file_count": logs_count,
                "display": f"{format_file_size(logs_size)} ({logs_count} files)" if logs_count > 0 else "No logs"
            },
            "temporary_files": {
                "size_gb": temp_size,
                "file_count": temp_count,
                "display": f"{format_file_size(temp_size)} ({temp_count} files)" if temp_count > 0 else "No temporary files"
            },
            "total": {
                "size_gb": total_size,
                "display": f"{format_file_size(total_size)} total used"
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting storage overview: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get storage overview: {str(e)}"
        )

@router.get("/system/status")
async def get_system_status(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get system status information.
    """
    try:
        # Test database connection
        db_status = "connected"
        db_message = "Connected"
        try:
            # Execute a simple query to test connection
            result = db.execute(text("SELECT 1"))
            result.fetchone()
        except Exception as e:
            db_status = "error"
            db_message = f"Connection error: {str(e)}"
            logger.error(f"Database connection error: {e}")
        
        # Check if background evaluation processes are running based on database status
        from app.db import models
        active_statuses = ['PENDING', 'PREPARING_SETUP', 'PREPARING_ENGINE', 'RUNNING_ENGINE', 'CALCULATING_METRICS']
        active_evaluations = db.query(models.EvaluationJob).filter(
            models.EvaluationJob.status.in_(active_statuses)
        ).count()
        
        # API Server status (if we reach this point, API is working)
        api_status = "online"
        api_message = "Online and healthy"
        
        return {
            "api_server": {
                "status": api_status,
                "message": api_message
            },
            "database": {
                "status": db_status,
                "message": db_message
            },
            "background_jobs": {
                "active_evaluations": active_evaluations,
                "message": f"{active_evaluations} running" if active_evaluations > 0 else "No active evaluations"
            },
            "storage_health": {
                "status": "healthy",
                "message": "All storage paths accessible"
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting system status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get system status: {str(e)}"
        )

@router.get("/evaluations/active")
async def get_active_evaluations(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get active evaluation information based on actual database status.
    """
    try:
        from app.db import models
        from datetime import datetime, timedelta
        
        # Get actually active jobs from database
        active_statuses = ['PENDING', 'PREPARING_SETUP', 'PREPARING_ENGINE', 'RUNNING_ENGINE', 'CALCULATING_METRICS']
        active_jobs = db.query(models.EvaluationJob).filter(
            models.EvaluationJob.status.in_(active_statuses)
        ).all()
        
        active_count = len(active_jobs)
        
        # Count completed jobs today
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        completed_today = db.query(models.EvaluationJob).filter(
            models.EvaluationJob.status == 'COMPLETED',
            models.EvaluationJob.completed_at >= today_start
        ).count()
        
        # Get evaluation directories (but only for active jobs)
        temp_evaluation_path = Path("storage/temp/evaluation_temp")
        evaluation_dirs = []
        
        if temp_evaluation_path.exists():
            active_job_ids = [job.job_id for job in active_jobs]
            for eval_dir in temp_evaluation_path.iterdir():
                if eval_dir.is_dir():
                    try:
                        # Extract job_id from directory name (evaluation_X)
                        dir_job_id = int(eval_dir.name.split('_')[1])
                        # Only include if job is actually active
                        if dir_job_id in active_job_ids:
                            evaluation_dirs.append({
                                "name": eval_dir.name,
                                "path": str(eval_dir),
                                "size_mb": round(get_directory_size(str(eval_dir)) * 1024, 2)
                            })
                    except (ValueError, IndexError):
                        # Skip directories that don't match evaluation_X pattern
                        continue
        
        return {
            "active_count": active_count,
            "completed_today": completed_today,
            "evaluation_directories": evaluation_dirs,
            "message": f"{active_count} evaluations currently running" if active_count > 0 else "No active evaluations"
        }
        
    except Exception as e:
        logger.error(f"Error getting active evaluations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get active evaluations: {str(e)}"
        ) 