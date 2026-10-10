from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text

from app.config import Settings
from app.voice.service import transcribe_audio


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = Settings()
    engine = create_engine(settings.database_url, pool_pre_ping=True)
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        yield
    finally:
        engine.dispose()


app = FastAPI(title="Mano foundation", lifespan=lifespan)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
