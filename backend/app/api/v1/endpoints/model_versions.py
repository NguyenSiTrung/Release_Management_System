from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response, UploadFile, File, Form, Request, Query
from sqlalchemy.orm import Session
import os
from app.core.deps import get_db, get_current_release_manager_user, get_current_active_user
from app.crud import crud_model_version
from app.schemas.model_version import ModelVersion, ModelVersionCreate, ModelVersionUpdate, ModelVersionDetail, PaginatedModelVersions
from app.db.models import User
from app.core.config import settings
import math

router = APIRouter()

@router.get("/", response_model=PaginatedModelVersions)
def read_model_versions(
    db: Session = Depends(get_db),
    lang_pair_id: int = None,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(10, ge=1, le=10000, description="Number of records to return"),
    page: Optional[int] = Query(None, ge=1, description="Page number (alternative to skip)"),
    size: Optional[int] = Query(None, ge=1, le=10000, description="Page size (alternative to limit)"),
    sort_by: str = "release_date",
    sort_desc: bool = True
) -> Any:
    """
    Retrieve model versions with pagination.
    Can use either skip/limit or page/size pagination parameters.
    """
    if not lang_pair_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="lang_pair_id is required"
        )
    
    # Handle page/size parameters as alternative to skip/limit
    if page is not None:
        skip = (page - 1) * (size or limit)
        limit = size or limit
    
    # Get total count
    total = crud_model_version.count_model_versions(
        db,
        lang_pair_id=lang_pair_id
    )
    
    # Get model versions
    model_versions = crud_model_version.get_multi(
        db,
        skip=skip,
        limit=limit,
        lang_pair_id=lang_pair_id
    )
    
    # Calculate pagination info
    actual_page = (skip // limit) + 1 if limit > 0 else 1
    total_pages = math.ceil(total / limit) if limit > 0 else 1
    
    return PaginatedModelVersions(
        items=model_versions,
        total=total,
        page=actual_page,
        size=limit,
        pages=total_pages
    )

@router.get("/{version_id}", response_model=ModelVersionDetail)
def read_model_version(
    *,
    db: Session = Depends(get_db),
    version_id: int
) -> Any:
    """
    Get a specific model version by id with related data.
    """
    model_version = crud_model_version.get(db, version_id=version_id)
    if not model_version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model version not found"
        )
    
    # Get release note if exists
    from app.crud import crud_release_note, crud_training_result
    
    release_note = crud_release_note.get_by_version(db=db, version_id=version_id)
    
    # Get training results
    training_results = crud_training_result.get_multi_by_version(
        db=db, version_id=version_id
    )
    
    # Create response with additional data
    response = ModelVersionDetail.from_orm(model_version)
    response.release_note = release_note
    response.training_results = training_results
    
    return response

