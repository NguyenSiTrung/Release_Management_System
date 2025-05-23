from typing import Any, List, Optional
import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.core.deps import get_db, get_current_release_manager_user, get_current_active_user
from app.crud import crud_testset
from app.schemas.testset import Testset, TestsetCreate, TestsetUpdate
from app.db.models import User
from app.core.config import settings
import json

router = APIRouter()

@router.get("/", response_model=List[Testset])
def read_testsets(
    db: Session = Depends(get_db),
    lang_pair_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100
) -> Any:
    """
    Retrieve testsets with optional filtering and pagination.
    """
    testsets = crud_testset.get_testsets(
        db,
        lang_pair_id=lang_pair_id,
        skip=skip,
        limit=limit
    )
    return testsets

@router.post("/", response_model=Testset)
async def create_testset(
    *,
    db: Session = Depends(get_db),
    data: Optional[str] = Form(None),
    source_file: Optional[UploadFile] = File(None),
    target_file: Optional[UploadFile] = File(None),
    testset_name: Optional[str] = Form(None),
    lang_pair_id: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    current_user: User = Depends(get_current_release_manager_user)
) -> Any:
    """
    Create new testset with file upload support. Only release manager or admin can create.
    """
    # Check if we have the data from JSON field or need to create from individual fields
    if data:
        try:
            testset_data = json.loads(data)
            testset_in = TestsetCreate(**testset_data)
        except (json.JSONDecodeError, ValueError) as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid JSON in 'data' field: {str(e)}"
            )
    elif testset_name and lang_pair_id:
        # Create from individual fields
        try:
            testset_in = TestsetCreate(
                testset_name=testset_name,
                lang_pair_id=int(lang_pair_id),
                description=description,
                source_file_path=None,  # Will be updated after file upload
                target_file_path=None   # Will be updated after file upload
            )
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid input data: {str(e)}"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Either 'data' JSON field or individual form fields (testset_name, lang_pair_id) are required"
        )
    
    try:
        # Create testset first to get the ID
        testset = crud_testset.create_testset(db, testset_in)
        
        # Process uploaded files if provided
        file_update = {}
        if source_file:
            source_filename, source_path = crud_testset.save_uploaded_file(source_file, testset.testset_id, "source")
            file_update["source_file_name"] = source_filename
            file_update["source_file_path_on_server"] = source_path
            file_update["source_file_path"] = source_path  # Keep for backward compatibility
            
        if target_file:
            target_filename, target_path = crud_testset.save_uploaded_file(target_file, testset.testset_id, "target")
            file_update["target_file_name"] = target_filename
            file_update["target_file_path_on_server"] = target_path
            file_update["target_file_path"] = target_path  # Keep for backward compatibility
            
        # Update the testset with file information if files were uploaded
        if file_update:
            testset = crud_testset.update_testset(db, testset_id=testset.testset_id, testset=file_update)
            
        return testset
    except IntegrityError as e:
        error_msg = str(e)
        if "UNIQUE constraint failed: testsets.testset_name" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A testset with this name already exists. Testset names must be unique across all language pairs."
            )
        elif "FOREIGN KEY constraint failed" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The specified language pair does not exist."
            )
        else:
            # Re-raise any other integrity errors
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {error_msg}"
            )

