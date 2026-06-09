from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://kestrel:secret@localhost:5432/kestrel"
    redis_url: str = "redis://localhost:6379/0"

    secret_key: str = "dev-secret-change-in-production"
    access_token_expire_minutes: int = 10080  # 7 days

    environment: str = "development"
    frontend_url: str = "http://localhost:3001"

    sendgrid_api_key: str = ""
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from_number: str = ""

    sentry_dsn: str = ""

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


settings = Settings()
