"""Application configuration using Pydantic Settings"""

from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable support"""

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=False, extra="allow"
    )

    # Application
    app_name: str = "SpotPass Backend"
    app_env: Literal["dev", "prod"] = "dev"
    debug: bool = True

    # Database
    database_url: str = "sqlite:///./serveme.db"

    # JWT
    jwt_secret_key: str = "xsaadt2NP93m4wnB8765TR5645yHYmfmc2TpCOGI5nxx"
    jwt_refresh_secret_key: str = "yHGTpd3OQ94n5xoC9876US6756zIZngnd3UqDPHJ6oyy"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30  # 30 minutes for access token
    jwt_refresh_token_expire_days: int = 30  # 30 days for refresh token

    # Redis
    redis_host: str = ""
    redis_port: int = 6379
    redis_password: str = ""
    redis_db: int = 0

    # CORS
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://spotpass.mounirmesselmeni.de",
        "https://spotpass-backend.mounirmesselmeni.de"
    ]

    # File uploads
    file_folder: str = "./static"
    allowed_extensions: list[str] = ["jpg", "png", "mov", "mp4", "mpg"]
    max_content_length: int = 1000 * 1024 * 1024  # 1000MB

    # Application
    base_url: str = "http://localhost:3000"
    brand_name: str = "serveme"

    # Secret key for general cryptography
    secret_key: str = "f3cfe9ed8fae309f02079dbf"


# Global settings instance
settings = Settings()
