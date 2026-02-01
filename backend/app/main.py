import os
from fastapi import FastAPI
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

# Mount media storage
if not os.path.exists(settings.STORAGE_PATH):
    os.makedirs(settings.STORAGE_PATH, exist_ok=True)
app.mount("/media_files", StaticFiles(directory=settings.STORAGE_PATH), name="media_files")

# Set all CORS enabled origins
# Using a liberal Power-CORS policy for hackathon reliability.
# Since the frontend doesn't use credentials (cookies), allow_origins=["*"] is safe and robust.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {"message": "Welcome to SmartCut AI Backend API", "version": "1.0.0"}

@app.on_event("startup")
def startup_event():
    """Create all database tables on startup and log config"""
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully!")
    print(f"🚀 CORS Origins: ['*'] (Liberal Mode)")
    print(f"📡 API Path: {settings.API_V1_STR}")
    print(f"🛠️ Debug Mode: {settings.DEBUG}")
