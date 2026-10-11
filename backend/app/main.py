from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from app.business import ensure_demo_business, router as business_router
from app.config import Settings
from app.customers import router as customers_router
from app.db import Base
from app.jobs import router as jobs_router
from app.voice.service import transcribe_audio


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
cors_settings = Settings()
# The app runs on another port (3000/3002/4000) and on phones over Wi-Fi: allow this machine on any
# port plus private network addresses. Nothing from the public internet.
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_settings.cors_origins,
    allow_origin_regex=cors_settings.cors_origin_regex,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(business_router)
app.include_router(jobs_router)
app.include_router(customers_router)

@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

@app.post("/api/extract")
async def extract(request: Request):
    data = await request.json()
    description = data.get("description", "")
    # Stub for now
    return {
        "service": "General",
        "customer_name": "Test User",
        "address": "123 Main St",
        "line_items": []
    }



@app.post("/api/voice/transcribe")
async def transcribe(file: UploadFile = File(...)):
    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")
    try:
        text = transcribe_audio(audio_bytes)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return {"text": text}
