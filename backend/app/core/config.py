from pydantic_settings import BaseSettings
from typing import Optional
import os
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "NMT Release Management System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./nmt_release_management.db")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-for-jwt")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # File Storage
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    # Model file storage path (where uploaded model files will be stored)
    MODEL_FILES_STORAGE_PATH: str = os.getenv("MODEL_FILES_STORAGE_PATH", str(BASE_DIR / "storage" / "models"))
    # Testsets storage path (where uploaded testset files will be stored)
    TESTSETS_STORAGE_PATH: str = os.getenv("TESTSETS_STORAGE_PATH", str(BASE_DIR / "storage" / "testsets"))
    
    # Evaluation Settings
    FAKE_EVALUATION_MODE: bool = os.getenv("FAKE_EVALUATION_MODE", "false").lower() == "true"
    T2T_RESOURCES_BASE_PATH: str = os.getenv("T2T_RESOURCES_BASE_PATH", "/home/hongthaing/hdd1/users/hongthaing/t2t-resources/resources/directions")
    DOCKER_VOLUME_RESOURCES_PATH_CONTAINER: str = os.getenv("DOCKER_VOLUME_RESOURCES_PATH_CONTAINER", "/resouce")
    DOCKER_VOLUME_TMP_PATH_HOST: str = os.getenv("DOCKER_VOLUME_TMP_PATH_HOST", "/home/hongthaing")
    DOCKER_VOLUME_TMP_PATH_CONTAINER: str = os.getenv("DOCKER_VOLUME_TMP_PATH_CONTAINER", "/tmp")
    DOCKER_IMAGE_NAME: str = os.getenv("DOCKER_IMAGE_NAME", "translator-cli:develop")
    NMT_ENGINE_DOCKER_IMAGE: str = os.getenv("NMT_ENGINE_DOCKER_IMAGE", "nmt-engine:latest")
    NMT_ENGINE_TIMEOUT_SECONDS: int = int(os.getenv("NMT_ENGINE_TIMEOUT_SECONDS", "1800"))  # 30 minutes
    
    # Ensure these paths exist
    @property
    def model_files_storage_path(self) -> Path:
        path = Path(self.MODEL_FILES_STORAGE_PATH)
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def testsets_storage_path(self) -> Path:
        path = Path(self.TESTSETS_STORAGE_PATH)
        path.mkdir(parents=True, exist_ok=True)
        return path

    class Config:
        case_sensitive = True

settings = Settings() 