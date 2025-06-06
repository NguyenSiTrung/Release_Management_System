from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import date, datetime

class SQEResultBase(BaseModel):
    version_id: int
    average_score: float = Field(..., ge=1.0, le=3.0, description="Average score from 1.0 to 3.0")
    total_test_cases: int = Field(..., gt=0, description="Total number of test cases")
    test_cases_changed: bool = False
    change_percentage: Optional[float] = Field(default=0.0, ge=0.0, le=100.0)
    has_one_point_case: bool = False
    test_date: Optional[date] = None
    notes: Optional[str] = None

class SQEResultCreate(SQEResultBase):
    pass

class SQEResultUpdate(BaseModel):
    average_score: Optional[float] = Field(None, ge=1.0, le=3.0)
    total_test_cases: Optional[int] = Field(None, gt=0)
    test_cases_changed: Optional[bool] = None
    change_percentage: Optional[float] = Field(None, ge=0.0, le=100.0)
    has_one_point_case: Optional[bool] = None
    test_date: Optional[date] = None
    notes: Optional[str] = None

class SQEResultResponse(SQEResultBase):
    sqe_result_id: int
    tested_by_user_id: Optional[int]
    tested_by_username: Optional[str] = None
    model_version_name: Optional[str] = None
    language_pair_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class SQEResultSummary(BaseModel):
    sqe_result_id: int
    version_id: int
    model_version_name: str
    language_pair_name: str
    average_score: float
    total_test_cases: int
    test_cases_changed: bool
    change_percentage: float
    has_one_point_case: bool
    test_date: Optional[date]
    created_at: datetime

    class Config:
        from_attributes = True

# Pagination wrapper
class PaginatedSQEResults(BaseModel):
    items: List[SQEResultSummary]
    total: int
    page: int
    size: int
    pages: int

# Analytics schemas
class SQELanguagePairTrend(BaseModel):
    version_name: str
    release_date: Optional[date]
    average_score: float
    total_test_cases: int
    test_cases_changed: bool
    change_percentage: float

class SQELanguagePairAnalytics(BaseModel):
    language_pair_id: int
    language_pair_name: str
    latest_score: Optional[float]
    score_trend: str  # 'up', 'down', 'stable'
    total_versions_tested: int
    trends: List[SQELanguagePairTrend]

class SQECrossComparison(BaseModel):
    language_pair_id: int
    language_pair_name: str
    latest_score: Optional[float]
    latest_test_cases: Optional[int]
    score_trend: Optional[str]
    has_critical_issues: bool

class SQEAnalytics(BaseModel):
    overall_stats: dict
    language_pair_analytics: List[SQELanguagePairAnalytics]
    cross_comparison: List[SQECrossComparison]
    score_distribution: dict 