#!/usr/bin/env python3
"""
Migration script to update evaluation_jobs table with missing columns.
Adds base model results columns and timestamp columns.
"""

import sqlite3
import os
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database file path
DB_FILE = 'nmt_release_management.db'

def migrate_evaluation_jobs_table():
    """
    Add missing columns to evaluation_jobs table
    """
    if not os.path.exists(DB_FILE):
        logger.error(f"Database file {DB_FILE} not found")
        return False
    
    try:
        # Connect to SQLite database
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        # Check current table structure
        cursor.execute("PRAGMA table_info(evaluation_jobs)")
        existing_columns = [row[1] for row in cursor.fetchall()]
        logger.info(f"Existing columns: {existing_columns}")
        
        # List of columns to add with their definitions
        columns_to_add = [
            ("base_model_bleu_score", "REAL"),
            ("base_model_comet_score", "REAL"),
            ("base_model_output_file_path", "TEXT"),
            ("created_at", "TEXT"),
            ("updated_at", "TEXT")
        ]
        
        # Add missing columns
        columns_added = []
        for column_name, column_type in columns_to_add:
            if column_name not in existing_columns:
                try:
                    cursor.execute(f"ALTER TABLE evaluation_jobs ADD COLUMN {column_name} {column_type}")
                    columns_added.append(column_name)
                    logger.info(f"Added column: {column_name}")
                except sqlite3.Error as e:
                    logger.error(f"Error adding column {column_name}: {e}")
        
        if columns_added:
            # Update existing records with default timestamp values for new timestamp columns
            if "created_at" in columns_added or "updated_at" in columns_added:
                cursor.execute("""
                    UPDATE evaluation_jobs 
                    SET created_at = requested_at, 
                        updated_at = COALESCE(completed_at, processing_started_at, requested_at)
                    WHERE created_at IS NULL OR updated_at IS NULL
                """)
                logger.info("Updated existing records with timestamp defaults")
            
            # Commit changes
            conn.commit()
            logger.info(f"Successfully added {len(columns_added)} columns to evaluation_jobs table")
        else:
            logger.info("All required columns already exist in evaluation_jobs table")
        
        # Verify the table structure
        cursor.execute("PRAGMA table_info(evaluation_jobs)")
        updated_columns = [row[1] for row in cursor.fetchall()]
        logger.info(f"Updated table structure: {len(updated_columns)} columns")
        
        conn.close()
        return True
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        return False

if __name__ == "__main__":
    logger.info("Starting evaluation_jobs table migration...")
    
    if migrate_evaluation_jobs_table():
        logger.info("✅ Migration completed successfully!")
    else:
        logger.error("❌ Migration failed!")
        exit(1) 