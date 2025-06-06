from typing import List, Optional, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, desc, asc, func
from ..db.models import SQEResult, ModelVersion, LanguagePair, User
from ..schemas.sqe_results import SQEResultCreate, SQEResultUpdate
import math

class CRUDSQEResults:
    def get(self, db: Session, sqe_result_id: int) -> Optional[SQEResult]:
        """Get SQE result by ID with related data"""
        return db.query(SQEResult).options(
            joinedload(SQEResult.model_version).joinedload(ModelVersion.language_pair),
            joinedload(SQEResult.tested_by)
        ).filter(SQEResult.sqe_result_id == sqe_result_id).first()

    def get_by_version_id(self, db: Session, version_id: int) -> Optional[SQEResult]:
        """Get SQE result by model version ID"""
        return db.query(SQEResult).options(
            joinedload(SQEResult.model_version).joinedload(ModelVersion.language_pair),
            joinedload(SQEResult.tested_by)
        ).filter(SQEResult.version_id == version_id).first()

    def get_multi(
        self, 
        db: Session, 
        page: int = 1, 
        size: int = 10,
        language_pair_id: Optional[int] = None,
        score_min: Optional[float] = None,
        score_max: Optional[float] = None,
        has_one_point_case: Optional[bool] = None
    ) -> Tuple[List[SQEResult], int]:
        """Get paginated SQE results with filters"""
        query = db.query(SQEResult).options(
            joinedload(SQEResult.model_version).joinedload(ModelVersion.language_pair),
            joinedload(SQEResult.tested_by)
        )

        # Apply filters
        if language_pair_id:
            query = query.join(ModelVersion).filter(ModelVersion.lang_pair_id == language_pair_id)
        if score_min is not None:
            query = query.filter(SQEResult.average_score >= score_min)
        if score_max is not None:
            query = query.filter(SQEResult.average_score <= score_max)
        if has_one_point_case is not None:
            query = query.filter(SQEResult.has_one_point_case == has_one_point_case)

        # Get total count
        total = query.count()

        # Apply pagination and ordering
        query = query.order_by(desc(SQEResult.created_at))
        skip = (page - 1) * size
        items = query.offset(skip).limit(size).all()

        return items, total

    def create(self, db: Session, *, obj_in: SQEResultCreate, tested_by_user_id: int) -> SQEResult:
        """Create new SQE result"""
        obj_data = obj_in.dict()
        obj_data["tested_by_user_id"] = tested_by_user_id
        
        db_obj = SQEResult(**obj_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(
        self, 
        db: Session, 
        *, 
        db_obj: SQEResult, 
        obj_in: SQEResultUpdate
    ) -> SQEResult:
        """Update SQE result"""
        obj_data = obj_in.dict(exclude_unset=True)
        
        for field, value in obj_data.items():
            setattr(db_obj, field, value)
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def remove(self, db: Session, *, sqe_result_id: int) -> SQEResult:
        """Delete SQE result"""
        obj = db.query(SQEResult).get(sqe_result_id)
        db.delete(obj)
        db.commit()
        return obj

    def get_language_pair_trends(self, db: Session, language_pair_id: int) -> List[dict]:
        """Get SQE score trends for a specific language pair"""
        results = db.query(
            SQEResult,
            ModelVersion.version_name,
            ModelVersion.release_date
        ).join(ModelVersion).filter(
            ModelVersion.lang_pair_id == language_pair_id
        ).order_by(ModelVersion.release_date.asc()).all()

        trends = []
        for sqe_result, version_name, release_date in results:
            trends.append({
                "version_name": version_name,
                "release_date": release_date,
                "average_score": sqe_result.average_score,
                "total_test_cases": sqe_result.total_test_cases,
                "test_cases_changed": sqe_result.test_cases_changed,
                "change_percentage": sqe_result.change_percentage
            })

        return trends

    def get_cross_language_comparison(self, db: Session) -> List[dict]:
        """Get comparison across different language pairs"""
        results = db.query(
            LanguagePair.lang_pair_id,
            LanguagePair.source_language_code,
            LanguagePair.target_language_code,
            func.max(SQEResult.average_score).label('latest_score'),
            func.max(SQEResult.total_test_cases).label('latest_test_cases'),
            func.count(SQEResult.sqe_result_id).label('total_tests')
        ).outerjoin(
            ModelVersion, LanguagePair.lang_pair_id == ModelVersion.lang_pair_id
        ).outerjoin(
            SQEResult, ModelVersion.version_id == SQEResult.version_id
        ).group_by(
            LanguagePair.lang_pair_id
        ).all()

        comparisons = []
        for result in results:
            lang_pair_name = f"{result.source_language_code}-{result.target_language_code}"
            
            # Check for critical issues based on latest SQE result by test_date
            has_critical_issues = self._language_pair_has_critical_issues(db, result.lang_pair_id)
            
            # Calculate score trend for 1.0-3.0 scale
            score_trend = "stable"
            if result.latest_score:
                if result.latest_score >= 2.5:  # High score (Pass)
                    score_trend = "up"
                elif result.latest_score < 2.0:  # Low score (Fail)
                    score_trend = "down"

            comparisons.append({
                "language_pair_id": result.lang_pair_id,
                "language_pair_name": lang_pair_name,
                "latest_score": result.latest_score,
                "latest_test_cases": result.latest_test_cases,
                "score_trend": score_trend,
                "has_critical_issues": has_critical_issues
            })

        return comparisons

    def _language_pair_has_critical_issues(self, db: Session, lang_pair_id: int) -> bool:
        """
        Check if a language pair has critical issues in its latest SQE result.
        Based on the latest SQE result by test_date.
        """
        # Get the latest SQE result for this language pair based on test_date
        # If test_date is null, fall back to created_at
        latest_result = db.query(SQEResult).join(ModelVersion).filter(
            ModelVersion.lang_pair_id == lang_pair_id
        ).order_by(
            SQEResult.test_date.desc().nulls_last(),
            SQEResult.created_at.desc()
        ).first()
        
        # Return True if the latest result has one point case
        return latest_result and latest_result.has_one_point_case

    def get_overall_stats(self, db: Session) -> dict:
        """Get overall SQE statistics"""
        stats = db.query(
            func.avg(SQEResult.average_score).label('avg_score'),
            func.count(SQEResult.sqe_result_id).label('total_results'),
            func.avg(SQEResult.total_test_cases).label('avg_test_cases')
        ).first()

        # Count critical cases by language pair (each language pair contributes max 1 critical issue)
        # Based on the latest SQE result by test_date for each language pair
        critical_cases_count = self._count_critical_language_pairs(db)

        return {
            "average_score": round(stats.avg_score, 3) if stats.avg_score else 0,  # Changed to 3 decimal places
            "total_results": stats.total_results or 0,
            "critical_cases": critical_cases_count,
            "average_test_cases": round(stats.avg_test_cases, 1) if stats.avg_test_cases else 0
        }

    def _count_critical_language_pairs(self, db: Session) -> int:
        """
        Count language pairs that have critical issues in their latest SQE result.
        Each language pair contributes at most 1 to the critical count.
        """
        # Get all language pairs
        language_pairs = db.query(LanguagePair.lang_pair_id).all()
        critical_count = 0
        
        for (lang_pair_id,) in language_pairs:
            # Get the latest SQE result for this language pair based on test_date
            # If test_date is null, fall back to created_at
            latest_result = db.query(SQEResult).join(ModelVersion).filter(
                ModelVersion.lang_pair_id == lang_pair_id
            ).order_by(
                SQEResult.test_date.desc().nulls_last(),
                SQEResult.created_at.desc()
            ).first()
            
            # If the latest result has one point case, this language pair is critical
            if latest_result and latest_result.has_one_point_case:
                critical_count += 1
                
        return critical_count

    def get_score_distribution(self, db: Session, language_pair_id: Optional[int] = None) -> dict:
        """Get score distribution for analytics - Updated for 1.0-3.0 scale with optional language pair filter"""
        query = db.query(SQEResult.average_score)
        
        # Filter by language pair if specified
        if language_pair_id:
            query = query.join(ModelVersion).filter(ModelVersion.lang_pair_id == language_pair_id)
            
        results = query.all()
        scores = [r.average_score for r in results]
        
        if not scores:
            return {"ranges": [], "total": 0}

        # Create score ranges for 1.0-3.0 scale
        ranges = {
            "2.800-3.000": 0,  # Excellent
            "2.500-2.799": 0,  # Good 
            "2.200-2.499": 0,  # Acceptable
            "2.000-2.199": 0,  # Marginal
            "1.000-1.999": 0   # Poor
        }

        for score in scores:
            if score >= 2.8:
                ranges["2.800-3.000"] += 1
            elif score >= 2.5:
                ranges["2.500-2.799"] += 1
            elif score >= 2.2:
                ranges["2.200-2.499"] += 1
            elif score >= 2.0:
                ranges["2.000-2.199"] += 1
            else:
                ranges["1.000-1.999"] += 1

        return {
            "ranges": [{"range": k, "count": v} for k, v in ranges.items()],
            "total": len(scores)
        }

sqe_results = CRUDSQEResults() 