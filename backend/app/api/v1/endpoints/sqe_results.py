from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import math

from ....crud.crud_sqe_results import sqe_results
from ....schemas.sqe_results import (
    SQEResultCreate, 
    SQEResultUpdate, 
    SQEResultResponse, 
    SQEResultSummary,
    PaginatedSQEResults,
    SQEAnalytics
)
from ....core.deps import get_db, get_current_active_user
from ....db.models import User
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/", response_model=PaginatedSQEResults)
def get_sqe_results(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    language_pair_id: Optional[int] = Query(None),
    score_min: Optional[float] = Query(None, ge=1.0, le=3.0),
    score_max: Optional[float] = Query(None, ge=1.0, le=3.0),
    has_one_point_case: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get paginated SQE results with optional filters
    """
    try:
        items, total = sqe_results.get_multi(
            db=db,
            page=page,
            size=size,
            language_pair_id=language_pair_id,
            score_min=score_min,
            score_max=score_max,
            has_one_point_case=has_one_point_case
        )

        # Transform to summary format
        summaries = []
        for item in items:
            lang_pair_name = f"{item.model_version.language_pair.source_language_code}-{item.model_version.language_pair.target_language_code}"
            
            summary = SQEResultSummary(
                sqe_result_id=item.sqe_result_id,
                version_id=item.version_id,
                model_version_name=item.model_version.version_name,
                language_pair_name=lang_pair_name,
                average_score=item.average_score,
                total_test_cases=item.total_test_cases,
                test_cases_changed=item.test_cases_changed,
                change_percentage=item.change_percentage,
                has_one_point_case=item.has_one_point_case,
                test_date=item.test_date,
                created_at=item.created_at
            )
            summaries.append(summary)

        pages = math.ceil(total / size) if total > 0 else 0

        return PaginatedSQEResults(
            items=summaries,
            total=total,
            page=page,
            size=size,
            pages=pages
        )
    except Exception as e:
        logger.error(f"Error fetching SQE results: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching SQE results")

@router.post("/", response_model=SQEResultResponse)
def create_sqe_result(
    *,
    db: Session = Depends(get_db),
    sqe_result_in: SQEResultCreate,
    current_user: User = Depends(get_current_active_user)
):
    """
    Create new SQE result
    """
    try:
        # Check if SQE result already exists for this version
        existing = sqe_results.get_by_version_id(db=db, version_id=sqe_result_in.version_id)
        if existing:
            raise HTTPException(
                status_code=400, 
                detail="SQE result already exists for this model version"
            )

        sqe_result = sqe_results.create(
            db=db, 
            obj_in=sqe_result_in, 
            tested_by_user_id=current_user.user_id
        )

        # Build response with related data
        lang_pair_name = f"{sqe_result.model_version.language_pair.source_language_code}-{sqe_result.model_version.language_pair.target_language_code}"
        
        return SQEResultResponse(
            sqe_result_id=sqe_result.sqe_result_id,
            version_id=sqe_result.version_id,
            average_score=sqe_result.average_score,
            total_test_cases=sqe_result.total_test_cases,
            test_cases_changed=sqe_result.test_cases_changed,
            change_percentage=sqe_result.change_percentage,
            has_one_point_case=sqe_result.has_one_point_case,
            test_date=sqe_result.test_date,
            notes=sqe_result.notes,
            tested_by_user_id=sqe_result.tested_by_user_id,
            tested_by_username=sqe_result.tested_by.username if sqe_result.tested_by else None,
            model_version_name=sqe_result.model_version.version_name,
            language_pair_name=lang_pair_name,
            created_at=sqe_result.created_at,
            updated_at=sqe_result.updated_at
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating SQE result: {str(e)}")
        raise HTTPException(status_code=500, detail="Error creating SQE result")

@router.get("/{sqe_result_id}", response_model=SQEResultResponse)
def get_sqe_result(
    sqe_result_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get specific SQE result by ID
    """
    sqe_result = sqe_results.get(db=db, sqe_result_id=sqe_result_id)
    if not sqe_result:
        raise HTTPException(status_code=404, detail="SQE result not found")

    lang_pair_name = f"{sqe_result.model_version.language_pair.source_language_code}-{sqe_result.model_version.language_pair.target_language_code}"
    
    return SQEResultResponse(
        sqe_result_id=sqe_result.sqe_result_id,
        version_id=sqe_result.version_id,
        average_score=sqe_result.average_score,
        total_test_cases=sqe_result.total_test_cases,
        test_cases_changed=sqe_result.test_cases_changed,
        change_percentage=sqe_result.change_percentage,
        has_one_point_case=sqe_result.has_one_point_case,
        test_date=sqe_result.test_date,
        notes=sqe_result.notes,
        tested_by_user_id=sqe_result.tested_by_user_id,
        tested_by_username=sqe_result.tested_by.username if sqe_result.tested_by else None,
        model_version_name=sqe_result.model_version.version_name,
        language_pair_name=lang_pair_name,
        created_at=sqe_result.created_at,
        updated_at=sqe_result.updated_at
    )

@router.get("/version/{version_id}", response_model=Optional[SQEResultResponse])
def get_sqe_result_by_version(
    version_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get SQE result for a specific model version
    """
    sqe_result = sqe_results.get_by_version_id(db=db, version_id=version_id)
    if not sqe_result:
        return None

    lang_pair_name = f"{sqe_result.model_version.language_pair.source_language_code}-{sqe_result.model_version.language_pair.target_language_code}"
    
    return SQEResultResponse(
        sqe_result_id=sqe_result.sqe_result_id,
        version_id=sqe_result.version_id,
        average_score=sqe_result.average_score,
        total_test_cases=sqe_result.total_test_cases,
        test_cases_changed=sqe_result.test_cases_changed,
        change_percentage=sqe_result.change_percentage,
        has_one_point_case=sqe_result.has_one_point_case,
        test_date=sqe_result.test_date,
        notes=sqe_result.notes,
        tested_by_user_id=sqe_result.tested_by_user_id,
        tested_by_username=sqe_result.tested_by.username if sqe_result.tested_by else None,
        model_version_name=sqe_result.model_version.version_name,
        language_pair_name=lang_pair_name,
        created_at=sqe_result.created_at,
        updated_at=sqe_result.updated_at
    )

@router.put("/{sqe_result_id}", response_model=SQEResultResponse)
def update_sqe_result(
    *,
    db: Session = Depends(get_db),
    sqe_result_id: int,
    sqe_result_in: SQEResultUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """
    Update SQE result
    """
    sqe_result = sqe_results.get(db=db, sqe_result_id=sqe_result_id)
    if not sqe_result:
        raise HTTPException(status_code=404, detail="SQE result not found")

    sqe_result = sqe_results.update(db=db, db_obj=sqe_result, obj_in=sqe_result_in)
    
    lang_pair_name = f"{sqe_result.model_version.language_pair.source_language_code}-{sqe_result.model_version.language_pair.target_language_code}"
    
    return SQEResultResponse(
        sqe_result_id=sqe_result.sqe_result_id,
        version_id=sqe_result.version_id,
        average_score=sqe_result.average_score,
        total_test_cases=sqe_result.total_test_cases,
        test_cases_changed=sqe_result.test_cases_changed,
        change_percentage=sqe_result.change_percentage,
        has_one_point_case=sqe_result.has_one_point_case,
        test_date=sqe_result.test_date,
        notes=sqe_result.notes,
        tested_by_user_id=sqe_result.tested_by_user_id,
        tested_by_username=sqe_result.tested_by.username if sqe_result.tested_by else None,
        model_version_name=sqe_result.model_version.version_name,
        language_pair_name=lang_pair_name,
        created_at=sqe_result.created_at,
        updated_at=sqe_result.updated_at
    )

@router.delete("/{sqe_result_id}")
def delete_sqe_result(
    *,
    db: Session = Depends(get_db),
    sqe_result_id: int,
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete SQE result (Admin only)
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")

    sqe_result = sqe_results.get(db=db, sqe_result_id=sqe_result_id)
    if not sqe_result:
        raise HTTPException(status_code=404, detail="SQE result not found")

    sqe_results.remove(db=db, sqe_result_id=sqe_result_id)
    return {"message": "SQE result deleted successfully"}

@router.get("/analytics/language-pair/{language_pair_id}")
def get_language_pair_trends(
    language_pair_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get SQE score trends for a specific language pair
    """
    try:
        trends = sqe_results.get_language_pair_trends(db=db, language_pair_id=language_pair_id)
        return {"trends": trends}
    except Exception as e:
        logger.error(f"Error fetching language pair trends: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching trends")

@router.get("/analytics/comparison")
def get_cross_comparison(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get cross language pair comparison
    """
    try:
        comparison = sqe_results.get_cross_language_comparison(db=db)
        return {"comparison": comparison}
    except Exception as e:
        logger.error(f"Error fetching cross comparison: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching comparison")

@router.get("/analytics/overall")
def get_overall_analytics(
    language_pair_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get overall SQE analytics including stats and distribution
    Optionally filter by language pair
    """
    try:
        overall_stats = sqe_results.get_overall_stats(db=db)
        score_distribution = sqe_results.get_score_distribution(db=db, language_pair_id=language_pair_id)
        cross_comparison = sqe_results.get_cross_language_comparison(db=db)
        
        return {
            "overall_stats": overall_stats,
            "score_distribution": score_distribution,
            "cross_comparison": cross_comparison
        }
    except Exception as e:
        logger.error(f"Error fetching overall analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching analytics")

@router.get("/analytics/distribution")
def get_score_distribution(
    language_pair_id: Optional[int] = Query(None, description="Filter by language pair ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get score distribution analytics, optionally filtered by language pair
    """
    try:
        distribution = sqe_results.get_score_distribution(db=db, language_pair_id=language_pair_id)
        return distribution
    except Exception as e:
        logger.error(f"Error fetching score distribution: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching distribution") 