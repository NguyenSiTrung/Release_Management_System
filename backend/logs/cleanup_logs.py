#!/usr/bin/env python3
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
        logging.FileHandler('/home/trung/Documents/ML/Translation/NMT_Managemnt_Experiments/backend/logs/cleanup.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('log_cleanup')

def cleanup_old_logs():
    logs_dir = '/home/trung/Documents/ML/Translation/NMT_Managemnt_Experiments/backend/logs'
    logger.info(f'Starting log cleanup in: {logs_dir}')
    
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
                        logger.info(f'Deleting old log file: {filename}')
                        os.remove(file_path)
                        deleted_count += 1
                except (ValueError, IndexError):
                    logger.warning(f'Could not parse date from filename: {filename}')
        
        logger.info(f'Cleanup completed. Deleted {deleted_count} old log files.')
    except Exception as e:
        logger.error(f'Error during cleanup: {str(e)}')
        return False
    
    return True

if __name__ == '__main__':
    cleanup_old_logs()
