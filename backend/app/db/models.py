from sqlalchemy import Column, Integer, String, Text, ForeignKey, UniqueConstraint, Index, Date, Float, func, Boolean, DateTime
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"
    
    user_id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    role = Column(String, nullable=False, default='member')
    status = Column(String, nullable=False, default='active')  # 'active', 'pending', 'rejected'
    created_at = Column(Text, server_default=func.now())
    updated_at = Column(Text, server_default=func.now(), onupdate=func.now())

    authored_release_notes = relationship("ReleaseNote", back_populates="author")
    evaluation_jobs = relationship("EvaluationJob", foreign_keys="EvaluationJob.requested_by_user_id", back_populates="requested_by")
    sqe_results = relationship("SQEResult", foreign_keys="SQEResult.tested_by_user_id", back_populates="tested_by")

class LanguagePair(Base):
    __tablename__ = "language_pairs"
    
    lang_pair_id = Column(Integer, primary_key=True, index=True)
    source_language_code = Column(String(10), nullable=False)
    target_language_code = Column(String(10), nullable=False)
    description = Column(Text)
    created_at = Column(Text, server_default=func.now())
    updated_at = Column(Text, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint('source_language_code', 'target_language_code', name='uq_lang_pair_source_target'),
    )

    model_versions = relationship("ModelVersion", back_populates="language_pair", cascade="all, delete-orphan")
    testsets = relationship("Testset", back_populates="language_pair")

class ModelVersion(Base):
    __tablename__ = "model_versions"
    
    version_id = Column(Integer, primary_key=True, index=True)
    lang_pair_id = Column(Integer, ForeignKey("language_pairs.lang_pair_id", ondelete="CASCADE"), nullable=False)
    version_name = Column(String, nullable=False)
    release_date = Column(Date)
    description = Column(Text)
    # Finetuned model file fields
    model_file_name = Column(String, nullable=True)
    hparams_file_name = Column(String, nullable=True)
    model_file_path_on_server = Column(String, nullable=True)
    hparams_file_path_on_server = Column(String, nullable=True)
    # Base model file fields
    base_model_file_name = Column(String, nullable=True)
    base_hparams_file_name = Column(String, nullable=True)
    base_model_file_path_on_server = Column(String, nullable=True)
    base_hparams_file_path_on_server = Column(String, nullable=True)
    created_at = Column(Text, server_default=func.now())
    updated_at = Column(Text, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint('lang_pair_id', 'version_name', name='uq_model_version_lang_pair_name'),
        Index('idx_model_version_release_date', 'release_date'),
    )

    language_pair = relationship("LanguagePair", back_populates="model_versions")
    training_results = relationship("TrainingResult", back_populates="model_version", cascade="all, delete-orphan")
    release_note = relationship("ReleaseNote", back_populates="model_version", uselist=False, cascade="all, delete-orphan")
    evaluation_jobs = relationship("EvaluationJob", back_populates="model_version", cascade="all, delete-orphan")
    sqe_result = relationship("SQEResult", back_populates="model_version", cascade="all, delete-orphan")

class Testset(Base):
    __tablename__ = "testsets"
    
    testset_id = Column(Integer, primary_key=True, index=True)
    lang_pair_id = Column(Integer, ForeignKey("language_pairs.lang_pair_id", ondelete="RESTRICT"), nullable=False)
    testset_name = Column(String, nullable=False, unique=True)
    description = Column(Text)
    source_file_path = Column(String)
    target_file_path = Column(String)
    
    # New fields for file upload
    source_file_name = Column(String)
    target_file_name = Column(String)
    source_file_path_on_server = Column(String)
    target_file_path_on_server = Column(String)
    
    created_at = Column(Text, server_default=func.now())
    updated_at = Column(Text, server_default=func.now(), onupdate=func.now())

    language_pair = relationship("LanguagePair", back_populates="testsets")
    training_results = relationship("TrainingResult", back_populates="testset")
    evaluation_jobs = relationship("EvaluationJob", back_populates="testset")