@router.put("/{testset_id}", response_model=Testset)
async def update_testset(
    *,
    db: Session = Depends(get_db),
    testset_id: int,
    data: Optional[str] = Form(None),
    source_file: Optional[UploadFile] = File(None),
    target_file: Optional[UploadFile] = File(None),
    testset_name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    current_user: User = Depends(get_current_release_manager_user)
) -> Any:
    """
    Update a testset with file upload support. Only release manager or admin can update.
    """
    # Get existing testset
    testset = crud_testset.get_testset(db, testset_id=testset_id)
    if not testset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Testset not found"
        )
    
    # Process update data
    update_data = {}
    if data:
        try:
            testset_data = json.loads(data)
            # Create dictionary with only the fields that are provided
            for key, value in testset_data.items():
                if value is not None:
                    update_data[key] = value
        except (json.JSONDecodeError, ValueError) as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid JSON in 'data' field: {str(e)}"
            )
    else:
        # Create from individual fields
        if testset_name is not None:
            update_data["testset_name"] = testset_name
        if description is not None:
            update_data["description"] = description
    
    # Update basic info first if we have any updates
    if update_data:
        testset = crud_testset.update_testset(db, testset_id=testset_id, testset=update_data)
    
    # Process uploaded files if provided
    file_update = {}
    if source_file:
        # Remove old file if exists
        if testset.source_file_path_on_server and os.path.exists(testset.source_file_path_on_server):
            try:
                os.remove(testset.source_file_path_on_server)
            except Exception as e:
                print(f"Error removing old source file: {str(e)}")
                
        source_filename, source_path = crud_testset.save_uploaded_file(source_file, testset.testset_id, "source")
        file_update["source_file_name"] = source_filename
        file_update["source_file_path_on_server"] = source_path
        file_update["source_file_path"] = source_path  # Keep for backward compatibility
        
    if target_file:
        # Remove old file if exists
        if testset.target_file_path_on_server and os.path.exists(testset.target_file_path_on_server):
            try:
                os.remove(testset.target_file_path_on_server)
            except Exception as e:
                print(f"Error removing old target file: {str(e)}")
                
        target_filename, target_path = crud_testset.save_uploaded_file(target_file, testset.testset_id, "target")
        file_update["target_file_name"] = target_filename
        file_update["target_file_path_on_server"] = target_path
        file_update["target_file_path"] = target_path  # Keep for backward compatibility
        
    # Update the testset with file information if files were uploaded
    if file_update:
        testset = crud_testset.update_testset(db, testset_id=testset_id, testset=file_update)
        
    return testset

@router.get("/{testset_id}/files/{file_type}", response_class=Response)
def download_testset_file(
    testset_id: int,
    file_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Download a testset file
    
    file_type must be one of: 'source', 'target'
    """
    # Validate file_type
    valid_file_types = ["source", "target"]
    if file_type not in valid_file_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Must be one of: {', '.join(valid_file_types)}"
        )
    
    # Get testset
    testset = crud_testset.get_testset(db, testset_id=testset_id)
    if not testset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Testset not found"
        )
    
    # Determine which file to serve
    if file_type == "source":
        if not testset.source_file_path_on_server or not os.path.exists(testset.source_file_path_on_server):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Source file not found"
            )
        file_path = testset.source_file_path_on_server
        filename = testset.source_file_name
    else:  # target
        if not testset.target_file_path_on_server or not os.path.exists(testset.target_file_path_on_server):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target file not found"
            )
        file_path = testset.target_file_path_on_server
        filename = testset.target_file_name
    
    # Return file response
    return Response(
        content=open(file_path, "rb").read(),
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

@router.delete("/{testset_id}", response_model=bool)
def delete_testset(
    *,
    db: Session = Depends(get_db),
    testset_id: int,
    current_user: User = Depends(get_current_release_manager_user)
) -> Any:
    """
    Delete a testset. Only release manager or admin can delete.
    """
    testset = crud_testset.get_testset(db, testset_id=testset_id)
    if not testset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Testset not found"
        )
    
    # Check if the testset can be deleted
    from app.db.models import EvaluationJob, TrainingResult
    
    # Check for evaluation jobs using this testset
    eval_jobs = db.query(EvaluationJob).filter(EvaluationJob.testset_id == testset_id).count()
    if eval_jobs > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete testset because it is used by {eval_jobs} evaluation job(s). Delete the evaluation jobs first."
        )
    
    # Check for training results using this testset
    training_results = db.query(TrainingResult).filter(TrainingResult.testset_id == testset_id).count()
    if training_results > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete testset because it is used by {training_results} training result(s). Delete the training results first."
        )
    
    # Attempt to delete
    result = crud_testset.delete_testset(db, testset_id=testset_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete the testset. It may be in use by another process."
        )
    
    return result

@router.get("/{testset_id}/reference-content")
def get_reference_file_content(
    testset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Get the content of the reference target file for comparison viewing
    """
    # Get testset
    testset = crud_testset.get_testset(db, testset_id=testset_id)
    if not testset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Testset not found"
        )
    
    # Check if target file exists
    if not testset.target_file_path_on_server or not os.path.exists(testset.target_file_path_on_server):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reference target file not found"
        )
    
    try:
        with open(testset.target_file_path_on_server, "r", encoding="utf-8") as file:
            content = file.read()
        return {"content": content}
    except UnicodeDecodeError:
        # Try with different encoding if UTF-8 fails
        try:
            with open(testset.target_file_path_on_server, "r", encoding="latin-1") as file:
                content = file.read()
            return {"content": content}
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error reading file content: {str(e)}"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error reading file content: {str(e)}"
        ) 