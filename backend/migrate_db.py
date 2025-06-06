import sqlite3
import os
import logging
import sys
from sqlalchemy import create_engine, text
from app.core.config import settings

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
    
    # Add base_model_result column to evaluation_jobs table if it doesn't exist
    if 'base_model_result' not in eval_columns:
        print("Adding base_model_result column to evaluation_jobs table...")
        cursor.execute("ALTER TABLE evaluation_jobs ADD COLUMN base_model_result TEXT")
    
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

def migration_1(engine):
    """
    Migration 1: Add model file columns to model_versions table
    """
    logger.info("Running migration 1: Add model file columns")
    
    try:
        # Check if columns already exist
        result = engine.execute(text("PRAGMA table_info(model_versions)"))
        columns = [row[1] for row in result]
        
        # Add new columns if they don't exist
        if "model_file_name" not in columns:
            logger.info("Adding model_file_name column")
            engine.execute(text("ALTER TABLE model_versions ADD COLUMN model_file_name TEXT"))
            
        if "hparams_file_name" not in columns:
            logger.info("Adding hparams_file_name column")
            engine.execute(text("ALTER TABLE model_versions ADD COLUMN hparams_file_name TEXT"))
            
        if "model_file_path_on_server" not in columns:
            logger.info("Adding model_file_path_on_server column")
            engine.execute(text("ALTER TABLE model_versions ADD COLUMN model_file_path_on_server TEXT"))
            
        if "hparams_file_path_on_server" not in columns:
            logger.info("Adding hparams_file_path_on_server column")
            engine.execute(text("ALTER TABLE model_versions ADD COLUMN hparams_file_path_on_server TEXT"))
        
        logger.info("Migration 1 completed successfully")
            
    except Exception as e:
        logger.error(f"Error in migration 1: {str(e)}")
        raise

def migration_2(engine):
    """
    Migration 2: Add mode_type, sub_mode_type, and custom_params columns to evaluation_jobs
    """
    logger.info("Running migration 2: Add evaluation job columns")
    
    try:
        result = engine.execute(text("PRAGMA table_info(evaluation_jobs)"))
        eval_columns = [row[1] for row in result]
        
        # Add mode_type, sub_mode_type, and custom_params columns if they don't exist
        if 'mode_type' not in eval_columns:
            logger.info("Adding mode_type column to evaluation_jobs table")
            engine.execute(text("ALTER TABLE evaluation_jobs ADD COLUMN mode_type TEXT"))
        
        if 'sub_mode_type' not in eval_columns:
            logger.info("Adding sub_mode_type column to evaluation_jobs table")
            engine.execute(text("ALTER TABLE evaluation_jobs ADD COLUMN sub_mode_type TEXT"))
            
        if 'custom_params' not in eval_columns:
            logger.info("Adding custom_params column to evaluation_jobs table")
            engine.execute(text("ALTER TABLE evaluation_jobs ADD COLUMN custom_params TEXT"))
        
        logger.info("Migration 2 completed successfully")
            
    except Exception as e:
        logger.error(f"Error in migration 2: {str(e)}")
        raise

def migration_3(engine):
    """
    Migration 3: Add base model file columns to model_versions
    """
    logger.info("Running migration 3: Add base model file columns")
    
    try:
        result = engine.execute(text("PRAGMA table_info(model_versions)"))
        model_columns = [row[1] for row in result]
        
        # Add base model file columns if they don't exist
        if 'base_model_file_name' not in model_columns:
            logger.info("Adding base_model_file_name column to model_versions table")
            engine.execute(text("ALTER TABLE model_versions ADD COLUMN base_model_file_name TEXT"))
        
        if 'base_hparams_file_name' not in model_columns:
            logger.info("Adding base_hparams_file_name column to model_versions table")
            engine.execute(text("ALTER TABLE model_versions ADD COLUMN base_hparams_file_name TEXT"))
            
        if 'base_model_file_path_on_server' not in model_columns:
            logger.info("Adding base_model_file_path_on_server column to model_versions table")
            engine.execute(text("ALTER TABLE model_versions ADD COLUMN base_model_file_path_on_server TEXT"))
            
        if 'base_hparams_file_path_on_server' not in model_columns:
            logger.info("Adding base_hparams_file_path_on_server column to model_versions table")
            engine.execute(text("ALTER TABLE model_versions ADD COLUMN base_hparams_file_path_on_server TEXT"))
        
        logger.info("Migration 3 completed successfully")
            
    except Exception as e:
        logger.error(f"Error in migration 3: {str(e)}")
        raise

def migration_4(engine):
    """
    Migration 4: Add evaluation_model_type column to evaluation_jobs
    """
    logger.info("Running migration 4: Add evaluation_model_type column")
    
    try:
        result = engine.execute(text("PRAGMA table_info(evaluation_jobs)"))
        eval_columns = [row[1] for row in result]
        
        # Add evaluation_model_type column to evaluation_jobs table if it doesn't exist
        if 'evaluation_model_type' not in eval_columns:
            logger.info("Adding evaluation_model_type column to evaluation_jobs table")
            engine.execute(text("ALTER TABLE evaluation_jobs ADD COLUMN evaluation_model_type TEXT DEFAULT 'finetuned'"))
        
        logger.info("Migration 4 completed successfully")
            
    except Exception as e:
        logger.error(f"Error in migration 4: {str(e)}")
        raise

