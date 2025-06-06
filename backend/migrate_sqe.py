#!/usr/bin/env python3
"""
Migration script to add SQE Results table to the NMT Release Management database.
This script creates the sqe_results table for Software Quality Engineering tracking.
"""

import sqlite3
import os
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database file path
DB_FILE = 'nmt_release_management.db'

def migrate_sqe_table():
    """
    Create the SQE Results table and indexes
    """
    if not os.path.exists(DB_FILE):
        logger.error(f"Database file {DB_FILE} not found")
        return False
    
    try:
        # Connect to SQLite database
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        # Check if sqe_results table already exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='sqe_results'")
        table_exists = cursor.fetchone() is not None
        
        if table_exists:
            logger.info("SQE Results table already exists, skipping migration")
            conn.close()
            return True
        
        logger.info("Creating SQE Results table...")
        
        # Create the sqe_results table
        cursor.execute("""
            CREATE TABLE sqe_results (
                sqe_result_id INTEGER PRIMARY KEY AUTOINCREMENT,
                version_id INTEGER NOT NULL,
                average_score REAL NOT NULL,
                total_test_cases INTEGER NOT NULL,
                test_cases_changed INTEGER DEFAULT 0,
                change_percentage REAL DEFAULT 0.0,
                has_one_point_case INTEGER DEFAULT 0,
                tested_by_user_id INTEGER,
                test_date DATE,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (version_id) REFERENCES model_versions (version_id),
                FOREIGN KEY (tested_by_user_id) REFERENCES users (user_id)
            )
        """)
        
        logger.info("Creating indexes for SQE Results table...")
        
        # Create indexes for better query performance
        cursor.execute("CREATE INDEX ix_sqe_results_version_id ON sqe_results (version_id)")
        cursor.execute("CREATE INDEX ix_sqe_results_average_score ON sqe_results (average_score)")
        cursor.execute("CREATE INDEX ix_sqe_results_has_one_point_case ON sqe_results (has_one_point_case)")
        cursor.execute("CREATE INDEX ix_sqe_results_test_date ON sqe_results (test_date)")
        
        # Commit changes and close connection
        conn.commit()
        conn.close()
        
        logger.info("✅ SQE Results table and indexes created successfully!")
        return True
    
    except Exception as e:
        logger.error(f"❌ Error during SQE migration: {e}")
        return False

def verify_table():
    """
    Verify that the SQE Results table was created successfully
    """
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        # Check if table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='sqe_results'")
        table_exists = cursor.fetchone() is not None
        
        if table_exists:
            # Get table structure
            cursor.execute("PRAGMA table_info(sqe_results)")
            columns = cursor.fetchall()
            
            logger.info("✅ SQE Results table verification:")
            logger.info(f"   - Table exists: {table_exists}")
            logger.info(f"   - Number of columns: {len(columns)}")
            
            print("\nTable structure:")
            for col in columns:
                print(f"  - {col[1]} {col[2]} {'NOT NULL' if col[3] else 'NULL'}")
            
            # Check indexes
            cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='sqe_results'")
            indexes = cursor.fetchall()
            print(f"\nIndexes created: {len(indexes)}")
            for idx in indexes:
                print(f"  - {idx[0]}")
        else:
            logger.error("❌ SQE Results table was not created")
        
        conn.close()
        return table_exists
        
    except Exception as e:
        logger.error(f"❌ Error during verification: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Starting SQE Results table migration...")
    
    # Check if the database file exists
    if not os.path.exists(DB_FILE):
        print(f"❌ Error: Database file {DB_FILE} not found.")
        exit(1)
    
    # Run SQE migration
    success = migrate_sqe_table()
    
    if success:
        print("\n🔍 Verifying migration...")
        verify_table()
        print("\n✅ SQE Results migration completed successfully!")
    else:
        print("❌ SQE Results migration failed!")
        exit(1) 