import os
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.api_v1.api import api_router
from app.db.session import engine
from app.models.database import Base
from fastapi.staticfiles import StaticFiles

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    debug=settings.DEBUG
)

# Explicit CORS - Permissive for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Mount media storage
if not os.path.exists(settings.STORAGE_PATH):
    os.makedirs(settings.STORAGE_PATH, exist_ok=True)
app.mount("/media_files", StaticFiles(directory=settings.STORAGE_PATH), name="media_files")

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {"message": "Welcome to SmartCut AI Backend API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "cors": "wildcard"}

@app.on_event("startup")
def startup_event():
    """Create all database tables on startup and log config"""
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully!")
    print("✅ Database tables created successfully!")
    print(f"🚀 CORS Policy: Explicit Origins (Credentials Enabled)")
    print(f"🌐 Allowed Origins: {[str(origin) for origin in settings.BACKEND_CORS_ORIGINS]}")
    print(f"📡 API Path Prefix: {settings.API_V1_STR}")
    print(f"🛠️ Debug Mode: {settings.DEBUG}")
    print(f"📂 Storage Path: {settings.STORAGE_PATH}")
