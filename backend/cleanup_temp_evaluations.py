#!/usr/bin/env python3
"""
Cleanup script to remove temporary evaluation directories for old completed jobs.
This should be run manually by admin to prevent storage from filling up with old temp files.

IMPORTANT: This script should NOT be run automatically as users may still need access 
to translation output files. Only run this manually after confirming with users.
"""

import os
import sys
import shutil
import logging
from pathlib import Path
from datetime import datetime, timedelta
from typing import Set, Tuple

# Add app to path
sys.path.append('.')

from app.db.database import get_db
from app.db import models

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def cleanup_temp_evaluation_dirs(days_old: int = 7, dry_run: bool = True):
    """
    Remove temp evaluation directories for jobs that are:
    1. Completed or failed (not active)
    2. Older than specified days
    3. Not in database (orphaned directories)
    
    Args:
        days_old: Only delete directories older than this many days (default: 7)
        dry_run: If True, only show what would be deleted without actually deleting (default: True)
    """
    logger.info(f"Starting cleanup of temp evaluation directories (dry_run={dry_run})...")
    logger.info(f"Will only consider directories older than {days_old} days")
    
    if dry_run:
        logger.warning("DRY RUN MODE - No files will actually be deleted")
    else:
        logger.warning("LIVE MODE - Files will be permanently deleted!")
    
    # Get database session
    db = next(get_db())
    
    try:
        # Get all jobs from database
        all_jobs = db.query(models.EvaluationJob).all()
        job_ids_in_db = {job.job_id for job in all_jobs}
        
        # Get jobs that are still active (should never be deleted)
        active_statuses = ['PENDING', 'PREPARING_SETUP', 'PREPARING_ENGINE', 'RUNNING_ENGINE', 'CALCULATING_METRICS']
        active_jobs = db.query(models.EvaluationJob).filter(
            models.EvaluationJob.status.in_(active_statuses)
        ).all()
        active_job_ids = {job.job_id for job in active_jobs}
        
        # Get recently completed jobs (within the age threshold)
        cutoff_date = datetime.utcnow() - timedelta(days=days_old)
        recent_jobs = db.query(models.EvaluationJob).filter(
            models.EvaluationJob.completed_at.isnot(None),
            models.EvaluationJob.completed_at > cutoff_date
        ).all()
        recent_job_ids = {job.job_id for job in recent_jobs}
        
        logger.info(f"Found {len(job_ids_in_db)} total jobs in database")
        logger.info(f"Found {len(active_job_ids)} active jobs in database")
        logger.info(f"Found {len(recent_job_ids)} jobs completed within {days_old} days")
        
        # Check temp evaluation directory
        temp_eval_path = Path("storage/temp/evaluation_temp")
        if not temp_eval_path.exists():
            logger.info("No temp evaluation directory found")
            return
        
        deleted_count = 0
        kept_count = 0
        error_count = 0
        total_size_deleted = 0
        
        for eval_dir in temp_eval_path.iterdir():
            if not eval_dir.is_dir():
                continue
                
            try:
                # Extract job_id from directory name (evaluation_X)
                if not eval_dir.name.startswith('evaluation_'):
                    logger.warning(f"Skipping directory with unexpected name: {eval_dir.name}")
                    continue
                    
                dir_job_id = int(eval_dir.name.split('_')[1])
                
                # Calculate directory age and size
                dir_stats = eval_dir.stat()
                dir_modified_time = datetime.fromtimestamp(dir_stats.st_mtime)
                dir_age_days = (datetime.now() - dir_modified_time).days
                
                dir_size = sum(f.stat().st_size for f in eval_dir.rglob('*') if f.is_file())
                dir_size_mb = dir_size / (1024 * 1024)
                
                # Determine if this directory should be kept
                should_keep = False
                reason = ""
                
                if dir_job_id in active_job_ids:
                    should_keep = True
                    reason = f"job is still active (status: {next((j.status for j in active_jobs if j.job_id == dir_job_id), 'unknown')})"
                elif dir_job_id in recent_job_ids:
                    should_keep = True
                    reason = f"job completed recently (less than {days_old} days ago)"
                elif dir_age_days < days_old:
                    should_keep = True
                    reason = f"directory is too recent ({dir_age_days} days old, threshold: {days_old} days)"
                elif dir_job_id not in job_ids_in_db:
                    reason = f"orphaned directory (job not found in database, {dir_age_days} days old)"
                else:
                    reason = f"old completed/failed job ({dir_age_days} days old)"
                
                if should_keep:
                    logger.info(f"KEEP: {eval_dir.name} ({dir_size_mb:.2f} MB, {dir_age_days} days old): {reason}")
                    kept_count += 1
                else:
                    logger.info(f"DELETE: {eval_dir.name} ({dir_size_mb:.2f} MB, {dir_age_days} days old): {reason}")
                    
                    if not dry_run:
                        shutil.rmtree(eval_dir)
                        total_size_deleted += dir_size
                    
                    deleted_count += 1
                    
            except (ValueError, IndexError) as e:
                logger.warning(f"Could not parse job_id from directory name '{eval_dir.name}': {e}")
                error_count += 1
            except Exception as e:
                logger.error(f"Error processing directory '{eval_dir.name}': {e}")
                error_count += 1
        
        total_size_deleted_mb = total_size_deleted / (1024 * 1024)
        
        if dry_run:
            logger.info(f"DRY RUN completed: {deleted_count} would be deleted ({total_size_deleted_mb:.2f} MB), {kept_count} kept, {error_count} errors")
            logger.info("To actually delete files, run with dry_run=False")
        else:
            logger.info(f"Cleanup completed: {deleted_count} deleted ({total_size_deleted_mb:.2f} MB freed), {kept_count} kept, {error_count} errors")
        
    except Exception as e:
        logger.error(f"Error during cleanup: {e}")
        raise
    finally:
        db.close()

def main():
    """
    Main function with command line argument parsing
    """
    import argparse
    
    parser = argparse.ArgumentParser(description='Cleanup temporary evaluation directories')
    parser.add_argument('--days-old', type=int, default=7, 
                       help='Only delete directories older than this many days (default: 7)')
    parser.add_argument('--dry-run', action='store_true', default=True,
                       help='Show what would be deleted without actually deleting (default: True)')
    parser.add_argument('--live', action='store_true', 
                       help='Actually delete files (overrides --dry-run)')
    
    args = parser.parse_args()
    
    # If --live is specified, disable dry_run
    dry_run = not args.live if args.live else args.dry_run
    
    if not dry_run:
        response = input(f"Are you sure you want to permanently delete evaluation directories older than {args.days_old} days? (yes/no): ")
        if response.lower() != 'yes':
            logger.info("Operation cancelled by user")
            return
    
    cleanup_temp_evaluation_dirs(days_old=args.days_old, dry_run=dry_run)

if __name__ == "__main__":
    main() 