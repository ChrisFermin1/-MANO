from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import create_engine, text

from app.config import Settings
from app.jobs import router as jobs_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = Settings()
    engine = create_engine(settings.database_url, pool_pre_ping=True)
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        app.state.engine = engine
        yield
    finally:
        engine.dispose()


app = FastAPI(title="Mano foundation", lifespan=lifespan)
app.include_router(jobs_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
