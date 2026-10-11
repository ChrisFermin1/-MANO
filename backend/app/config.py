from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    gemini_api_key: str = ""
    elevenlabs_api_key: str = ""
    # Create "Carlos Painting & Drywall" on startup if missing, so the app works before onboarding is wired
    seed_demo_business: bool = True
    # JSON array in CORS_ORIGINS; the regex preserves local demo access.
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    cors_origin_regex: str = (
        r"https?://(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|"
        r"172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?"
    )

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
