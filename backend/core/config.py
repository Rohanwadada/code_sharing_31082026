import os
from functools import lru_cache

from pydantic import PostgresDsn
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "SETU LMS"
    app_version: str = "v0.1.0"

    database_url: PostgresDsn

    encryption_key: str
    hash_secret: str

    # jwt
    jwt_secret_key: str
    jwt_algorithm: str
    jwt_access_token_expiry: int
    jwt_refresh_token_expiry: int

    # email provider
    smtp_server: str
    smtp_port: int
    email_sender: str
    email_password: str

    redis_host: str
    redis_port: int
    otp_expiration_time: int

    celery_broker_url: str

    gemini_api_key: str

    serper_api_key: str

    transcription_server_base_url: str

    langgraph_database_url: str

    site_base_url: str

    azure_connection_string: str
    azure_blob_container_name: str


    platform_admin_access_key: str

    langsmith_tracing: bool = False
    langsmith_endpoint: str = "https://api.smith.langchain.com"
    langsmith_api_key: str = ""
    langsmith_project: str = "default"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore


settings = get_settings()

# Sync LangSmith / LangChain tracing configuration to OS environment
if settings.langsmith_tracing:
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGSMITH_TRACING"] = "true"
    if settings.langsmith_api_key:
        os.environ["LANGCHAIN_API_KEY"] = settings.langsmith_api_key
        os.environ["LANGSMITH_API_KEY"] = settings.langsmith_api_key
    if settings.langsmith_endpoint:
        os.environ["LANGCHAIN_ENDPOINT"] = settings.langsmith_endpoint
        os.environ["LANGSMITH_ENDPOINT"] = settings.langsmith_endpoint
    if settings.langsmith_project:
        os.environ["LANGCHAIN_PROJECT"] = settings.langsmith_project
        os.environ["LANGSMITH_PROJECT"] = settings.langsmith_project

