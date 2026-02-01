import os
from typing import Any
from pydantic import field_validator
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "SmartCut AI")
    API_V1_STR: str = os.getenv("API_V1_STR", "/api/v1")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "secret")
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/smartcut")
    STORAGE_PATH: str = os.getenv("STORAGE_PATH", "./storage")
    BACKEND_CORS_ORIGINS: Any = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Any) -> list[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return [str(i) for i in v]
        elif isinstance(v, str) and v.startswith("["):
            import json
            try:
                data = json.loads(v)
                if isinstance(data, list):
                    return [str(i) for i in data]
            except:
                pass
        return []

    class Config:
        case_sensitive = True

settings = Settings()
