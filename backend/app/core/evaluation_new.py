import os
import shutil
import subprocess
import yaml
import time
from typing import Optional, Dict, Any, Tuple, List
from datetime import datetime
import logging
from pathlib import Path

from app.core.config import settings
from app.db.database import SessionLocal
from app.schemas.evaluation import EvaluationStatus
from app.crud import crud_evaluation, crud_model_version, crud_training_result
from app.db.models import ModelVersion, Testset, LanguagePair, TrainingResult

logger = logging.getLogger(__name__)

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
    temp_dir = os.path.join(settings.DOCKER_VOLUME_TMP_PATH_HOST, "eval_temp", f"eval_{job_id}")
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
        # Using sacrebleu through subprocess
        cmd = ["sacrebleu", reference_file, "-i", output_file, "-b"]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        # Extract BLEU score from output
        bleu_score = float(result.stdout.strip())
        return bleu_score
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
        # Using comet through subprocess
        cmd = [
            "comet-score", 
            "-s", source_file, 
            "-t", output_file, 
            "-r", reference_file
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        # Extract COMET score from output (format depends on the comet implementation)
        # This is a simplification - adapt based on actual output format
        for line in result.stdout.strip().split('\n'):
            if "score:" in line:
                comet_score = float(line.split("score:")[1].strip())
                return comet_score
        
        return 0.0
    except Exception as e:
        logger.error(f"Error calculating COMET score: {str(e)}")
        return 0.0

def run_evaluation(job_id: int):
    """
    Run the evaluation process for a job
    
    Args:
        job_id: The ID of the evaluation job to process
    """
    # Create a database session
    db = SessionLocal()
    
    try:
        # Update job status to processing
        crud_evaluation.update_status(
            db=db,
            job_id=job_id,
            status=EvaluationStatus.PREPARING_SETUP,
            processing_started_at=datetime.now()
        )
        
        # Get job details
        job = crud_evaluation.get(db=db, job_id=job_id)
        if not job:
            logger.error(f"Job {job_id} not found")
            return
        
        # Get model version
        model_version = crud_model_version.get(db=db, version_id=job.version_id)
        if not model_version:
            crud_evaluation.update_status(
                db=db,
                job_id=job_id,
                status=EvaluationStatus.FAILED,
                log_message="Model version not found"
            )
            return
        
        # Check requested evaluation model type and validate files exist
        eval_model_type = job.evaluation_model_type or 'finetuned'
        
        # For 'base' or 'both' types, check base model files exist
        if eval_model_type in ['base', 'both']:
            if not model_version.base_model_file_path_on_server or not model_version.base_hparams_file_path_on_server:
                crud_evaluation.update_status(
                    db=db,
                    job_id=job_id,
                    status=EvaluationStatus.FAILED,
                    log_message="Base model files not found for this version"
                )
                return
                
        # For 'finetuned' or 'both' types, check finetuned model files exist
        if eval_model_type in ['finetuned', 'both']:
            if not model_version.model_file_path_on_server or not model_version.hparams_file_path_on_server:
                crud_evaluation.update_status(
                    db=db,
                    job_id=job_id,
                    status=EvaluationStatus.FAILED,
                    log_message="Finetuned model files not found for this version"
                )
                return
        
        # Get testset
        testset = db.query(Testset).filter(Testset.testset_id == job.testset_id).first()
        if not testset:
            crud_evaluation.update_status(
                db=db,
                job_id=job_id,
                status=EvaluationStatus.FAILED,
                log_message="Testset not found"
            )
            return
        
        # Check if testset files exist
        if not testset.source_file_path or not testset.target_file_path:
            crud_evaluation.update_status(
                db=db,
                job_id=job_id,
                status=EvaluationStatus.FAILED,
                log_message="Testset input/reference file paths not defined"
            )
            return
        
        # Get language pair
        language_pair = db.query(LanguagePair).filter(LanguagePair.lang_pair_id == model_version.lang_pair_id).first()
        if not language_pair:
            crud_evaluation.update_status(
                db=db,
                job_id=job_id,
                status=EvaluationStatus.FAILED,
                log_message="Language pair not found"
            )
            return
        
        # Determine langpack folder
        langpack_folder_name = determine_langpack_folder(
            language_pair.source_language_code,
            language_pair.target_language_code
        )
        if not langpack_folder_name:
            crud_evaluation.update_status(
                db=db,
                job_id=job_id,
                status=EvaluationStatus.FAILED,
                log_message="Unable to determine language pack folder"
            )
            return
        
        # Update status to preparing engine
        crud_evaluation.update_status(
            db=db,
            job_id=job_id,
            status=EvaluationStatus.PREPARING_ENGINE
        )
        
        # Prepare directories and paths
        source_code = language_pair.source_language_code.lower()
        target_code = language_pair.target_language_code.lower()
        
        # Create temp directory for output
        temp_eval_host_dir = create_temp_directory(job_id)
        
        # Define paths for model files on host
        target_model_dir_on_host = os.path.join(
            settings.T2T_RESOURCES_BASE_PATH, 
            langpack_folder_name, 
            "models"
        )
        os.makedirs(target_model_dir_on_host, exist_ok=True)
        
        # Dictionary to store evaluation results
        eval_results = {}
        update_data = {}
        
        # Define function to run a single evaluation
        def run_single_evaluation(model_file_path, hparams_file_path, model_type):
            # Copy model files to target location
            target_model_file = os.path.basename(model_file_path)
            target_hparams_file = os.path.basename(hparams_file_path)
            
            target_model_file_on_host = os.path.join(target_model_dir_on_host, target_model_file)
            target_hparams_file_on_host = os.path.join(target_model_dir_on_host, target_hparams_file)
            
            try:
                shutil.copyfile(model_file_path, target_model_file_on_host)
                shutil.copyfile(hparams_file_path, target_hparams_file_on_host)
            except Exception as e:
                crud_evaluation.update_status(
                    db=db,
                    job_id=job_id,
                    status=EvaluationStatus.FAILED,
                    log_message=f"Failed to copy {model_type} model files: {str(e)}"
                )
                return False, None, None, None
            
            # Modify config file
            config_file_on_host_path = os.path.join(
                settings.T2T_RESOURCES_BASE_PATH, 
                langpack_folder_name, 
                "configs", 
                f"{source_code}2{target_code}.yaml"
            )
            
            try:
                with open(config_file_on_host_path, 'r') as f_config:
                    config_data = yaml.safe_load(f_config)
                
                config_data['modelPath'] = f"models/{target_model_file}"
                config_data['hParamsPath'] = f"models/{target_hparams_file}"
                
                with open(config_file_on_host_path, 'w') as f_config:
                    yaml.dump(config_data, f_config, sort_keys=False)
            except Exception as e:
                crud_evaluation.update_status(
                    db=db,
                    job_id=job_id,
                    status=EvaluationStatus.FAILED,
                    log_message=f"Failed to modify config file for {model_type} model: {str(e)}"
                )
                return False, None, None, None
            
            # Prepare file paths
            output_translate_file_name = f"output_eval_{job_id}_{model_type}.txt"
            output_translate_file_path_on_host = os.path.join(temp_eval_host_dir, output_translate_file_name)
            
            source_text_file_path_on_host = testset.source_file_path
            input_file_path_in_container = os.path.join(
                settings.DOCKER_VOLUME_TMP_PATH_CONTAINER,
                os.path.relpath(source_text_file_path_on_host, settings.DOCKER_VOLUME_TMP_PATH_HOST)
            )
            output_file_path_in_container = os.path.join(
                settings.DOCKER_VOLUME_TMP_PATH_CONTAINER,
                "eval_temp",
                f"eval_{job_id}",
                output_translate_file_name
            )
            
            # Update status to running engine
            crud_evaluation.update_status(
                db=db,
                job_id=job_id,
                status=EvaluationStatus.RUNNING_ENGINE,
                log_message=f"Running {model_type} model evaluation"
            )
            
            # Build base Docker command
            base_docker_command = [
                "sudo", "docker", "run", "--rm",
                "-v", f"{settings.T2T_RESOURCES_BASE_PATH}:{settings.DOCKER_VOLUME_RESOURCES_PATH_CONTAINER}",
                "-v", f"{settings.DOCKER_VOLUME_TMP_PATH_HOST}:{settings.DOCKER_VOLUME_TMP_PATH_CONTAINER}",
                settings.DOCKER_IMAGE_NAME, "translate", "file",
                "-s", source_code,
                "-t", target_code,
                "-i", input_file_path_in_container,
                "-o", output_file_path_in_container,
                "-r", settings.DOCKER_VOLUME_RESOURCES_PATH_CONTAINER,
            ]
            
            # Add mode-specific parameters based on job settings
            docker_command_parts = construct_evaluation_docker_command(
                base_docker_command,
                selected_mode=job.mode_type,
                sub_mode_type=job.sub_mode_type,
                custom_params=job.custom_params
            )
            
            # Run Docker command
            try:
                process = subprocess.Popen(
                    docker_command_parts, 
                    stdout=subprocess.PIPE, 
                    stderr=subprocess.PIPE, 
                    text=True
                )
                stdout, stderr = process.communicate(timeout=settings.NMT_ENGINE_TIMEOUT_SECONDS)
                return_code = process.returncode
                
                if return_code != 0:
                    crud_evaluation.update_status(
                        db=db,
                        job_id=job_id,
                        status=EvaluationStatus.FAILED,
                        log_message=f"Docker command failed for {model_type} model: {stderr}"
                    )
                    return False, None, None, None
            except subprocess.TimeoutExpired:
                crud_evaluation.update_status(
                    db=db,
                    job_id=job_id,
                    status=EvaluationStatus.FAILED,
                    log_message=f"Docker command timed out for {model_type} model after {settings.NMT_ENGINE_TIMEOUT_SECONDS} seconds"
                )
                return False, None, None, None
            except Exception as e:
                crud_evaluation.update_status(
                    db=db,
                    job_id=job_id,
                    status=EvaluationStatus.FAILED,
                    log_message=f"Error running Docker command for {model_type} model: {str(e)}"
                )
                return False, None, None, None
            
            # Verify output file exists
            if not os.path.exists(output_translate_file_path_on_host):
                crud_evaluation.update_status(
                    db=db,
                    job_id=job_id,
                    status=EvaluationStatus.FAILED,
                    log_message=f"Output file was not generated for {model_type} model"
                )
                return False, None, None, None
            
            # Update status to calculating metrics
            crud_evaluation.update_status(
                db=db,
                job_id=job_id,
                status=EvaluationStatus.CALCULATING_METRICS,
                log_message=f"Calculating metrics for {model_type} model"
            )
            
            # Calculate BLEU score
            bleu_score = calculate_bleu_score(
                output_translate_file_path_on_host, 
                testset.target_file_path
            )
            
            # Calculate COMET score
            comet_score = calculate_comet_score(
                output_translate_file_path_on_host,
                testset.source_file_path,
                testset.target_file_path
            )
            
            return True, bleu_score, comet_score, output_translate_file_path_on_host
        
        # Run evaluation(s) based on model type
        if eval_model_type == 'base':
            # Evaluate base model only
            success, bleu_score, comet_score, output_path = run_single_evaluation(
                model_version.base_model_file_path_on_server,
                model_version.base_hparams_file_path_on_server,
                "base"
            )
            
            if not success:
                return
            
            # Store results
            update_data = {
                "bleu_score": bleu_score,
                "comet_score": comet_score,
                "output_file_path": output_path
            }
            
        elif eval_model_type == 'finetuned':
            # Evaluate finetuned model only
            success, bleu_score, comet_score, output_path = run_single_evaluation(
                model_version.model_file_path_on_server,
                model_version.hparams_file_path_on_server,
                "finetuned"
            )
            
            if not success:
                return
            
            # Store results
            update_data = {
                "bleu_score": bleu_score,
                "comet_score": comet_score,
                "output_file_path": output_path
            }
            
        elif eval_model_type == 'both':
            # Evaluate base model
            base_success, base_bleu, base_comet, base_output_path = run_single_evaluation(
                model_version.base_model_file_path_on_server,
                model_version.base_hparams_file_path_on_server,
                "base"
            )
            
            if not base_success:
                return
            
            # Evaluate finetuned model
            finetuned_success, finetuned_bleu, finetuned_comet, finetuned_output_path = run_single_evaluation(
                model_version.model_file_path_on_server,
                model_version.hparams_file_path_on_server,
                "finetuned"
            )
            
            if not finetuned_success:
                return
            
            # Store results (primary results are from finetuned model)
            update_data = {
                "bleu_score": finetuned_bleu,
                "comet_score": finetuned_comet,
                "output_file_path": finetuned_output_path,
                "base_model_bleu": base_bleu,
                "base_model_comet": base_comet,
                "base_model_output_path": base_output_path
            }
        
        # Add results to TrainingResults if requested and both models were evaluated
        details_added = False
        if job.auto_add_to_details_requested and eval_model_type == 'both':
            try:
                # Check if there's an existing TrainingResult
                existing_result = db.query(TrainingResult).filter(
                    TrainingResult.version_id == job.version_id,
                    TrainingResult.testset_id == job.testset_id
                ).first()
                
                if existing_result:
                    # Update existing record
                    existing_result.base_model_bleu = update_data["base_model_bleu"]
                    existing_result.base_model_comet = update_data["base_model_comet"]
                    existing_result.finetuned_model_bleu = update_data["bleu_score"]
                    existing_result.finetuned_model_comet = update_data["comet_score"]
                    existing_result.training_details_notes = (
                        f"{existing_result.training_details_notes or ''}\n\n"
                        f"Updated via evaluation flow on {datetime.now().strftime('%Y-%m-%d %H:%M')}, "
                        f"Job ID: {job_id}"
                    ).strip()
                    db.add(existing_result)
                else:
                    # Create new record
                    new_result = TrainingResult(
                        version_id=job.version_id,
                        testset_id=job.testset_id,
                        base_model_bleu=update_data["base_model_bleu"],
                        base_model_comet=update_data["base_model_comet"],
                        finetuned_model_bleu=update_data["bleu_score"],
                        finetuned_model_comet=update_data["comet_score"],
                        training_details_notes=f"Evaluated via flow on {datetime.now().strftime('%Y-%m-%d %H:%M')}, "
                                              f"Job ID: {job_id}"
                    )
                    db.add(new_result)
                
                db.commit()
                details_added = True
            except Exception as e:
                logger.error(f"Error adding results to training details: {str(e)}")
                # Continue with job completion even if adding to details failed
        elif job.auto_add_to_details_requested and eval_model_type != 'both':
            # If only one model type was evaluated, don't add to training results
            logger.info(f"Skipping adding to training results because only {eval_model_type} model was evaluated.")
        
        update_data["details_added_successfully"] = 1 if details_added else 0
        
        # Add base model results as JSON for frontend display
        if eval_model_type == 'both':
            update_data["base_model_results"] = {
                "bleu_score": update_data["base_model_bleu"],
                "comet_score": update_data["base_model_comet"],
                "output_file_path": update_data["base_model_output_path"]
            }
        
        # Update job status to completed
        crud_evaluation.update_status(
            db=db,
            job_id=job_id,
            status=EvaluationStatus.COMPLETED,
            log_message=f"Evaluation completed successfully for {eval_model_type} model(s)",
            update_data=update_data
        )
        
    except Exception as e:
        logger.error(f"Unexpected error in evaluation job {job_id}: {str(e)}")
        try:
            crud_evaluation.update_status(
                db=db,
                job_id=job_id,
                status=EvaluationStatus.FAILED,
                log_message=f"Unexpected error: {str(e)}"
            )
        except:
            pass
    finally:
        db.close() 