from app.db.database import SessionLocal
from app.schemas.testset import TestsetCreate
from app.crud.crud_testset import create_testset, get_testsets
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create a database session
db = SessionLocal()

try:
    # First get the first valid language pair ID from the database
    from app.db.models import LanguagePair
    lang_pair = db.query(LanguagePair).first()
    
    if not lang_pair:
        logger.error("No language pairs found in database")
        exit(1)
    
    lang_pair_id = lang_pair.lang_pair_id
    logger.info(f"Found language pair ID: {lang_pair_id}")
    
    # Get existing testsets to check for duplicate names
    existing_testsets = get_testsets(db)
    logger.info(f"Found {len(existing_testsets)} existing testsets")
    
    for ts in existing_testsets:
        logger.info(f"Existing testset: {ts.testset_id}, {ts.testset_name}, lang_pair_id={ts.lang_pair_id}")
    
    # Try to create a testset with same name as an existing one if any exist
    testset_name = "Test Duplicate Testset"
    if existing_testsets:
        testset_name = existing_testsets[0].testset_name
        logger.info(f"Attempting to create a testset with duplicate name: {testset_name}")
    else:
        logger.info(f"Attempting to create a new testset: {testset_name}")
    
    test_data = TestsetCreate(
        lang_pair_id=lang_pair_id,
        testset_name=testset_name
    )
    
    create_testset(db, test_data)
    logger.info("Testset created successfully")
    
except IntegrityError as e:
    logger.error(f"IntegrityError: {e}")
    logger.info("This is likely due to a unique constraint violation - the testset name may already exist")
    
except SQLAlchemyError as e:
    logger.error(f"SQLAlchemyError: {e}")
    
except Exception as e:
    logger.error(f"Unexpected error: {e}")
    
finally:
    db.close() 