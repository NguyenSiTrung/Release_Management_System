import os
import shutil
import subprocess
import yaml
import time
import random
from typing import Optional, Dict, Any, Tuple, List
from datetime import datetime
import logging
from pathlib import Path
import tempfile
import json
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.database import SessionLocal, get_db
from app.schemas.evaluation import EvaluationStatus
from app.crud import crud_evaluation, crud_model_version, crud_training_result, crud_testset, crud_language_pair
from app.db.models import ModelVersion, Testset, LanguagePair, TrainingResult, EvaluationJob
from app.schemas.training_result import TrainingResultCreate

logger = logging.getLogger(__name__)

def fake_create_translation_output(source_file: str, output_path: str, num_lines: Optional[int] = None) -> None:
    """
    Create a fake translation output file for testing purposes
    """
    logger.info(f"[FAKE MODE] Creating fake translation output: {output_path}")
    
    # Read the source file to get the number of lines
    if num_lines is None:
        with open(source_file, 'r', encoding='utf-8') as f:
            source_lines = f.readlines()
        num_lines = len(source_lines)
    
    # Create fake output content - Thai text repeated for each line
    fake_translation ="""This is a sample English text for testing.
This is a sample English text for testing 2.
This is a sample English text for testing 3.
This is a sample English text for testing 4.
This is a sample English text for testing 5.
This is a sample English text for testing 6.
This is a sample English text for testing 7.
This is a sample English text for testing 8.
This is a sample English text for testing 9.
This is a sample English text for testing 10.
This is a sample English text for testing 11.
This is a sample English text for testing 12.
This is a sample English text for testing 13.
This is a sample English text for testing 14.
This is a sample English text for testing 15.
This is a sample English text for testing 16.
This is a sample English text for testing 17.
This is a sample English text for testing 18.
This is a sample English text for testing 19.
This is a sample English text for testing 20.
This is a sample English text for testing 21.
This is a sample English text for testing 22.
This is a sample English text for testing 23.
This is a sample English text for testing 24.
"""
    # Create the output directory if it doesn't exist
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Write fake content to output file
    with open(output_path, 'w', encoding='utf-8') as f:
        for i in range(num_lines):
            f.write(f"{fake_translation}\n")
    
    logger.info(f"[FAKE MODE] Created fake output file with {num_lines} lines: {output_path}")

def fake_calculate_metrics(output_file: str, reference_file: str, source_file: str) -> Tuple[float, float]:
    """
    Calculate fake BLEU and COMET scores for testing purposes
    """
    logger.info(f"[FAKE MODE] Calculating fake metrics")
    
    # Generate reasonable fake scores
    fake_bleu = round(random.uniform(15.0, 35.0), 2)  # BLEU typically 15-35 for MT
    fake_comet = round(random.uniform(0.6, 0.85), 4)  # COMET typically 0.6-0.85
    
    logger.info(f"[FAKE MODE] Generated fake BLEU: {fake_bleu}, COMET: {fake_comet}")
    return fake_bleu, fake_comet

