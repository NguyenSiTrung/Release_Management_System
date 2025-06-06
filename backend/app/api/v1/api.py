from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    users,
    language_pairs,
    model_versions,
    testsets,
    training_results,
    release_notes,
    visualizations,
    evaluations,
    sqe_results,
    system
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(language_pairs.router, prefix="/language-pairs", tags=["language pairs"])
api_router.include_router(model_versions.router, prefix="/model-versions", tags=["model versions"])
api_router.include_router(testsets.router, prefix="/testsets", tags=["testsets"])
api_router.include_router(training_results.router, prefix="/training-results", tags=["training results"])
api_router.include_router(release_notes.router, prefix="/release-notes", tags=["release notes"])
api_router.include_router(visualizations.router, prefix="/visualizations", tags=["visualizations"]) 
api_router.include_router(evaluations.router, prefix="/evaluations", tags=["evaluations"])
api_router.include_router(sqe_results.router, prefix="/sqe-results", tags=["sqe results"])
api_router.include_router(system.router, prefix="/system", tags=["system"]) 