def migration_5(engine):
    """
    Migration 5: Add file upload fields to testsets table
    """
    logger.info("Running migration 5: Add testset file upload fields")
    
    try:
        result = engine.execute(text("PRAGMA table_info(testsets)"))
        testset_columns = [row[1] for row in result]
        
        # Add file upload fields to Testset table
        if 'source_file_name' not in testset_columns:
            logger.info("Adding source_file_name column to testsets table")
            engine.execute(text("ALTER TABLE testsets ADD COLUMN source_file_name TEXT"))
        
        if 'target_file_name' not in testset_columns:
            logger.info("Adding target_file_name column to testsets table")
            engine.execute(text("ALTER TABLE testsets ADD COLUMN target_file_name TEXT"))
            
        if 'source_file_path_on_server' not in testset_columns:
            logger.info("Adding source_file_path_on_server column to testsets table")
            engine.execute(text("ALTER TABLE testsets ADD COLUMN source_file_path_on_server TEXT"))
            
        if 'target_file_path_on_server' not in testset_columns:
            logger.info("Adding target_file_path_on_server column to testsets table")
            engine.execute(text("ALTER TABLE testsets ADD COLUMN target_file_path_on_server TEXT"))
        
        logger.info("Migration 5 completed successfully")
            
    except Exception as e:
        logger.error(f"Error in migration 5: {str(e)}")
        raise

def migration_6(engine):
    """
    Migration 6: Add base_model_result field to evaluation_jobs table
    """
    logger.info("Running migration 6: Add base_model_result field to evaluation_jobs table")
    
    try:
        # Check if base_model_result column exists
        result = engine.execute(text("PRAGMA table_info(evaluation_jobs)"))
        columns = [row[1] for row in result]
        
        if 'base_model_result' not in columns:
            logger.info("Adding base_model_result column to evaluation_jobs table")
            engine.execute(text("""
                ALTER TABLE evaluation_jobs 
                ADD COLUMN base_model_result TEXT NULL
            """))
            logger.info("Successfully added base_model_result column")
        else:
            logger.info("base_model_result column already exists, skipping")
            
    except Exception as e:
        logger.error(f"Error in migration 6: {str(e)}")
        raise
    
    logger.info("Migration 6 completed successfully")

def migration_7(engine):
    """
    Migration 7: Add SQE Results table for Software Quality Engineering tracking
    """
    logger.info("Running migration 7: Add SQE Results table")
    
    try:
        # Check if sqe_results table exists
        result = engine.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='sqe_results'"))
        table_exists = result.fetchone() is not None
        
        if not table_exists:
            logger.info("Creating sqe_results table")
            
            # Create the sqe_results table
            engine.execute(text("""
                CREATE TABLE sqe_results (
                    sqe_result_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    version_id INTEGER NOT NULL,
                    average_score REAL NOT NULL,
                    total_test_cases INTEGER NOT NULL,
                    test_cases_changed BOOLEAN DEFAULT FALSE,
                    change_percentage REAL DEFAULT 0.0,
                    has_one_point_case BOOLEAN DEFAULT FALSE,
                    tested_by_user_id INTEGER,
                    test_date DATE,
                    notes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (version_id) REFERENCES model_versions (version_id),
                    FOREIGN KEY (tested_by_user_id) REFERENCES users (user_id)
                )
            """))
            
            # Create indexes for better query performance
            logger.info("Creating indexes for sqe_results table")
            engine.execute(text("CREATE INDEX ix_sqe_results_version_id ON sqe_results (version_id)"))
            engine.execute(text("CREATE INDEX ix_sqe_results_average_score ON sqe_results (average_score)"))
            engine.execute(text("CREATE INDEX ix_sqe_results_has_one_point_case ON sqe_results (has_one_point_case)"))
            engine.execute(text("CREATE INDEX ix_sqe_results_test_date ON sqe_results (test_date)"))
            
            logger.info("Successfully created sqe_results table and indexes")
        else:
            logger.info("sqe_results table already exists, skipping")
            
    except Exception as e:
        logger.error(f"Error in migration 7: {str(e)}")
        raise
    
    logger.info("Migration 7 completed successfully")

def run_migrations():
    """
    Run all database migrations
    """
    logger.info("Starting database migrations...")
    
    engine = create_engine(settings.DATABASE_URL)
    
    # Run migrations in order
    migration_1(engine)
    migration_2(engine)
    migration_3(engine)
    migration_4(engine)
    migration_5(engine)
    migration_6(engine)
    migration_7(engine)  # SQE Results table migration
    
    logger.info("All migrations completed successfully!")

if __name__ == "__main__":
    # Check if the database file exists
    if not os.path.exists(DB_FILE):
        print(f"Error: Database file {DB_FILE} not found.")
        sys.exit(1)
    
    # Run migrations
    migrate_db() 