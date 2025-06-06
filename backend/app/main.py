from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import logging
import os
import time
import shutil
from datetime import datetime, timedelta
from logging.handlers import TimedRotatingFileHandler
import pathlib
from sqlalchemy.orm import Session
from crontab import CronTab
import sys

from app.api.v1.api import api_router
from app.core.config import settings
from app.db.database import get_db
from app.crud import crud_evaluation
from app.schemas.evaluation import EvaluationStatus
from app.core.evaluation import run_evaluation

# Cấu hình logging chuyên nghiệp
def setup_logging():
    # Tạo thư mục logs nếu chưa tồn tại
    logs_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'logs')
    os.makedirs(logs_dir, exist_ok=True)
    
    # Tạo tên file log với timestamp
    log_file = os.path.join(logs_dir, f'nmt-backend-{datetime.now().strftime("%Y-%m-%d")}.log')
    
    # Định dạng log entry
    log_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    formatter = logging.Formatter(log_format)
    
    # Cấu hình root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    
    # Xóa các handlers đã có (tránh duplicate logs)
    if root_logger.handlers:
        for handler in root_logger.handlers:
            root_logger.removeHandler(handler)
    
    # Handler cho console output
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    console_handler.setLevel(logging.INFO)
    root_logger.addHandler(console_handler)
    
    # Handler cho file với rotation
    # Rotation mỗi ngày và giữ logs trong 30 ngày
    file_handler = TimedRotatingFileHandler(
        log_file, 
        when='midnight',
        interval=1,
        backupCount=30
    )
    file_handler.setFormatter(formatter)
    file_handler.setLevel(logging.INFO)
    root_logger.addHandler(file_handler)
    
    # Log thông tin khởi động
    logger = logging.getLogger(__name__)
    logger.info("=" * 80)
    logger.info(f"Logging initialized. Log file: {log_file}")
    logger.info(f"Log level: INFO, Rotation: daily, Retention: 30 days")
    logger.info(f"Application starting at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info("=" * 80)
    
    return logger

# Tạo script để xóa log files cũ
def create_cleanup_script():
    """
    Tạo script Python để xóa log files cũ
    """
    cleanup_script_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'logs', 'cleanup_logs.py')
    logs_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'logs')
    
    script_content = f"""#!/usr/bin/env python3
import os
import sys
import logging
import shutil
from datetime import datetime, timedelta

# Cấu hình logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('{logs_dir}/cleanup.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('log_cleanup')

def cleanup_old_logs():
    logs_dir = '{logs_dir}'
    logger.info(f'Starting log cleanup in: {{logs_dir}}')
    
    # Tính ngày cũ hơn 30 ngày
    cutoff_date = datetime.now() - timedelta(days=30)
    cutoff_str = cutoff_date.strftime('%Y-%m-%d')
    
    try:
        deleted_count = 0
        for filename in os.listdir(logs_dir):
            file_path = os.path.join(logs_dir, filename)
            
            # Bỏ qua thư mục và script này
            if os.path.isdir(file_path) or filename == 'cleanup_logs.py' or filename == 'cleanup.log':
                continue
                
            # Kiểm tra nếu file là log file và cũ hơn 30 ngày
            if filename.startswith('nmt-backend-'):
                try:
                    # Trích xuất ngày từ tên file
                    file_date_str = filename.replace('nmt-backend-', '').split('.')[0]
                    
                    # So sánh với thời gian cutoff
                    if file_date_str < cutoff_str:
                        logger.info(f'Deleting old log file: {{filename}}')
                        os.remove(file_path)
                        deleted_count += 1
                except (ValueError, IndexError):
                    logger.warning(f'Could not parse date from filename: {{filename}}')
        
        logger.info(f'Cleanup completed. Deleted {{deleted_count}} old log files.')
    except Exception as e:
        logger.error(f'Error during cleanup: {{str(e)}}')
        return False
    
    return True

if __name__ == '__main__':
    cleanup_old_logs()
"""

    # Ghi script ra file
    with open(cleanup_script_path, 'w') as f:
        f.write(script_content)
    
    # Đặt permission thực thi
    os.chmod(cleanup_script_path, 0o755)
    
    return cleanup_script_path

# Thiết lập cronjob để tự động xóa log files cũ
def setup_logs_cleanup_cronjob():
    """
    Thiết lập cronjob để xóa log files cũ mỗi tháng
    """
    logger = logging.getLogger(__name__)
    try:
        # Tạo script xóa log
        cleanup_script = create_cleanup_script()
        logger.info(f"Created log cleanup script at: {cleanup_script}")
        
        # Tạo crontab job cho user hiện tại
        cron = CronTab(user=True)
        
        # Xóa tác vụ cũ nếu có
        for job in cron.find_comment('NMT backend log cleanup'):
            cron.remove(job)
            logger.info("Removed existing log cleanup cronjob")
        
        # Tạo cronjob mới chạy lúc 1:00 AM ngày đầu mỗi tháng
        job = cron.new(command=f'{sys.executable} {cleanup_script}',
                      comment='NMT backend log cleanup')
        job.setall('0 1 1 * *')  # 1:00 AM ngày 1 hàng tháng
        
        # Lưu crontab
        cron.write()
        logger.info("Scheduled log cleanup cronjob to run at 1:00 AM on the first day of each month")
        return True
    except Exception as e:
        logger.error(f"Failed to setup log cleanup cronjob: {str(e)}")
        logger.exception("Exception details:")
        return False

# Khởi tạo logging
logger = setup_logging()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Set up CORS
origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:8000",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8000",
    "*",  # Allow all origins in development
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.on_event("startup")
async def startup_event():
    """
    Process any pending evaluation jobs when server starts
    """
    logger.info("Starting server, checking for pending evaluation jobs...")
    
    # Setup log cleanup cronjob
    if setup_logs_cleanup_cronjob():
        logger.info("Log cleanup cronjob setup successfully")
    else:
        logger.warning("Failed to setup log cleanup cronjob")
    
    background_tasks = BackgroundTasks()
    
    # Get all PENDING jobs
    db: Session = next(get_db())
    pending_jobs = []  # Initialize the variable
    try:
        pending_jobs = crud_evaluation.get_multi(
            db=db, 
            status=EvaluationStatus.PENDING
        )
        
        # Add each job to background tasks
        if pending_jobs:
            logger.info(f"Found {len(pending_jobs)} pending evaluation jobs")
            for job in pending_jobs:
                logger.info(f"Scheduling processing for job_id: {job.job_id}")
                background_tasks.add_task(run_evaluation, job.job_id)
        else:
            logger.info("No pending evaluation jobs found")
    except Exception as e:
        logger.error(f"Error processing pending jobs: {str(e)}")
        logger.exception("Details of the error:")
    finally:
        db.close()
    
    # Execute the background tasks
    if pending_jobs:
        await background_tasks()
        logger.info("All pending jobs have been scheduled for processing")

@app.get("/")
def read_root():
    return {"message": "Welcome to NMT Release Management System API"} 