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

# 1. Manual CORS Interceptor for OPTIONS requests (Definitive Fix)
@app.middleware("http")
async def manual_cors_middleware(request: Request, call_next):
    if request.method == "OPTIONS":
        response = Response()
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.status_code = 200
        return response
    
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response

# 2. Official CORSMiddleware (Secondary Guard)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount media storage
if not os.path.exists(settings.STORAGE_PATH):
    os.makedirs(settings.STORAGE_PATH, exist_ok=True)
app.mount("/media_files", StaticFiles(directory=settings.STORAGE_PATH), name="media_files")

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
