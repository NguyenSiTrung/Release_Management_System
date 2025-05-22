import sqlite3
import os
import logging
import sys

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database file path
DB_FILE = 'nmt_release_management.db'

def column_exists(conn, table_name, column_name):
    """
    Check if a column exists in a table
    """
    cursor = conn.cursor()
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = [column[1] for column in cursor.fetchall()]
    return column_name in columns

def migrate_database():
    """
    Add model file columns to model_versions table
    """
    if not os.path.exists(DB_FILE):
        logger.error(f"Database file {DB_FILE} not found")
        return False
    
    try:
        # Connect to SQLite database
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(model_versions)")
        columns = [column[1] for column in cursor.fetchall()]
        
        # Add new columns if they don't exist
        if "model_file_name" not in columns:
            logger.info("Adding model_file_name column")
            cursor.execute("ALTER TABLE model_versions ADD COLUMN model_file_name TEXT;")
            
        if "hparams_file_name" not in columns:
            logger.info("Adding hparams_file_name column")
            cursor.execute("ALTER TABLE model_versions ADD COLUMN hparams_file_name TEXT;")
            
        if "model_file_path_on_server" not in columns:
            logger.info("Adding model_file_path_on_server column")
            cursor.execute("ALTER TABLE model_versions ADD COLUMN model_file_path_on_server TEXT;")
            
        if "hparams_file_path_on_server" not in columns:
            logger.info("Adding hparams_file_path_on_server column")
            cursor.execute("ALTER TABLE model_versions ADD COLUMN hparams_file_path_on_server TEXT;")
        
        # Commit changes and close connection
        conn.commit()
        conn.close()
        
        logger.info("Database migration completed successfully")
        return True
    
    except Exception as e:
        logger.error(f"Error during migration: {e}")
        return False

def migrate_db():
    """
    Run all migration steps in order
    """
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Check if the database has already been migrated
    
    # Check evaluation_jobs table columns
    cursor.execute("PRAGMA table_info(evaluation_jobs)")
    eval_columns = [column[1] for column in cursor.fetchall()]
    
    # Add mode_type, sub_mode_type, and custom_params columns if they don't exist
    if 'mode_type' not in eval_columns:
        print("Adding mode_type column to evaluation_jobs table...")
        cursor.execute("ALTER TABLE evaluation_jobs ADD COLUMN mode_type TEXT")
    
    if 'sub_mode_type' not in eval_columns:
        print("Adding sub_mode_type column to evaluation_jobs table...")
        cursor.execute("ALTER TABLE evaluation_jobs ADD COLUMN sub_mode_type TEXT")
        
    if 'custom_params' not in eval_columns:
        print("Adding custom_params column to evaluation_jobs table...")
        cursor.execute("ALTER TABLE evaluation_jobs ADD COLUMN custom_params TEXT")
    
    # Check model_versions table columns
    cursor.execute("PRAGMA table_info(model_versions)")
    model_columns = [column[1] for column in cursor.fetchall()]
    
    # Add base model file columns if they don't exist
    if 'base_model_file_name' not in model_columns:
        print("Adding base_model_file_name column to model_versions table...")
        cursor.execute("ALTER TABLE model_versions ADD COLUMN base_model_file_name TEXT")
    
    if 'base_hparams_file_name' not in model_columns:
        print("Adding base_hparams_file_name column to model_versions table...")
        cursor.execute("ALTER TABLE model_versions ADD COLUMN base_hparams_file_name TEXT")
        
    if 'base_model_file_path_on_server' not in model_columns:
        print("Adding base_model_file_path_on_server column to model_versions table...")
        cursor.execute("ALTER TABLE model_versions ADD COLUMN base_model_file_path_on_server TEXT")
        
    if 'base_hparams_file_path_on_server' not in model_columns:
        print("Adding base_hparams_file_path_on_server column to model_versions table...")
        cursor.execute("ALTER TABLE model_versions ADD COLUMN base_hparams_file_path_on_server TEXT")
    
    # Add evaluation_model_type column to evaluation_jobs table if it doesn't exist
    if 'evaluation_model_type' not in eval_columns:
        print("Adding evaluation_model_type column to evaluation_jobs table...")
        cursor.execute("ALTER TABLE evaluation_jobs ADD COLUMN evaluation_model_type TEXT DEFAULT 'finetuned'")
    
    # Check testsets table columns
    cursor.execute("PRAGMA table_info(testsets)")
    testset_columns = [column[1] for column in cursor.fetchall()]
    
    # Add file upload fields to Testset table
    if 'source_file_name' not in testset_columns:
        print("Adding source_file_name column to testsets table...")
        cursor.execute("ALTER TABLE testsets ADD COLUMN source_file_name TEXT")
    
    if 'target_file_name' not in testset_columns:
        print("Adding target_file_name column to testsets table...")
        cursor.execute("ALTER TABLE testsets ADD COLUMN target_file_name TEXT")
        
    if 'source_file_path_on_server' not in testset_columns:
        print("Adding source_file_path_on_server column to testsets table...")
        cursor.execute("ALTER TABLE testsets ADD COLUMN source_file_path_on_server TEXT")
        
    if 'target_file_path_on_server' not in testset_columns:
        print("Adding target_file_path_on_server column to testsets table...")
        cursor.execute("ALTER TABLE testsets ADD COLUMN target_file_path_on_server TEXT")
        
    # For existing records, try to initialize file names from paths if they exist
    cursor.execute("SELECT testset_id, source_file_path, target_file_path FROM testsets WHERE source_file_path IS NOT NULL OR target_file_path IS NOT NULL")
    rows = cursor.fetchall()
    for row in rows:
        testset_id, source_path, target_path = row
        
        source_name = os.path.basename(source_path) if source_path else None
        target_name = os.path.basename(target_path) if target_path else None
        
        if source_name or target_name:
            cursor.execute(
                "UPDATE testsets SET source_file_name = ?, target_file_name = ? WHERE testset_id = ?",
                (source_name, target_name, testset_id)
            )
    
    # Commit changes and close connection
    conn.commit()
    conn.close()
    print("Database migration completed successfully.")

if __name__ == "__main__":
    # Check if the database file exists
    if not os.path.exists(DB_FILE):
        print(f"Error: Database file {DB_FILE} not found.")
        sys.exit(1)
    
    # Run migrations
    migrate_db() 