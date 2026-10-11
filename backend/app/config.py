from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    gemini_api_key: str = ""
    elevenlabs_api_key: str = ""
    # Create "Carlos Painting & Drywall" on startup if missing, so the app works before onboarding is wired
    seed_demo_business: bool = True

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