@router.post("/", response_model=ModelVersion)
async def create_model_version(
    request: Request,
    data: Optional[str] = Form(None),
    model_file: Optional[UploadFile] = File(None),
    hparams_file: Optional[UploadFile] = File(None),
    base_model_file: Optional[UploadFile] = File(None),
    base_hparams_file: Optional[UploadFile] = File(None),
    lang_pair_id: Optional[str] = Form(None),
    version_name: Optional[str] = Form(None),
    release_date: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Create new model version with optional file upload.
    Accept both structured JSON data or form fields.
    """
    # Enhanced debug logging
    print("="*80)
    print("CREATE MODEL VERSION REQUEST")
    print(f"Raw data field: {repr(data)}")
    print(f"Lang pair ID: {repr(lang_pair_id)}, type: {type(lang_pair_id)}")
    print(f"Version name: {repr(version_name)}, type: {type(version_name)}")
    print(f"Release date: {repr(release_date)}, type: {type(release_date)}")
    print(f"Description: {repr(description)}, type: {type(description)}")
    print(f"Model file: {model_file.filename if model_file else 'None'}")
    print(f"HParams file: {hparams_file.filename if hparams_file else 'None'}")
    print(f"Base model file: {base_model_file.filename if base_model_file else 'None'}")
    print(f"Base HParams file: {base_hparams_file.filename if base_hparams_file else 'None'}")
    print(f"Current user: {current_user.username if current_user else 'None'}")
    
    # In ra thông tin về request Headers
    print("Request headers:")
    for name, value in request.headers.items():
        print(f"  {name}: {value}")
    
    # In ra thông tin về Content-Type
    content_type = request.headers.get("content-type", "No content-type")
    print(f"Content-Type: {content_type}")
    
    # In ra thông tin về body
    print("Trying to read raw body:")
    try:
        body_bytes = await request.body()
        body_str = body_bytes.decode('utf-8', errors='replace')
        print(f"Raw body ({len(body_bytes)} bytes): {body_str[:500]}...")
    except Exception as e:
        print(f"Error reading body: {str(e)}")
    
    print("="*80)
    
    # Process input, either from JSON or form fields
    model_version_data = None
    
    # First try to parse JSON data field if present
    if data:
        try:
            import json
            print(f"Parsing JSON data: {data}")
            json_data = json.loads(data)
            print(f"Parsed JSON data: {json_data}")
            model_version_data = ModelVersionCreate(**json_data)
            print(f"Using JSON data field: {model_version_data}")
        except Exception as e:
            print(f"Error parsing JSON data: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid JSON data format: {str(e)}"
            )
    # Otherwise use form fields
    elif lang_pair_id and version_name:
        try:
            # Chuyển đổi lang_pair_id thành số nguyên
            lang_pair_id_int = None
            try:
                lang_pair_id_int = int(lang_pair_id)
            except (ValueError, TypeError):
                raise ValueError(f"lang_pair_id must be a valid integer, got: {lang_pair_id}")
            
            model_version_data = ModelVersionCreate(
                lang_pair_id=lang_pair_id_int,
                version_name=version_name,
                release_date=release_date,
                description=description
            )
            print(f"Using form fields: {model_version_data}")
        except Exception as e:
            print(f"Error creating model from form data: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid form data: {str(e)}"
            )
    else:
        print("Missing required fields for model version creation")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Either 'data' JSON field or individual form fields (lang_pair_id, version_name) are required"
        )
    
    # Debug logging
    print(f"Creating model version with: lang_pair_id={model_version_data.lang_pair_id}, version_name={model_version_data.version_name}")
    print(f"Release date: {model_version_data.release_date}, Description: {model_version_data.description}")
    print(f"Model file provided: {model_file is not None}, HParams file provided: {hparams_file is not None}")
    print(f"Base model file provided: {base_model_file is not None}, Base HParams file provided: {base_hparams_file is not None}")
    if model_file:
        print(f"Model file name: {model_file.filename}, content type: {model_file.content_type}")
    if hparams_file:
        print(f"HParams file name: {hparams_file.filename}, content type: {hparams_file.content_type}")
    if base_model_file:
        print(f"Base model file name: {base_model_file.filename}, content type: {base_model_file.content_type}")
    if base_hparams_file:
        print(f"Base HParams file name: {base_hparams_file.filename}, content type: {base_hparams_file.content_type}")
    
    # Check if model files directory exists
    storage_path = settings.MODEL_FILES_STORAGE_PATH
    print(f"Storage path: {storage_path}, exists: {os.path.exists(storage_path)}")
    if not os.path.exists(storage_path):
        # Try to create it
        try:
            os.makedirs(storage_path, exist_ok=True)
            print(f"Created storage path: {storage_path}")
        except Exception as e:
            print(f"Error creating storage path: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create model storage directory: {str(e)}"
            )
    
    try:
        # Create model version with files
        db_obj = crud_model_version.create(
            db=db, 
            obj_in=model_version_data, 
            model_file=model_file, 
            hparams_file=hparams_file,
            base_model_file=base_model_file,
            base_hparams_file=base_hparams_file
        )
        return db_obj
    except ValueError as ve:
        print(f"Validation error: {str(ve)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Validation error: {str(ve)}"
        )
    except Exception as e:
        print(f"Error creating model version: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating model version: {str(e)}"
        )

@router.put("/{version_id}", response_model=ModelVersion)
async def update_model_version(
    version_id: int,
    data: Optional[str] = Form(None),  # String JSON in form-data
    model_file: Optional[UploadFile] = File(None),
    hparams_file: Optional[UploadFile] = File(None),
    base_model_file: Optional[UploadFile] = File(None),
    base_hparams_file: Optional[UploadFile] = File(None),
    version_name: Optional[str] = Form(None),
    release_date: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    lang_pair_id: Optional[str] = Form(None),  # Nhận dưới dạng chuỗi từ form data
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_release_manager_user)
) -> Any:
    """
    Update a model version with optional file upload.
    Accept both structured JSON data or form fields.
    """
    model_version = crud_model_version.get(db, version_id=version_id)
    if not model_version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model version not found"
        )
    
    # Enhanced debug logging
    print("="*80)
    print(f"UPDATE MODEL VERSION REQUEST - ID: {version_id}")
    print(f"Raw data field: {repr(data)}")
    print(f"Lang pair ID: {repr(lang_pair_id)}, type: {type(lang_pair_id)}")
    print(f"Version name: {repr(version_name)}, type: {type(version_name)}")
    print(f"Release date: {repr(release_date)}, type: {type(release_date)}")
    print(f"Description: {repr(description)}, type: {type(description)}")
    print(f"Model file: {model_file.filename if model_file else 'None'}")
    print(f"HParams file: {hparams_file.filename if hparams_file else 'None'}")
    print(f"Base model file: {base_model_file.filename if base_model_file else 'None'}")
    print(f"Base HParams file: {base_hparams_file.filename if base_hparams_file else 'None'}")
    print(f"Current user: {current_user.username if current_user else 'None'}")
    print("="*80)
    
    # Process input, either from JSON or form fields
    model_version_data = None
    
    # First try to parse JSON data field if present
    if data:
        try:
            import json
            print(f"Parsing JSON data: {data}")
            json_data = json.loads(data)
            print(f"Parsed JSON data: {json_data}")
            model_version_data = ModelVersionUpdate(**json_data)
            print(f"Using JSON data field: {model_version_data}")
        except Exception as e:
            print(f"Error parsing JSON data: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid JSON data format: {str(e)}"
            )
    # Otherwise use form fields
    else:
        try:
            update_data = {}
            if version_name is not None:
                update_data["version_name"] = version_name
            if release_date is not None:
                update_data["release_date"] = release_date
            if description is not None:
                update_data["description"] = description
            if lang_pair_id is not None:
                # Chuyển đổi lang_pair_id thành số nguyên
                try:
                    update_data["lang_pair_id"] = int(lang_pair_id)
                except (ValueError, TypeError):
                    raise ValueError(f"lang_pair_id must be a valid integer, got: {lang_pair_id}")
                
            model_version_data = ModelVersionUpdate(**update_data)
            print(f"Using form fields: {model_version_data}")
        except Exception as e:
            print(f"Error creating model from form data: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid form data: {str(e)}"
            )
    
    # Update model version with files
    try:
        db_obj = crud_model_version.update(
            db=db, 
            db_obj=model_version, 
            obj_in=model_version_data, 
            model_file=model_file, 
            hparams_file=hparams_file,
            base_model_file=base_model_file,
            base_hparams_file=base_hparams_file
        )
        return db_obj
    except Exception as e:
        print(f"Error updating model version: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating model version: {str(e)}"
        )

@router.delete("/{version_id}", response_model=ModelVersion)
def delete_model_version(
    *,
    db: Session = Depends(get_db),
    version_id: int,
    current_user: User = Depends(get_current_release_manager_user)
) -> Any:
    """
    Delete a model version and its associated files.
    """
    model_version = crud_model_version.remove(db=db, version_id=version_id)
    if not model_version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model version not found"
        )
    return model_version

@router.get("/{version_id}/files/{file_type}", response_class=Response)
def download_model_file(
    version_id: int,
    file_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Download a model file
    
    file_type must be one of: 'model', 'hparams', 'base_model', 'base_hparams'
    """
    # Validate file_type
    valid_file_types = ["model", "hparams", "base_model", "base_hparams"]
    if file_type not in valid_file_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Must be one of: {', '.join(valid_file_types)}"
        )
    
    # Get model version
    model_version = crud_model_version.get(db, version_id=version_id)
    if not model_version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model version not found"
        )
    
    # Determine which file to serve
    if file_type == "model":
        if not model_version.model_file_path_on_server or not os.path.exists(model_version.model_file_path_on_server):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Model file not found"
            )
        file_path = model_version.model_file_path_on_server
        filename = model_version.model_file_name
    elif file_type == "hparams":
        if not model_version.hparams_file_path_on_server or not os.path.exists(model_version.hparams_file_path_on_server):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="HParams file not found"
            )
        file_path = model_version.hparams_file_path_on_server
        filename = model_version.hparams_file_name
    elif file_type == "base_model":
        if not model_version.base_model_file_path_on_server or not os.path.exists(model_version.base_model_file_path_on_server):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Base model file not found"
            )
        file_path = model_version.base_model_file_path_on_server
        filename = model_version.base_model_file_name
    else:  # base_hparams
        if not model_version.base_hparams_file_path_on_server or not os.path.exists(model_version.base_hparams_file_path_on_server):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Base HParams file not found"
            )
        file_path = model_version.base_hparams_file_path_on_server
        filename = model_version.base_hparams_file_name
    
    # Return file response
    return Response(
        content=open(file_path, "rb").read(),
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

@router.get("/export/{lang_pair_id}", response_class=Response)
def export_model_versions(
    lang_pair_id: int,
    format: str = "excel",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Export model versions with training results and release notes for a language pair.
    Only for admin users.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Check if language pair exists
    from app.crud import crud_language_pair, crud_training_result, crud_release_note, crud_testset
    
    language_pair = crud_language_pair.get_language_pair(db, lang_pair_id=lang_pair_id)
    if not language_pair:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Language pair not found"
        )
    
    # Get all model versions for this language pair
    model_versions = crud_model_version.get_multi(
        db, lang_pair_id=lang_pair_id
    )
    
    # For each model version, get its training results and release notes
    result = []
    for version in model_versions:
        training_results = crud_training_result.get_multi_by_version(
            db, version_id=version.version_id
        )
        
        release_note = crud_release_note.get_by_version(
            db, version_id=version.version_id
        )
        
        # Get testset names for each training result
        for tr in training_results:
            testset = crud_testset.get_testset(db, testset_id=tr.testset_id)
            if testset:
                tr.testset_name = testset.testset_name
        
        # Create a comprehensive data structure
        version_data = {
            "version_id": version.version_id,
            "version_name": version.version_name,
            "release_date": version.release_date,
            "description": version.description,
            "created_at": version.created_at,
            "updated_at": version.updated_at,
            "training_results": training_results,
            "release_note": release_note
        }
        
        result.append(version_data)
    
    # Create export based on format
    if format.lower() == "excel":
        import pandas as pd
        import io
        from datetime import datetime
        
        # Create Excel file in memory
        output = io.BytesIO()
        
        # Create a Pandas Excel writer using the BytesIO object
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            # Convert model versions to DataFrame
            versions_df = pd.DataFrame([{
                "Version ID": v["version_id"],
                "Version Name": v["version_name"],
                "Release Date": v["release_date"],
                "Description": v["description"],
                "Created At": v["created_at"],
                "Updated At": v["updated_at"]
            } for v in result])
            
            # Write model versions sheet
            versions_df.to_excel(writer, sheet_name='Model Versions', index=False)
            
            # Training results dataframe
            all_tr = []
            for v in result:
                for tr in v["training_results"]:
                    all_tr.append({
                        "Version ID": v["version_id"],
                        "Version Name": v["version_name"],
                        "Testset ID": tr.testset_id,
                        "Testset Name": getattr(tr, "testset_name", "N/A"),
                        "Base Model BLEU": tr.base_model_bleu,
                        "Base Model COMET": tr.base_model_comet,
                        "Finetuned Model BLEU": tr.finetuned_model_bleu,
                        "Finetuned Model COMET": tr.finetuned_model_comet,
                        "Training Details": tr.training_details_notes
                    })
            
            # Write training results sheet if any
            if all_tr:
                tr_df = pd.DataFrame(all_tr)
                tr_df.to_excel(writer, sheet_name='Training Results', index=False)
            
            # Release notes dataframe
            all_rn = []
            for v in result:
                if v["release_note"]:
                    all_rn.append({
                        "Version ID": v["version_id"],
                        "Version Name": v["version_name"],
                        "Title": v["release_note"].title,
                        "Content": v["release_note"].content
                    })
            
            # Write release notes sheet if any
            if all_rn:
                rn_df = pd.DataFrame(all_rn)
                rn_df.to_excel(writer, sheet_name='Release Notes', index=False)
        
        # Get the value from the BytesIO object
        output.seek(0)
        
        # Return Excel file
        return Response(
            content=output.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename=model_versions_{lang_pair_id}_{datetime.now().strftime('%Y%m%d')}.xlsx"
            }
        )
    
    elif format.lower() == "markdown":
        # Generate markdown content
        markdown = f"# Model Versions for Language Pair ID: {lang_pair_id}\n\n"
        markdown += f"Language Pair: {language_pair.source_language_code} → {language_pair.target_language_code}\n\n"
        
        for v in result:
            markdown += f"## {v['version_name']}\n\n"
            markdown += f"- **ID**: {v['version_id']}\n"
            markdown += f"- **Release Date**: {v['release_date']}\n"
            markdown += f"- **Description**: {v['description']}\n"
            markdown += f"- **Created**: {v['created_at']}\n"
            markdown += f"- **Updated**: {v['updated_at']}\n\n"
            
            # Add release note if exists
            if v['release_note']:
                markdown += "### Release Note\n\n"
                markdown += f"**Title**: {v['release_note'].title}\n\n"
                markdown += f"{v['release_note'].content}\n\n"
            
            # Add training results if exist
            if v['training_results']:
                markdown += "### Training Results\n\n"
                markdown += "| Testset | Base BLEU | Base COMET | Finetuned BLEU | Finetuned COMET |\n"
                markdown += "|---------|-----------|------------|----------------|----------------|\n"
                
                for tr in v['training_results']:
                    testset_name = getattr(tr, "testset_name", f"ID: {tr.testset_id}")
                    markdown += f"| {testset_name} | {tr.base_model_bleu} | {tr.base_model_comet} | {tr.finetuned_model_bleu} | {tr.finetuned_model_comet} |\n"
                
                markdown += "\n"
                
                # Add training details if any
                for tr in v['training_results']:
                    if tr.training_details_notes:
                        markdown += f"**Training Details for {getattr(tr, 'testset_name', f'Testset ID: {tr.testset_id}')}**:\n\n"
                        markdown += f"{tr.training_details_notes}\n\n"
            
            markdown += "---\n\n"
        
        # Return markdown content
        return Response(
            content=markdown,
            media_type="text/markdown",
            headers={
                "Content-Disposition": f"attachment; filename=model_versions_{lang_pair_id}_{datetime.now().strftime('%Y%m%d')}.md"
            }
        )
    
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported export format. Use 'excel' or 'markdown'."
        ) 