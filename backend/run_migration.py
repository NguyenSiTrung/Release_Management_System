#!/usr/bin/env python3
"""
Migration script để fix model version deletion issue
Chạy script này khi deploy code lên server để sửa lỗi xóa model version

Usage:
    python3 run_migration.py [--dry-run]

Options:
    --dry-run    Show SQL commands without executing them
"""

import os
import sys
import sqlite3
import logging
import argparse
from pathlib import Path
from datetime import datetime

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def get_database_path():
    """Get database file path"""
    possible_paths = [
        "app.db",
        "nmt_release_management.db",
        "/var/lib/nmt-backend/nmt_release_management.db",
        "backend/nmt_release_management.db",
        "backend/app.db"
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            return path
    
    # Default fallback
    return "nmt_release_management.db"

def check_migration_needed(db_path: str) -> bool:
    """Check if migration is needed by testing foreign key constraint"""
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if we have any SQE results
        cursor.execute("SELECT COUNT(*) FROM sqe_results LIMIT 1")
        if cursor.fetchone()[0] == 0:
            logger.info("No SQE results found, migration not immediately needed")
            conn.close()
            return False
            
        # Try to check current foreign key constraint
        cursor.execute("PRAGMA foreign_key_list(sqe_results)")
        constraints = cursor.fetchall()
        
        for constraint in constraints:
            if constraint[2] == 'model_versions' and constraint[3] == 'version_id':
                # Check if ondelete is CASCADE
                if 'CASCADE' not in str(constraint):
                    logger.info("Foreign key constraint found but missing CASCADE delete")
                    conn.close()
                    return True
                else:
                    logger.info("CASCADE delete constraint already exists")
                    conn.close()
                    return False
        
        logger.info("Migration needed - foreign key constraint not properly configured")
        conn.close()
        return True
        
    except Exception as e:
        logger.warning(f"Error checking migration status: {e}")
        return True  # Assume migration is needed if check fails

def apply_migration(db_path: str, dry_run: bool = False):
    """Apply migration to fix SQE results cascade delete"""
    
    # SQL commands for the migration
    migration_sql = """
    -- Migration 006: Fix SQE results cascade delete
    -- This migration adds CASCADE delete to the foreign key constraint
    
    PRAGMA foreign_keys=off;
    
    BEGIN TRANSACTION;
    
    -- Create backup table
    CREATE TABLE sqe_results_backup AS SELECT * FROM sqe_results;
    
    -- Drop the original table
    DROP TABLE sqe_results;
    
    -- Recreate table with proper CASCADE constraint
    CREATE TABLE sqe_results (
        sqe_result_id INTEGER PRIMARY KEY,
        version_id INTEGER NOT NULL,
        average_score REAL NOT NULL,
        total_test_cases INTEGER NOT NULL,
        has_one_point_case BOOLEAN NOT NULL,
        change_percentage REAL,
        test_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (version_id) REFERENCES model_versions (version_id) ON DELETE CASCADE
    );
    
    -- Restore data from backup
    INSERT INTO sqe_results SELECT * FROM sqe_results_backup;
    
    -- Drop backup table
    DROP TABLE sqe_results_backup;
    
    COMMIT;
    
    PRAGMA foreign_keys=on;
    """
    
    if dry_run:
        logger.info("DRY RUN - SQL commands that would be executed:")
        logger.info(migration_sql)
        return True
    
    try:
        # Backup database first
        backup_path = f"{db_path}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        logger.info(f"Creating backup at: {backup_path}")
        
        import shutil
        shutil.copy2(db_path, backup_path)
        
        # Apply migration
        logger.info(f"Applying migration to database: {db_path}")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Execute migration SQL
        cursor.executescript(migration_sql)
        conn.close()
        
        logger.info("Migration completed successfully!")
        logger.info(f"Database backup saved at: {backup_path}")
        
        return True
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        logger.error("Please restore from backup if needed")
        return False

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description="Apply SQE results cascade delete migration")
    parser.add_argument("--dry-run", action="store_true", help="Show SQL without executing")
    parser.add_argument("--db-path", help="Custom database path")
    
    args = parser.parse_args()
    
    # Get database path
    db_path = args.db_path or get_database_path()
    
    if not os.path.exists(db_path):
        logger.error(f"Database file not found: {db_path}")
        logger.error("Please specify correct database path with --db-path")
        sys.exit(1)
    
    logger.info(f"Using database: {db_path}")
    
    # Check if migration is needed
    if not check_migration_needed(db_path):
        logger.info("Migration not needed - foreign key constraint already properly configured")
        sys.exit(0)
    
    # Apply migration
    success = apply_migration(db_path, dry_run=args.dry_run)
    
    if success:
        if not args.dry_run:
            logger.info("Migration completed successfully!")
            logger.info("Model versions with SQE results can now be deleted properly")
        sys.exit(0)
    else:
        logger.error("Migration failed!")
        sys.exit(1)

if __name__ == "__main__":
    main() 