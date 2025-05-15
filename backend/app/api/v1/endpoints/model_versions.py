from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_release_manager_user, get_current_active_user
from app.crud import crud_model_version
from app.schemas.model_version import ModelVersion, ModelVersionCreate, ModelVersionUpdate
from app.db.models import User

router = APIRouter()

@router.get("/", response_model=List[ModelVersion])
def read_model_versions(
    db: Session = Depends(get_db),
    lang_pair_id: int = None,
    skip: int = 0,
    limit: int = 100,
    sort_by: str = "release_date",
    sort_desc: bool = True
) -> Any:
    """
    Retrieve model versions.
    """
    if not lang_pair_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="lang_pair_id is required"
        )
    model_versions = crud_model_version.get_model_versions(
        db,
        lang_pair_id=lang_pair_id,
        skip=skip,
        limit=limit,
        sort_by=sort_by,
        sort_desc=sort_desc
    )
    return model_versions

@router.get("/{version_id}", response_model=ModelVersion)
def read_model_version(
    *,
    db: Session = Depends(get_db),
    version_id: int
) -> Any:
    """
    Get a specific model version by id.
    """
    model_version = crud_model_version.get_model_version(db, version_id=version_id)
    if not model_version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model version not found"
        )
    return model_version

@router.post("/", response_model=ModelVersion)
def create_model_version(
    *,
    db: Session = Depends(get_db),
    model_version_in: ModelVersionCreate,
    current_user: User = Depends(get_current_release_manager_user)
) -> Any:
    """
    Create new model version.
    """
    model_version = crud_model_version.create_model_version(db, model_version_in)
    return model_version

@router.put("/{version_id}", response_model=ModelVersion)
def update_model_version(
    *,
    db: Session = Depends(get_db),
    version_id: int,
    model_version_in: ModelVersionUpdate,
    current_user: User = Depends(get_current_release_manager_user)
) -> Any:
    """
    Update a model version.
    """
    model_version = crud_model_version.get_model_version(db, version_id=version_id)
    if not model_version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model version not found"
        )
    model_version = crud_model_version.update_model_version(
        db, version_id=version_id, model_version=model_version_in
    )
    return model_version

@router.delete("/{version_id}", response_model=bool)
def delete_model_version(
    *,
    db: Session = Depends(get_db),
    version_id: int,
    current_user: User = Depends(get_current_release_manager_user)
) -> Any:
    """
    Delete a model version.
    """
    model_version = crud_model_version.get_model_version(db, version_id=version_id)
    if not model_version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model version not found"
        )
    return crud_model_version.delete_model_version(db, version_id=version_id)

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
    model_versions = crud_model_version.get_model_versions(
        db, lang_pair_id=lang_pair_id
    )
    
    # For each model version, get its training results and release notes
    result = []
    for version in model_versions:
        training_results = crud_training_result.get_training_results_by_version(
            db, version_id=version.version_id
        )
        
        release_note = crud_release_note.get_release_note(
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