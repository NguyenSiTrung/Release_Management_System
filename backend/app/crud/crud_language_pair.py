from typing import Optional, List
from sqlalchemy.orm import Session
from app.db.models import LanguagePair
from app.schemas.language_pair import LanguagePairCreate, LanguagePairUpdate

def get_language_pair(db: Session, lang_pair_id: int) -> Optional[LanguagePair]:
    return db.query(LanguagePair).filter(LanguagePair.lang_pair_id == lang_pair_id).first()

def get_language_pairs(
    db: Session, 
    skip: int = 0, 
    limit: int = 100,
    source_code: Optional[str] = None,
    target_code: Optional[str] = None
) -> List[LanguagePair]:
    query = db.query(LanguagePair)
    
    if source_code:
        query = query.filter(LanguagePair.source_language_code.ilike(f"%{source_code}%"))
    if target_code:
        query = query.filter(LanguagePair.target_language_code.ilike(f"%{target_code}%"))
    
    return query.offset(skip).limit(limit).all()

def create_language_pair(db: Session, lang_pair: LanguagePairCreate) -> LanguagePair:
    db_lang_pair = LanguagePair(**lang_pair.model_dump())
    db.add(db_lang_pair)
    db.commit()
    db.refresh(db_lang_pair)
    return db_lang_pair

def update_language_pair(
    db: Session, 
    lang_pair_id: int, 
    lang_pair: LanguagePairUpdate
) -> Optional[LanguagePair]:
    db_lang_pair = get_language_pair(db, lang_pair_id)
    if not db_lang_pair:
        return None
    
    update_data = lang_pair.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_lang_pair, field, value)
    
    db.commit()
    db.refresh(db_lang_pair)
    return db_lang_pair

def delete_language_pair(db: Session, lang_pair_id: int) -> bool:
    db_lang_pair = get_language_pair(db, lang_pair_id)
    if not db_lang_pair:
        return False
    
    db.delete(db_lang_pair)
    db.commit()
    return True 