class TrainingResult(Base):
    __tablename__ = "training_results"
    
    result_id = Column(Integer, primary_key=True, index=True)
    version_id = Column(Integer, ForeignKey("model_versions.version_id", ondelete="CASCADE"), nullable=False)
    testset_id = Column(Integer, ForeignKey("testsets.testset_id", ondelete="RESTRICT"), nullable=False)
    base_model_bleu = Column(Float)
    base_model_comet = Column(Float)
    finetuned_model_bleu = Column(Float)
    finetuned_model_comet = Column(Float)
    training_details_notes = Column(Text)
    created_at = Column(Text, server_default=func.now())
    updated_at = Column(Text, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint('version_id', 'testset_id', name='uq_training_result_version_testset'),
    )

    model_version = relationship("ModelVersion", back_populates="training_results")
    testset = relationship("Testset", back_populates="training_results")

class ReleaseNote(Base):
    __tablename__ = "release_notes"
    
    note_id = Column(Integer, primary_key=True, index=True)
    version_id = Column(Integer, ForeignKey("model_versions.version_id", ondelete="CASCADE"), unique=True, nullable=False)
    title = Column(String)
    content = Column(Text)
    author_id = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"))
    created_at = Column(Text, server_default=func.now())
    updated_at = Column(Text, server_default=func.now(), onupdate=func.now())

    model_version = relationship("ModelVersion", back_populates="release_note")
    author = relationship("User", back_populates="authored_release_notes") 

class EvaluationJob(Base):
    __tablename__ = "evaluation_jobs"
    
    job_id = Column(Integer, primary_key=True, index=True)
    version_id = Column(Integer, ForeignKey("model_versions.version_id"), nullable=False)
    testset_id = Column(Integer, ForeignKey("testsets.testset_id"), nullable=False)
    requested_by_user_id = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    
    status = Column(String(50), default="PENDING")
    bleu_score = Column(Float, nullable=True)
    comet_score = Column(Float, nullable=True)
    
    # Base model results
    base_model_bleu_score = Column(Float, nullable=True)
    base_model_comet_score = Column(Float, nullable=True)
    base_model_output_file_path = Column(String(500), nullable=True)
    
    output_file_path = Column(String(500), nullable=True)
    log_message = Column(Text, nullable=True)
    auto_add_to_details_requested = Column(Boolean, default=False)
    details_added_successfully = Column(Boolean, nullable=True)
    
    requested_at = Column(DateTime, default=datetime.utcnow)
    processing_started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # New evaluation fields
    mode_type = Column(String(100), nullable=True)
    sub_mode_type = Column(String(100), nullable=True)
    custom_params = Column(Text, nullable=True)
    evaluation_model_type = Column(String(20), nullable=True)  # 'base', 'finetuned', 'both'
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    model_version = relationship("ModelVersion", back_populates="evaluation_jobs")
    testset = relationship("Testset", back_populates="evaluation_jobs")
    requested_by = relationship("User", foreign_keys=[requested_by_user_id])

class SQEResult(Base):
    __tablename__ = "sqe_results"
    
    sqe_result_id = Column(Integer, primary_key=True, index=True)
    version_id = Column(Integer, ForeignKey("model_versions.version_id", ondelete="CASCADE"), nullable=False)
    
    # Core SQE metrics
    average_score = Column(Float, nullable=False)  # 0.0 - 10.0
    total_test_cases = Column(Integer, nullable=False)
    
    # Comparison with previous version
    test_cases_changed = Column(Boolean, default=False)
    change_percentage = Column(Float, default=0.0)
    has_one_point_case = Column(Boolean, default=False)
    
    # Metadata
    tested_by_user_id = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    test_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    model_version = relationship("ModelVersion", back_populates="sqe_result")
    tested_by = relationship("User", foreign_keys=[tested_by_user_id])
    
    # Ensure one SQE result per model version
    __table_args__ = (UniqueConstraint('version_id', name='uq_sqe_result_version'),) 