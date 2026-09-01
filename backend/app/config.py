from pydantic_settings import BaseSettings, SettingsConfigDict
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address
)
class Settings(BaseSettings):

    APP_NAME: str = "TaskPulse"
    DEBUG: bool = True

    # PostgreSQL
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "taskpulse"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: str | None = None


    # Celery
    CELERY_BROKER_DB: int = 1
    CELERY_RESULT_DB: int = 2

    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Rate limiting
    RATE_LIMIT: str = "10/minute"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def redis_url(self) -> str:

        if self.REDIS_PASSWORD:
            return (
                f"redis://:{self.REDIS_PASSWORD}"
                f"@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
            )

        return (
            f"redis://"
            f"{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
        )

    @property
    def celery_broker_url(self) -> str:

        if self.REDIS_PASSWORD:
            return (
                f"redis://:{self.REDIS_PASSWORD}"
                f"@{self.REDIS_HOST}:{self.REDIS_PORT}"
                f"/{self.CELERY_BROKER_DB}"
            )

        return (
            f"redis://"
            f"{self.REDIS_HOST}:{self.REDIS_PORT}"
            f"/{self.CELERY_BROKER_DB}"
        )

    @property
    def celery_result_backend(self) -> str:

        if self.REDIS_PASSWORD:
            return (
                f"redis://:{self.REDIS_PASSWORD}"
                f"@{self.REDIS_HOST}:{self.REDIS_PORT}"
                f"/{self.CELERY_RESULT_DB}"
            )

        return (
            f"redis://"
            f"{self.REDIS_HOST}:{self.REDIS_PORT}"
            f"/{self.CELERY_RESULT_DB}"
        )

    @property
    def database_url(self) -> str:

        return (
            f"postgresql+psycopg2://"
            f"{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}"
            f"/{self.POSTGRES_DB}"
        )


settings = Settings()