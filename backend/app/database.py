"""Database engine, sessions, table creation, and demo seed data.

Put this file at backend/app/database.py
"""
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from app.config import Settings
from app.models import Base, Business

engine = create_engine(Settings().database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def init_db() -> None:
    """Create any missing tables, then make sure Carlos's business exists.
    Safe to call on every startup. It will NOT alter existing tables."""
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        if db.scalar(select(Business).limit(1)) is None:
            db.add(
                Business(
                    owner_name="Carlos",
                    business_name="Carlos Painting LLC",
                    business_type="Residential painting/remodeling",
                )
            )
            db.commit()


def get_db():
    """FastAPI dependency: `db: Session = Depends(get_db)`"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