def fake_perform_model_evaluation(
    source_file: str,
    target_file: str,
    model_file: str,
    hparams_file: str,
    output_path: str,
    source_lang: str,
    target_lang: str,
    mode_type: Optional[str] = None,
    sub_mode_type: Optional[str] = None,
    custom_params: Optional[str] = None,
    job_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    Fake model evaluation for testing purposes
    """
    logger.info(f"[FAKE MODE] Performing fake model evaluation for job_id: {job_id}")
    logger.info(f"[FAKE MODE] Source: {source_file}, Target: {target_file}")
    logger.info(f"[FAKE MODE] Model: {model_file}, HParams: {hparams_file}")
    logger.info(f"[FAKE MODE] Output: {output_path}")
    logger.info(f"[FAKE MODE] Mode: {mode_type}, SubMode: {sub_mode_type}")
    
    # Simulate processing time
    time.sleep(2)
    
    # Create fake translation output
    fake_create_translation_output(source_file, output_path)
    
    # Calculate fake metrics
    fake_bleu, fake_comet = fake_calculate_metrics(output_path, target_file, source_file)
    
    logger.info(f"[FAKE MODE] Fake evaluation completed for job {job_id}")
    return {
        "bleu_score": fake_bleu,
        "comet_score": fake_comet,
        "output_path": output_path
    }

def fake_translate_text(
    source_text: str,
    model_file_path: str,
    hparams_file_path: str,
    mode_type: Optional[str] = None,
    sub_mode_type: Optional[str] = None,
    custom_params: Optional[str] = None
) -> str:
    """
    Fake text translation for testing purposes
    """
    logger.info(f"[FAKE MODE] Performing fake text translation")
    logger.info(f"[FAKE MODE] Source text length: {len(source_text)} chars")    
    logger.info(f"[FAKE MODE] Model: {model_file_path}")
    logger.info(f"[FAKE MODE] Mode: {mode_type}, SubMode: {sub_mode_type}")
    
    # Simulate processing time
    time.sleep(1)
    
    # Return fake translation
        # Create fake output content - Thai text repeated for each line
    fake_translation ="""This is a sample English text for testing.
This is a sample English text for testing 2.
This is a sample English text for testing 3.
This is a sample English text for testing 4.
This is a sample English text for testing 5.
This is a sample English text for testing 6.
This is a sample English text for testing 7.
This is a sample English text for testing 8.
This is a sample English text for testing 9.
This is a sample English text for testing 10.
This is a sample English text for testing 11.
This is a sample English text for testing 12.
This is a sample English text for testing 13.
This is a sample English text for testing 14.
This is a sample English text for testing 15.
This is a sample English text for testing 16.
This is a sample English text for testing 17.
This is a sample English text for testing 18.
This is a sample English text for testing 19.
This is a sample English text for testing 20.
This is a sample English text for testing 21.
This is a sample English text for testing 22.
This is a sample English text for testing 23.
This is a sample English text for testing 24.
"""
    
    # If source text has multiple lines, repeat fake translation for each line
    source_lines = source_text.strip().split('\n')
    if len(source_lines) > 1:
        fake_translation = '\n'.join([fake_translation] * len(source_lines))
    
    logger.info(f"[FAKE MODE] Fake translation completed")
    return fake_translation

def construct_evaluation_docker_command(base_command_args: List[str], selected_mode: Optional[str] = None, sub_mode_type: Optional[str] = None, custom_params: Optional[str] = None) -> List[str]:
    """
    Constructs the final Docker command for model evaluation by adding mode-specific parameters.
    
    Args:
        base_command_args (list): Base Docker command as a list of strings
        selected_mode (str, optional): The mode type selected by the user
        sub_mode_type (str, optional): Sub-mode type for Samsung modes ("plain" or "tagged")
        custom_params (str, optional): Custom parameters provided by the user
        
    Returns:
        list: The final Docker command with all necessary parameters
    """
    final_command = base_command_args.copy()
    
    # Handle custom parameters if provided
    if custom_params:
        # Parse the custom parameters string into a list and add to command
        custom_args = custom_params.split()
        final_command.extend(custom_args)
        return final_command
    
    # Handle different mode types and their parameters
    if selected_mode == "Interpreter Listening Mode":
        final_command.extend(["--tm-on", "-nsp", "-f", "-m", "contextual"])
    
    elif selected_mode == "Interpreter Conversation Mode":
        final_command.extend(["--tm-on", "-nsp", "-f", "-m", "plain"])
    
    elif selected_mode == "Keyboard, Voice Recorder Mode":
        final_command.extend(["--tm-on", "-m", "plain"])
    
    elif selected_mode == "Samsung Note Mode":
        if sub_mode_type == "tagged":
            final_command.extend(["--tm-on", "-nsp", "-f", "-m", "tagged"])
        else:  # Default to "plain" if sub_mode_type is None or any other value
            final_command.extend(["--tm-on", "-nsp", "-f", "-m", "plain"])
    
    elif selected_mode == "Samsung Internet Mode":
        if sub_mode_type == "tagged":
            final_command.extend(["--tm-on", "-m", "tagged"])
        else:  # Default to "plain" if sub_mode_type is None or any other value
            final_command.extend(["--tm-on", "-m", "plain"])
    
    return final_command

def determine_langpack_folder(source_code: str, target_code: str) -> Optional[str]:
    """
    Determine the language pack folder name based on source and target language codes
    """
    source_code = source_code.lower()
    target_code = target_code.lower()
    
    # Check common combinations
    if source_code == "en" and target_code == "th":
        return "enth"
    elif source_code == "th" and target_code == "en":
        return "then"
    elif source_code == "en" and target_code == "vi":
        return "envi"
    elif source_code == "vi" and target_code == "en":
        return "vien"
    elif source_code == "ko" and target_code == "vi":
        return "kovi"
    elif source_code == "vi" and target_code == "ko":
        return "viko"
    
    # Format as source+target if not in the predefined list
    return f"{source_code}{target_code}"

def create_temp_directory(job_id: int) -> str:
    """Create a temporary directory for evaluation output"""
    temp_dir = os.path.join(settings.DOCKER_VOLUME_TMP_PATH_HOST, "evaluation_temp", f"evaluation_{job_id}")
    os.makedirs(temp_dir, exist_ok=True)
    return temp_dir

def calculate_bleu_score(output_file: str, reference_file: str) -> float:
    """
    Calculate BLEU score using sacrebleu
    
    Args:
        output_file: Path to the system output file
        reference_file: Path to the reference file
    
    Returns:
        float: BLEU score
    """
    try:
        # Verify files exist before calculation
        if not os.path.exists(output_file):
            logger.error(f"BLEU calculation error: Output file does not exist: {output_file}")
            return 0.0
        
        if not os.path.exists(reference_file):
            logger.error(f"BLEU calculation error: Reference file does not exist: {reference_file}")
            return 0.0
            
        # Check if files are not empty
        if os.path.getsize(output_file) == 0:
            logger.error(f"BLEU calculation error: Output file is empty: {output_file}")
            return 0.0
            
        if os.path.getsize(reference_file) == 0:
            logger.error(f"BLEU calculation error: Reference file is empty: {reference_file}")
            return 0.0
        
        # Log file information
        logger.info(f"BLEU calculation - Output file: {output_file} (Size: {os.path.getsize(output_file)} bytes)")
        logger.info(f"BLEU calculation - Reference file: {reference_file} (Size: {os.path.getsize(reference_file)} bytes)")
        
        # Using sacrebleu through subprocess
        logger.info("Running sacrebleu command...")
        cmd = ["sacrebleu", reference_file, "-i", output_file, "-b"]
        logger.info(f"BLEU command: {' '.join(cmd)}")
        
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        # Extract BLEU score from output
        bleu_score = float(result.stdout.strip())
        logger.info(f"BLEU score calculation successful: {bleu_score}")
        return bleu_score
    except subprocess.CalledProcessError as e:
        logger.error(f"Error calculating BLEU score - Command failed: {str(e)}")
        logger.error(f"Command stderr: {e.stderr}")
        return 0.0
    except ValueError as e:
        logger.error(f"Error calculating BLEU score - Could not parse score: {str(e)}")
        return 0.0
    except Exception as e:
        logger.error(f"Error calculating BLEU score: {str(e)}")
        return 0.0

def calculate_comet_score(output_file: str, source_file: str, reference_file: str) -> float:
    """
    Calculate COMET score using unbabel-comet
    
    Args:
        output_file: Path to the system output file
        source_file: Path to the source file
        reference_file: Path to the reference file
    
    Returns:
        float: COMET score
    """
    try:
        # Verify files exist before calculation
        if not os.path.exists(output_file):
            logger.error(f"COMET calculation error: Output file does not exist: {output_file}")
            return 0.0
            
        if not os.path.exists(source_file):
            logger.error(f"COMET calculation error: Source file does not exist: {source_file}")
            return 0.0
        
        if not os.path.exists(reference_file):
            logger.error(f"COMET calculation error: Reference file does not exist: {reference_file}")
            return 0.0
            
        # Check if files are not empty
        if os.path.getsize(output_file) == 0:
            logger.error(f"COMET calculation error: Output file is empty: {output_file}")
            return 0.0
            
        if os.path.getsize(source_file) == 0:
            logger.error(f"COMET calculation error: Source file is empty: {source_file}")
            return 0.0
            
        if os.path.getsize(reference_file) == 0:
            logger.error(f"COMET calculation error: Reference file is empty: {reference_file}")
            return 0.0
        
        # Log file information
        logger.info(f"COMET calculation - Source file: {source_file} (Size: {os.path.getsize(source_file)} bytes)")
        logger.info(f"COMET calculation - Reference file: {reference_file} (Size: {os.path.getsize(reference_file)} bytes)")
        logger.info(f"COMET calculation - Output file: {output_file} (Size: {os.path.getsize(output_file)} bytes)")
        
        # Using comet through subprocess
        logger.info("Running comet-score command...")
        cmd = [
            "comet-score", 
            "-s", source_file, 
            "-t", output_file, 
            "-r", reference_file
        ]
        logger.info(f"COMET command: {' '.join(cmd)}")
        
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        # Extract COMET score from output (format depends on the comet implementation)
        # This is a simplification - adapt based on actual output format
        logger.info(f"COMET result output: {result.stdout}")
        comet_score = None
        for line in result.stdout.strip().split('\n'):
            if "score:" in line:
                comet_score = float(line.split("score:")[1].strip())
                logger.info(f"COMET score extracted: {comet_score}")
                return comet_score
        
        if comet_score is None:
            logger.error("Failed to extract COMET score from output")
            return 0.0
        
        return 0.0
    except subprocess.CalledProcessError as e:
        logger.error(f"Error calculating COMET score - Command failed: {str(e)}")
        logger.error(f"Command stderr: {e.stderr}")
        return 0.0
    except ValueError as e:
        logger.error(f"Error calculating COMET score - Could not parse score: {str(e)}")
        return 0.0
    except Exception as e:
        logger.error(f"Error calculating COMET score: {str(e)}")
        return 0.0

def run_evaluation(job_id: int) -> None:
    """
    Run the evaluation process for a specific job
    """
    # Get a database session
    db = next(get_db())
    logger.info(f"=== Starting evaluation process for job_id: {job_id} ===")
    try:
        # Get the evaluation job with relationships
        job = crud_evaluation.get(db=db, job_id=job_id)
        if not job:
            logger.error(f"Error: Job {job_id} not found")
            print(f"Error: Job {job_id} not found")
            return

        # Update job status
        logger.info(f"Job {job_id}: Changing status from {job.status} to {EvaluationStatus.PREPARING_SETUP}")
        job = crud_evaluation.update_status(
            db=db,
            job_id=job_id,
            status=EvaluationStatus.PREPARING_SETUP,
            processing_started_at=datetime.now()
        )
        
        # Get model version and testset
        logger.info(f"Job {job_id}: Getting model version {job.version_id} and testset {job.testset_id}")
        model_version = crud_model_version.get(db=db, version_id=job.version_id)
        testset = crud_testset.get_testset(db=db, testset_id=job.testset_id)
        if not model_version or not testset:
            error_msg = f"Error: Model version {job.version_id} or testset {job.testset_id} not found"
            logger.error(f"Job {job_id}: {error_msg}")
            update_job_failed(db=db, job=job, error=error_msg)
            return
        
        # Get language pair for source/target language codes
        logger.info(f"Job {job_id}: Getting language pair {model_version.lang_pair_id}")
        language_pair = crud_language_pair.get_language_pair(db=db, lang_pair_id=model_version.lang_pair_id)
        if not language_pair:
            error_msg = f"Error: Language pair {model_version.lang_pair_id} not found"
            logger.error(f"Job {job_id}: {error_msg}")
            update_job_failed(db=db, job=job, error=error_msg)
            return
        
        # Verify paths
        evaluation_model_type = job.evaluation_model_type or "finetuned"
        logger.info(f"Job {job_id}: Evaluation model type: {evaluation_model_type}")
        
        if evaluation_model_type == "both" or evaluation_model_type == "finetuned":
            logger.info(f"Job {job_id}: Verifying finetuned model files")
            if not model_version.model_file_path_on_server:
                error_msg = "Error: Model file path is not set in database"
                logger.error(f"Job {job_id}: {error_msg}")
                update_job_failed(db=db, job=job, error=error_msg)
                return
            if not os.path.exists(model_version.model_file_path_on_server):
                error_msg = "Error: Model file not found or path invalid"
                logger.error(f"Job {job_id}: {error_msg} - Path: {model_version.model_file_path_on_server}")
                logger.error(f"Job {job_id}: Checking directory existence: {os.path.dirname(model_version.model_file_path_on_server)} - Exists: {os.path.exists(os.path.dirname(model_version.model_file_path_on_server))}")
                if os.path.exists(os.path.dirname(model_version.model_file_path_on_server)):
                    logger.error(f"Job {job_id}: Directory exists but file not found. Directory contents: {os.listdir(os.path.dirname(model_version.model_file_path_on_server))}")
                update_job_failed(db=db, job=job, error=error_msg)
                return
            else:
                logger.info(f"Job {job_id}: Found model file: {model_version.model_file_path_on_server} (Size: {os.path.getsize(model_version.model_file_path_on_server)} bytes)")
                
            if not model_version.hparams_file_path_on_server:
                error_msg = "Error: HParams file path is not set in database"
                logger.error(f"Job {job_id}: {error_msg}")
                update_job_failed(db=db, job=job, error=error_msg)
                return
            if not os.path.exists(model_version.hparams_file_path_on_server):
                error_msg = "Error: HParams file not found or path invalid"
                logger.error(f"Job {job_id}: {error_msg} - Path: {model_version.hparams_file_path_on_server}")
                logger.error(f"Job {job_id}: Checking directory existence: {os.path.dirname(model_version.hparams_file_path_on_server)} - Exists: {os.path.exists(os.path.dirname(model_version.hparams_file_path_on_server))}")
                if os.path.exists(os.path.dirname(model_version.hparams_file_path_on_server)):
                    logger.error(f"Job {job_id}: Directory exists but file not found. Directory contents: {os.listdir(os.path.dirname(model_version.hparams_file_path_on_server))}")
                update_job_failed(db=db, job=job, error=error_msg)
                return
            else:
                logger.info(f"Job {job_id}: Found hparams file: {model_version.hparams_file_path_on_server} (Size: {os.path.getsize(model_version.hparams_file_path_on_server)} bytes)")
                
        if evaluation_model_type == "both" or evaluation_model_type == "base":
            logger.info(f"Job {job_id}: Verifying base model files")
            if not model_version.base_model_file_path_on_server:
                error_msg = "Error: Base model file path is not set in database"
                logger.error(f"Job {job_id}: {error_msg}")
                update_job_failed(db=db, job=job, error=error_msg)
                return
            if not os.path.exists(model_version.base_model_file_path_on_server):
                error_msg = "Error: Base model file not found or path invalid"
                logger.error(f"Job {job_id}: {error_msg} - Path: {model_version.base_model_file_path_on_server}")
                logger.error(f"Job {job_id}: Checking directory existence: {os.path.dirname(model_version.base_model_file_path_on_server)} - Exists: {os.path.exists(os.path.dirname(model_version.base_model_file_path_on_server))}")
                if os.path.exists(os.path.dirname(model_version.base_model_file_path_on_server)):
                    logger.error(f"Job {job_id}: Directory exists but file not found. Directory contents: {os.listdir(os.path.dirname(model_version.base_model_file_path_on_server))}")
                update_job_failed(db=db, job=job, error=error_msg)
                return
            else:
                logger.info(f"Job {job_id}: Found base model file: {model_version.base_model_file_path_on_server} (Size: {os.path.getsize(model_version.base_model_file_path_on_server)} bytes)")
                
            if not model_version.base_hparams_file_path_on_server:
                error_msg = "Error: Base HParams file path is not set in database"
                logger.error(f"Job {job_id}: {error_msg}")
                update_job_failed(db=db, job=job, error=error_msg)
                return
            if not os.path.exists(model_version.base_hparams_file_path_on_server):
                error_msg = "Error: Base HParams file not found or path invalid"
                logger.error(f"Job {job_id}: {error_msg} - Path: {model_version.base_hparams_file_path_on_server}")
                logger.error(f"Job {job_id}: Checking directory existence: {os.path.dirname(model_version.base_hparams_file_path_on_server)} - Exists: {os.path.exists(os.path.dirname(model_version.base_hparams_file_path_on_server))}")
                if os.path.exists(os.path.dirname(model_version.base_hparams_file_path_on_server)):
                    logger.error(f"Job {job_id}: Directory exists but file not found. Directory contents: {os.listdir(os.path.dirname(model_version.base_hparams_file_path_on_server))}")
                update_job_failed(db=db, job=job, error=error_msg)
                return
            else:
                logger.info(f"Job {job_id}: Found base hparams file: {model_version.base_hparams_file_path_on_server} (Size: {os.path.getsize(model_version.base_hparams_file_path_on_server)} bytes)")

        logger.info(f"Job {job_id}: Verifying testset files")
        if not testset.source_file_path_on_server:
            error_msg = "Error: Testset source file path is not set in database"
            logger.error(f"Job {job_id}: {error_msg}")
            update_job_failed(db=db, job=job, error=error_msg)
            return
        if not os.path.exists(testset.source_file_path_on_server):
            error_msg = "Error: Testset source file not found or path invalid"
            logger.error(f"Job {job_id}: {error_msg} - Path: {testset.source_file_path_on_server}")
            logger.error(f"Job {job_id}: Checking directory existence: {os.path.dirname(testset.source_file_path_on_server)} - Exists: {os.path.exists(os.path.dirname(testset.source_file_path_on_server))}")
            if os.path.exists(os.path.dirname(testset.source_file_path_on_server)):
                logger.error(f"Job {job_id}: Directory exists but file not found. Directory contents: {os.listdir(os.path.dirname(testset.source_file_path_on_server))}")
            update_job_failed(db=db, job=job, error=error_msg)
            return
        else:
            logger.info(f"Job {job_id}: Found testset source file: {testset.source_file_path_on_server} (Size: {os.path.getsize(testset.source_file_path_on_server)} bytes)")
            # Log the first few lines of the testset source file (useful for debugging)
            try:
                with open(testset.source_file_path_on_server, 'r', encoding='utf-8') as f:
                    lines = f.readlines()[:5]  # First 5 lines
                    logger.info(f"Job {job_id}: First {len(lines)} lines of source testset:")
                    for i, line in enumerate(lines):
                        logger.info(f"Line {i+1}: {line.strip()}")
            except Exception as e:
                logger.warning(f"Job {job_id}: Could not read source testset content: {str(e)}")

        if not testset.target_file_path_on_server:
            error_msg = "Error: Testset target file path is not set in database"
            logger.error(f"Job {job_id}: {error_msg}")
            update_job_failed(db=db, job=job, error=error_msg)
            return
        if not os.path.exists(testset.target_file_path_on_server):
            error_msg = "Error: Testset target file not found or path invalid"
            logger.error(f"Job {job_id}: {error_msg} - Path: {testset.target_file_path_on_server}")
            logger.error(f"Job {job_id}: Checking directory existence: {os.path.dirname(testset.target_file_path_on_server)} - Exists: {os.path.exists(os.path.dirname(testset.target_file_path_on_server))}")
            if os.path.exists(os.path.dirname(testset.target_file_path_on_server)):
                logger.error(f"Job {job_id}: Directory exists but file not found. Directory contents: {os.listdir(os.path.dirname(testset.target_file_path_on_server))}")
            update_job_failed(db=db, job=job, error=error_msg)
            return
        else:
            logger.info(f"Job {job_id}: Found testset target file: {testset.target_file_path_on_server} (Size: {os.path.getsize(testset.target_file_path_on_server)} bytes)")
            # Log the first few lines of the testset target file (useful for debugging)
            try:
                with open(testset.target_file_path_on_server, 'r', encoding='utf-8') as f:
                    lines = f.readlines()[:5]  # First 5 lines
                    logger.info(f"Job {job_id}: First {len(lines)} lines of target testset:")
                    for i, line in enumerate(lines):
                        logger.info(f"Line {i+1}: {line.strip()}")
            except Exception as e:
                logger.warning(f"Job {job_id}: Could not read target testset content: {str(e)}")

        # Create temporary directory for output
        logger.info(f"Job {job_id}: Creating temporary directory for output")
        temp_dir = create_temp_directory(job_id)
        logger.info(f"Job {job_id}: Created temporary directory: {temp_dir}")
        
        # Run the evaluation based on the evaluation model type
        base_model_result = None
        
        if evaluation_model_type == "base" or evaluation_model_type == "both":
            # Evaluate with base model
            try:
                logger.info(f"Job {job_id}: Preparing base model evaluation")
                job = crud_evaluation.update_status(
                db=db,
                job_id=job_id,
                    status=EvaluationStatus.PREPARING_ENGINE
                )
                
                base_output_path = os.path.join(temp_dir, "base_output.txt")
                logger.info(f"Job {job_id}: Base model output will be saved to: {base_output_path}")
                logger.info(f"Job {job_id}: Base model details - Source: {testset.source_file_path_on_server}, Target: {testset.target_file_path_on_server}")
                logger.info(f"Job {job_id}: Base model details - Model: {model_version.base_model_file_path_on_server}, HParams: {model_version.base_hparams_file_path_on_server}")
                logger.info(f"Job {job_id}: Calling perform_model_evaluation for base model")
                
                base_result = perform_model_evaluation(
                    source_file=testset.source_file_path_on_server,
                    target_file=testset.target_file_path_on_server,
                    model_file=model_version.base_model_file_path_on_server,
                    hparams_file=model_version.base_hparams_file_path_on_server,
                    output_path=base_output_path,
                    source_lang=language_pair.source_language_code,
                    target_lang=language_pair.target_language_code,
                    mode_type=job.mode_type,
                    sub_mode_type=job.sub_mode_type,
                    custom_params=job.custom_params,
                    job_id=job.job_id
                )
                
                logger.info(f"Job {job_id}: Base model evaluation completed successfully with results: BLEU={base_result['bleu_score']}, COMET={base_result['comet_score']}")
                
                if evaluation_model_type == "base":
                    # Update job with base model results
                    logger.info(f"Job {job_id}: Updating job with base model results")
                    job = crud_evaluation.update_status(
                db=db,
                job_id=job_id,
                        status=EvaluationStatus.COMPLETED,
                        completed_at=datetime.now(),
                        update_data={
                            "bleu_score": base_result["bleu_score"],
                            "comet_score": base_result["comet_score"],
                            "output_file_path": base_output_path
                        }
                    )
                    
                    # If requested, update training results
                    if job.auto_add_to_details_requested:
                        logger.info(f"Job {job_id}: Adding base model results to training details")
                        add_results_to_training_details(
                            db=db,
                            version_id=job.version_id,
                            testset_id=job.testset_id,
                            is_base=True,
                            bleu_score=base_result["bleu_score"],
                            comet_score=base_result["comet_score"],
                            job_id=job.job_id
                        )
                        job = crud_evaluation.update_status(
                db=db,
                job_id=job_id,
                            status=EvaluationStatus(job.status),
                            update_data={"details_added_successfully": True}
                        )
                else:
                    # Store base model result for later
                    logger.info(f"Job {job_id}: Storing base model results for later use")
                    base_model_result = {
                        "bleu_score": base_result["bleu_score"],
                        "comet_score": base_result["comet_score"],
                        "output_file_path": base_output_path
                    }
            except Exception as e:
                error_msg = f"Error in base model evaluation: {str(e)}"
                logger.error(f"Job {job_id}: {error_msg}")
                update_job_failed(db=db, job=job, error=error_msg)
                
        if evaluation_model_type == "finetuned" or evaluation_model_type == "both":
            # Evaluate with finetuned model
            try:
                logger.info(f"Job {job_id}: Preparing finetuned model evaluation")
                job = crud_evaluation.update_status(
            db=db,
            job_id=job_id,
            status=EvaluationStatus.PREPARING_ENGINE
        )
        
                finetuned_output_path = os.path.join(temp_dir, "finetuned_output.txt")
                logger.info(f"Job {job_id}: Finetuned model output will be saved to: {finetuned_output_path}")
                logger.info(f"Job {job_id}: Finetuned model details - Source: {testset.source_file_path_on_server}, Target: {testset.target_file_path_on_server}")
                logger.info(f"Job {job_id}: Finetuned model details - Model: {model_version.model_file_path_on_server}, HParams: {model_version.hparams_file_path_on_server}")
                logger.info(f"Job {job_id}: Calling perform_model_evaluation for finetuned model")
                
                finetuned_result = perform_model_evaluation(
                    source_file=testset.source_file_path_on_server,
                    target_file=testset.target_file_path_on_server,
                    model_file=model_version.model_file_path_on_server,
                    hparams_file=model_version.hparams_file_path_on_server,
                    output_path=finetuned_output_path,
                    source_lang=language_pair.source_language_code,
                    target_lang=language_pair.target_language_code,
                    mode_type=job.mode_type,
                    sub_mode_type=job.sub_mode_type,
                    custom_params=job.custom_params,
                    job_id=job.job_id
                )
                
                logger.info(f"Job {job_id}: Finetuned model evaluation completed successfully with results: BLEU={finetuned_result['bleu_score']}, COMET={finetuned_result['comet_score']}")
                
                # Update job with finetuned model results
                update_data = {
                    "bleu_score": finetuned_result["bleu_score"],
                    "comet_score": finetuned_result["comet_score"],
                    "output_file_path": finetuned_output_path
                }
                
                if base_model_result:
                    logger.info(f"Job {job_id}: Including base model results in update")
                    update_data["base_model_result"] = json.dumps(base_model_result)
                
                logger.info(f"Job {job_id}: Updating job with finetuned model results")
                job = crud_evaluation.update_status(
                    db=db,
                    job_id=job_id,
                    status=EvaluationStatus.COMPLETED,
                    completed_at=datetime.now(),
                    update_data=update_data
                )
                
                # If requested, update training results
                if job.auto_add_to_details_requested:
                    training_result = add_results_to_training_details(
                        db=db,
                        version_id=job.version_id,
                        testset_id=job.testset_id,
                        is_base=False,
                        bleu_score=finetuned_result["bleu_score"],
                        comet_score=finetuned_result["comet_score"],
                        job_id=job.job_id
                    )
                    
                    # If we have base model result, update that too
                    if base_model_result and training_result:
                        # Handle both dict and object returns from add_results_to_training_details
                        if hasattr(training_result, 'base_model_bleu'):
                            # Direct object assignment (typical case)
                            training_result.base_model_bleu = base_model_result["bleu_score"]
                            training_result.base_model_comet = base_model_result["comet_score"]
                            db.commit()
                        else:
                            # Handle the case where training_result is a dictionary or other type
                            # Find the training result by version_id and testset_id and update it
                            existing = crud_training_result.get_by_version_and_testset(
                                db=db,
                                version_id=job.version_id,
                                testset_id=job.testset_id
                            )
                            if existing:
                                existing.base_model_bleu = base_model_result["bleu_score"]
                                existing.base_model_comet = base_model_result["comet_score"]
                                db.commit()
                    
                    job = crud_evaluation.update_status(
                        db=db,
                        job_id=job_id,
                        status=EvaluationStatus(job.status),
                        update_data={"details_added_successfully": True}
                    )
                    
            except Exception as e:
                error_msg = f"Error in finetuned model evaluation: {str(e)}"
                logger.error(f"Job {job_id}: {error_msg}")
                update_job_failed(db=db, job=job, error=error_msg)
                
    except Exception as e:
        print(f"Unexpected error in evaluation job {job_id}: {str(e)}")
        try:
            # If we can still update the job
            job = crud_evaluation.get(db=db, job_id=job_id)
            if job:
                update_job_failed(db=db, job=job, error=f"Unexpected error: {str(e)}")
        except:
            pass
    finally:
        db.close()

def translate_text(
    source_text: str,
    model_file_path: str,
    hparams_file_path: str,
    mode_type: Optional[str] = None,
    sub_mode_type: Optional[str] = None,
    custom_params: Optional[str] = None
) -> str:
    """
    Translate text directly using a model without saving results to database
    """
    # Check if fake evaluation mode is enabled
    if settings.FAKE_EVALUATION_MODE:
        logger.info(f"[FAKE MODE ENABLED] Using fake translation")
        return fake_translate_text(
            source_text=source_text,
            model_file_path=model_file_path,
            hparams_file_path=hparams_file_path,
            mode_type=mode_type,
            sub_mode_type=sub_mode_type,
            custom_params=custom_params
        )

    # Create a temporary file with the source text
    with tempfile.NamedTemporaryFile(mode='w+', suffix='.txt', delete=False) as source_file:
        source_file.write(source_text)
        source_file_path = source_file.name
    
    # Create a temporary file for output
    with tempfile.NamedTemporaryFile(mode='w+', suffix='.txt', delete=False) as output_file:
        output_file_path = output_file.name
    
    try:
        # Extract language pair from model file path or hparams
        # This is a simplified example - in real implementation, you'd extract from 
        # the language pair information from the ModelVersion record
        source_lang = "en"  # Default placeholder
        target_lang = "vi"  # Default placeholder
        
        # Construct the Docker command
        docker_cmd = [
            "docker", "run", "--rm",
            "-v", f"{os.path.dirname(model_file_path)}:/app/models",
            "-v", f"{os.path.dirname(source_file_path)}:/app/input",
            "-v", f"{os.path.dirname(output_file_path)}:/app/output",
            "nmt-engine:latest",
            "--input", f"/app/input/{os.path.basename(source_file_path)}",
            "--output", f"/app/output/{os.path.basename(output_file_path)}",
            "--model", f"/app/models/{os.path.basename(model_file_path)}",
            "--hparams", f"/app/models/{os.path.basename(hparams_file_path)}",
            "--source-lang", source_lang,
            "--target-lang", target_lang,
        ]
        
        # Add mode parameters if specified
        if mode_type:
            docker_cmd.extend(["--mode", mode_type])
        
        if sub_mode_type and (mode_type == "Samsung Note Mode" or mode_type == "Samsung Internet Mode"):
            docker_cmd.extend(["--sub-mode", sub_mode_type])
        
        if custom_params and mode_type == "Custom":
            # Split custom params by spaces and add to command
            docker_cmd.extend(custom_params.split())
        
        # Execute the translation
        process = subprocess.run(
            docker_cmd,
            check=True,
                    stdout=subprocess.PIPE, 
                    stderr=subprocess.PIPE, 
            timeout=60  # Short timeout for direct translation
        )
        
        # Read the translated output
        with open(output_file_path, 'r') as f:
            translated_text = f.read()
        
        return translated_text
        
    except subprocess.CalledProcessError as e:
        raise Exception(f"Translation process failed: {e.stderr.decode()}")
    except subprocess.TimeoutExpired:
        raise Exception("Translation process timed out")
    except Exception as e:
        raise Exception(f"Error in translation: {str(e)}")
    finally:
        # Clean up temporary files
        if os.path.exists(source_file_path):
            os.unlink(source_file_path)
        if os.path.exists(output_file_path):
            os.unlink(output_file_path)

def perform_model_evaluation(
    source_file: str,
    target_file: str,
    model_file: str,
    hparams_file: str,
    output_path: str,
    source_lang: str,
    target_lang: str,
    mode_type: Optional[str] = None,
    sub_mode_type: Optional[str] = None,
    custom_params: Optional[str] = None,
    job_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    Perform model evaluation by translating source file and calculating metrics.
    Uses Docker to run the translation engine. Retries up to 3 times if Docker fails to start.
    """
    # Check if fake evaluation mode is enabled
    if settings.FAKE_EVALUATION_MODE:
        logger.info(f"[FAKE MODE ENABLED] Using fake evaluation for job_id: {job_id}")
        return fake_perform_model_evaluation(
            source_file=source_file,
            target_file=target_file,
            model_file=model_file,
            hparams_file=hparams_file,
            output_path=output_path,
            source_lang=source_lang,
            target_lang=target_lang,
            mode_type=mode_type,
            sub_mode_type=sub_mode_type,
            custom_params=custom_params,
            job_id=job_id
        )

    logger.info(f"Starting model evaluation for job_id: {job_id if job_id else 'N/A'}")
    logger.info(f"Source: {source_file}, Target (Ref): {target_file}, Model: {model_file}, HParams: {hparams_file}")
    logger.info(f"Output will be saved to: {output_path}")
    logger.info(f"Lang: {source_lang}->{target_lang}, Mode: {mode_type}, SubMode: {sub_mode_type}, CustomParams: {custom_params}")

    DOCKER_TIMEOUT_SECONDS = 1800  # 30 minutes
    MAX_DOCKER_RETRIES = 3
    DOCKER_RETRY_DELAY_SECONDS = 10

    try:
        # Ensure output directory exists
        logger.info(f"Creating output directory: {os.path.dirname(output_path)}")
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Check if Docker is available
        try:
            logger.info("Checking if Docker is available...")
            docker_check = subprocess.run(
                ["docker", "--version"], 
                check=True, 
                capture_output=True, 
                text=True, 
                timeout=10
            )
            logger.info(f"Docker check result: {docker_check.stdout.strip()}")
        except subprocess.CalledProcessError as e:
            logger.error(f"Docker check failed - Command error: {e.returncode}")
            logger.error(f"Docker check stdout: {e.stdout if hasattr(e, 'stdout') else 'N/A'}")
            logger.error(f"Docker check stderr: {e.stderr if hasattr(e, 'stderr') else 'N/A'}")
        except subprocess.TimeoutExpired:
            logger.error("Docker check timed out after 10 seconds")
        except Exception as e:
            logger.error(f"Docker check failed with unexpected error: {str(e)}, type: {type(e).__name__}")
        # Continue anyway, as the main Docker command will retry
        
        # Check if files exist and have correct permissions
        logger.info(f"Checking if required files exist and have correct permissions:")
        for file_path in [source_file, target_file, model_file, hparams_file]:
            if not os.path.exists(file_path):
                logger.error(f"File does not exist: {file_path}")
            else:
                file_stat = os.stat(file_path)
                logger.info(f"File {file_path} - Size: {file_stat.st_size} bytes, Permissions: {oct(file_stat.st_mode)[-3:]}")
        
        # Prepare Docker command
        logger.info(f"Preparing Docker command for job {job_id}")
        base_docker_cmd = [
            "docker", "run", "--rm",
            "-v", f"{os.path.dirname(model_file)}:/app/models:ro",
            "-v", f"{os.path.dirname(source_file)}:/app/input:ro",
            "-v", f"{os.path.dirname(output_path)}:/app/output",
            settings.NMT_ENGINE_DOCKER_IMAGE,
            "--input", f"/app/input/{os.path.basename(source_file)}",
            "--output", f"/app/output/{os.path.basename(output_path)}",
            "--model", f"/app/models/{os.path.basename(model_file)}",
            "--hparams", f"/app/models/{os.path.basename(hparams_file)}",
            "--source-lang", source_lang,
            "--target-lang", target_lang,
        ]
        
        logger.info(f"Docker image: {settings.NMT_ENGINE_DOCKER_IMAGE}")
        logger.info(f"Docker volume mappings:")
        logger.info(f"  {os.path.dirname(model_file)} -> /app/models")
        logger.info(f"  {os.path.dirname(source_file)} -> /app/input")
        logger.info(f"  {os.path.dirname(output_path)} -> /app/output")
        
        full_docker_cmd = construct_evaluation_docker_command(
            base_command_args=base_docker_cmd,
            selected_mode=mode_type,
            sub_mode_type=sub_mode_type,
            custom_params=custom_params
        )
        logger.info(f"Executing Docker command: {' '.join(full_docker_cmd)}")

        last_exception = None
        for attempt in range(1, MAX_DOCKER_RETRIES + 1):
            try:
                logger.info(f"Attempt {attempt}/{MAX_DOCKER_RETRIES} - Starting Docker command...")
                start_time = time.time()
                
                # Run Docker command
                process = subprocess.run(
                    full_docker_cmd,
                    check=True,
                    capture_output=True,
                    text=True,
                    timeout=DOCKER_TIMEOUT_SECONDS
                )
                
                end_time = time.time()
                execution_time = end_time - start_time
                logger.info(f"Docker process completed successfully for job {job_id} (attempt {attempt}). Execution time: {execution_time:.2f} seconds")
                
                # Log Docker output details
                stdout_lines = process.stdout.strip().split('\n')
                if len(stdout_lines) > 10:
                    logger.info(f"Docker process stdout for job {job_id} (first 10 lines):\n" + '\n'.join(stdout_lines[:10]))
                    logger.info(f"... and {len(stdout_lines) - 10} more lines")
                else:
                    logger.info(f"Docker process stdout for job {job_id}:\n{process.stdout}")
                
                if process.stderr:
                    stderr_lines = process.stderr.strip().split('\n')
                    if len(stderr_lines) > 10:
                        logger.warning(f"Docker process stderr for job {job_id} (first 10 lines):\n" + '\n'.join(stderr_lines[:10]))
                        logger.warning(f"... and {len(stderr_lines) - 10} more lines")
                    else:
                        logger.warning(f"Docker process stderr for job {job_id}:\n{process.stderr}")
                
                break  # Success, exit retry loop
            except subprocess.CalledProcessError as e:
                execution_time = time.time() - start_time
                logger.error(f"Docker command failed for job {job_id} (attempt {attempt}/{MAX_DOCKER_RETRIES}) after {execution_time:.2f} seconds")
                logger.error(f"Error code: {e.returncode}")
                
                # Log detailed error output
                if hasattr(e, 'stderr') and e.stderr:
                    stderr_lines = e.stderr.split('\n')
                    if len(stderr_lines) > 20:
                        logger.error(f"Error output (first 20 lines):\n" + '\n'.join(stderr_lines[:20]))
                        logger.error(f"... and {len(stderr_lines) - 20} more lines")
                    else:
                        logger.error(f"Error output:\n{e.stderr}")
                
                if hasattr(e, 'stdout') and e.stdout:
                    stdout_lines = e.stdout.split('\n')
                    if len(stdout_lines) > 10:
                        logger.error(f"Command stdout (first 10 lines):\n" + '\n'.join(stdout_lines[:10]))
                    else:
                        logger.error(f"Command stdout:\n{e.stdout}")
                
                last_exception = e
                if attempt < MAX_DOCKER_RETRIES:
                    logger.info(f"Retrying Docker run in {DOCKER_RETRY_DELAY_SECONDS} seconds...")
                    time.sleep(DOCKER_RETRY_DELAY_SECONDS)
                else:
                    error_msg = f"Docker run failed after {MAX_DOCKER_RETRIES} attempts for job {job_id}. Last error: {e.stderr if hasattr(e, 'stderr') else str(e)}"
                    logger.error(error_msg)
                    raise Exception(error_msg)
            except subprocess.TimeoutExpired as e:
                logger.error(f"Docker command timed out after {DOCKER_TIMEOUT_SECONDS} seconds for job {job_id} (attempt {attempt}/{MAX_DOCKER_RETRIES})")
                
                # Try to kill the process if still running
                try:
                    logger.info(f"Attempting to kill any hanging Docker processes...")
                    # This is a simplified approach - in production you might want a more robust solution
                    kill_cmd = f"docker ps | grep {settings.NMT_ENGINE_DOCKER_IMAGE} | awk '{{print $1}}' | xargs -r docker kill"
                    subprocess.run(kill_cmd, shell=True, timeout=30)
                    logger.info("Kill command executed")
                except Exception as kill_err:
                    logger.error(f"Error trying to kill Docker processes: {str(kill_err)}")
                
                last_exception = e
                if attempt < MAX_DOCKER_RETRIES:
                    logger.info(f"Retrying Docker run in {DOCKER_RETRY_DELAY_SECONDS} seconds...")
                    time.sleep(DOCKER_RETRY_DELAY_SECONDS)
                else:
                    error_msg = f"Docker run timed out after {MAX_DOCKER_RETRIES} attempts for job {job_id}. Process took longer than {DOCKER_TIMEOUT_SECONDS} seconds"
                    logger.error(error_msg)
                    raise Exception(error_msg)
            except Exception as e:
                logger.error(f"Unexpected error running Docker command for job {job_id} (attempt {attempt}/{MAX_DOCKER_RETRIES})")
                logger.error(f"Error type: {type(e).__name__}")
                logger.error(f"Error message: {str(e)}")
                last_exception = e
                if attempt < MAX_DOCKER_RETRIES:
                    logger.info(f"Retrying Docker run in {DOCKER_RETRY_DELAY_SECONDS} seconds...")
                    time.sleep(DOCKER_RETRY_DELAY_SECONDS)
                else:
                    error_msg = f"Unexpected error after {MAX_DOCKER_RETRIES} attempts for job {job_id}: {str(e)}"
                    logger.error(error_msg)
                    raise Exception(error_msg)
        else:
            # If we exit the loop without breaking, raise the last exception
            raise last_exception if last_exception else Exception("Unknown error in Docker run")

        # Check if output file was created
        logger.info(f"Checking if output file was created: {output_path}")
        if not os.path.exists(output_path):
            error_msg = f"Evaluation output file not found: {output_path}"
            logger.error(error_msg)
            raise FileNotFoundError(error_msg)
            
        if os.path.getsize(output_path) == 0:
            error_msg = f"Evaluation output file is empty: {output_path}"
            logger.error(error_msg)
            raise Exception(error_msg)

        # Log file size and sample content
        file_size = os.path.getsize(output_path)
        logger.info(f"Translation output generated: {output_path} (Size: {file_size} bytes)")
        
        # Log first few lines of output file
        try:
            with open(output_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()[:5]  # First 5 lines
                logger.info(f"First {len(lines)} lines of translation output:")
                for i, line in enumerate(lines):
                    logger.info(f"Line {i+1}: {line.strip()}")
        except Exception as e:
            logger.warning(f"Could not read translation output content: {str(e)}")
        # Calculate scores
        logger.info(f"Calculating BLEU score for job {job_id}...")
        try:
            bleu_score = calculate_bleu_score(output_file=output_path, reference_file=target_file)
            logger.info(f"Calculated BLEU score for job {job_id}: {bleu_score}")
        except Exception as e:
            logger.error(f"BLEU score calculation failed: {str(e)}")
            logger.warning("Defaulting BLEU score to 0.0")
            bleu_score = 0.0
            
        logger.info(f"Calculating COMET score for job {job_id}...")
        try:
            comet_score = calculate_comet_score(output_file=output_path, source_file=source_file, reference_file=target_file)
            logger.info(f"Calculated COMET score for job {job_id}: {comet_score}")
        except Exception as e:
            logger.error(f"COMET score calculation failed: {str(e)}")
            logger.warning("Defaulting COMET score to 0.0")
            comet_score = 0.0
        
        logger.info(f"Model evaluation completed successfully for job {job_id}")
        return {
            "bleu_score": bleu_score,
            "comet_score": comet_score,
            "output_path": output_path
        }

    except FileNotFoundError as e:
        error_msg = f"File not found during model evaluation for job {job_id}: {str(e)}"
        logger.error(error_msg)
        raise Exception(error_msg)
    except PermissionError as e:
        error_msg = f"Permission error during model evaluation for job {job_id}: {str(e)}"
        logger.error(error_msg)
        raise Exception(error_msg)
    except subprocess.TimeoutExpired:
        error_msg = f"Evaluation Docker process timed out after {DOCKER_TIMEOUT_SECONDS} seconds for job {job_id}."
        logger.error(error_msg)
        raise Exception(error_msg)
    except Exception as e:
        error_msg = f"An unexpected error occurred during model evaluation for job {job_id}: {str(e)}"
        logger.error(error_msg)
        raise Exception(error_msg)

def update_job_failed(db: Session, job: EvaluationJob, error: str) -> None:
    """
    Update job status to FAILED with error message
    """
    # Import EvaluationStatus from schemas to ensure we're using enum
    from app.schemas.evaluation import EvaluationStatus
    
    crud_evaluation.update_status(
        db=db,
        job_id=job.job_id,
        status=EvaluationStatus.FAILED,
        log_message=error,
        completed_at=datetime.now()
    )

def add_results_to_training_details(
    db: Session,
    version_id: int,
    testset_id: int,
    is_base: bool,
    bleu_score: float,
    comet_score: float,
    job_id: int
) -> Optional[Any]:
    """
    Add evaluation results to training details
    """
    # Check if fake evaluation mode is enabled
    if settings.FAKE_EVALUATION_MODE:
        logger.info(f"[FAKE MODE ENABLED] Using fake add_results_to_training_details")
        return fake_add_results_to_training_details(
                db=db,
            version_id=version_id,
            testset_id=testset_id,
            is_base=is_base,
            bleu_score=bleu_score,
            comet_score=comet_score,
            job_id=job_id
        )
    
    # Try to find existing training result for this version and testset
    existing = crud_training_result.get_by_version_and_testset(
        db=db,
        version_id=version_id,
        testset_id=testset_id
    )
    
    # Choose which fields to update based on whether it's base or finetuned model
    if is_base:
        fields = {
            "base_model_bleu": bleu_score,
            "base_model_comet": comet_score,
            "training_details_notes": f"Updated with evaluation job {job_id} on {datetime.now()}"
        }
    else:
        fields = {
            "finetuned_model_bleu": bleu_score,
            "finetuned_model_comet": comet_score,
            "training_details_notes": f"Updated with evaluation job {job_id} on {datetime.now()}"
        }
    
    # Create or update the training result
    if existing:
        return crud_training_result.update(
            db=db,
            db_obj=existing,
            obj_in=fields
        )
    else:
        create_data = {
            "version_id": version_id,
            "testset_id": testset_id,
            **fields
        }
        return crud_training_result.create(db=db, obj_in=create_data)

def fake_add_results_to_training_details(
    db: Session,
    version_id: int,
    testset_id: int,
    is_base: bool,
    bleu_score: float,
    comet_score: float,
    job_id: int
) -> Optional[Any]:
    """
    Fake version of add_results_to_training_details for testing
    """
    logger.info(f"[FAKE MODE] Adding fake results to training details")
    logger.info(f"[FAKE MODE] Version: {version_id}, Testset: {testset_id}")
    logger.info(f"[FAKE MODE] Is Base: {is_base}, BLEU: {bleu_score}, COMET: {comet_score}")
    
    # Try to find existing training result for this version and testset
    existing = crud_training_result.get_by_version_and_testset(
        db=db,
        version_id=version_id,
        testset_id=testset_id
    )
    
    # Choose which fields to update based on whether it's base or finetuned model
    if is_base:
        fields = {
            "base_model_bleu": bleu_score,
            "base_model_comet": comet_score,
            "training_details_notes": f"[FAKE MODE] Updated with evaluation job {job_id} on {datetime.now()}"
        }
    else:
        fields = {
            "finetuned_model_bleu": bleu_score,
            "finetuned_model_comet": comet_score,
            "training_details_notes": f"[FAKE MODE] Updated with evaluation job {job_id} on {datetime.now()}"
        }
    
    # Create or update the training result
    if existing:
        logger.info(f"[FAKE MODE] Updating existing training result ID: {existing.result_id}")
        return crud_training_result.update(
            db=db,
            db_obj=existing,
            obj_in=fields
        )
    else:
        logger.info(f"[FAKE MODE] Creating new training result")
        create_data = TrainingResultCreate(
            version_id=version_id,
            testset_id=testset_id,
            **fields
        )
        return crud_training_result.create(db=db, obj_in=create_data) 