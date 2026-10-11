from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from app.business import ensure_demo_business, router as business_router
from app.config import Settings
from app.db import Base
from app.jobs import router as jobs_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = Settings()
    engine = create_engine(settings.database_url, pool_pre_ping=True)
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        # Create any missing tables (never alters or drops existing ones). Enough for the demo;
        # switch to Alembic migrations once the schema starts changing.
        Base.metadata.create_all(engine)
        if settings.seed_demo_business:
            with Session(engine) as session:
                ensure_demo_business(session)
        app.state.engine = engine
        yield
    finally:
        engine.dispose()


app = FastAPI(title="Mano foundation", lifespan=lifespan)
# The app runs on another port (3000/3002/4000) and on phones over Wi-Fi: allow this machine on any
# port plus private network addresses. Nothing from the public internet.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?",
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(business_router)
app.include_router(jobs_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
