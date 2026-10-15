from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database.connection import get_db, is_mock_db, close_db, check_db_health
from app.database.seed_data import seed_database
from app.routers import auth, internships, applications, tasks, ai, admin, notifications, announcements

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect and verify database
    db = get_db()
    # Seed database if in development, or if explicitly enabled via AUTO_SEED
    import os
    auto_seed_requested = os.getenv("AUTO_SEED", "").lower() in ("true", "1")
    auto_seed_disabled = os.getenv("DISABLE_AUTO_SEED", "").lower() in ("true", "1")
    if (settings.ENVIRONMENT != "production" or auto_seed_requested) and not auto_seed_disabled:
        seed_database(db)
    yield
    # Shutdown logic: clean database client disconnect
    close_db()

app = FastAPI(
    title="InternConnect AI API",
    description="Full-stack Enterprise Internship Management Portal API with Role-Based Access Control and AI Career Assistance",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS for frontend access
cors_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

if settings.ALLOWED_ORIGINS:
    for origin in settings.ALLOWED_ORIGINS.split(","):
        cleaned = origin.strip()
        if cleaned and cleaned not in cors_origins:
            cors_origins.append(cleaned)

import os
allow_all_origins = os.getenv("ALLOW_ALL_ORIGINS", "").lower() in ("true", "1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins if not allow_all_origins else [],
    allow_origin_regex=r".*" if allow_all_origins else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth.router)
app.include_router(internships.router)
app.include_router(applications.router)
app.include_router(tasks.router)
app.include_router(ai.router)
app.include_router(admin.router)
app.include_router(notifications.router)
app.include_router(announcements.router)

@app.get("/", tags=["Root"])
def root():
    return {
        "service": "InternConnect AI API",
        "status": "online",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health"
    }

@app.get("/api/health", tags=["Health"])
def health_check():
    db_health = check_db_health()
    return {
        "status": "healthy" if db_health.get("connected") else "unhealthy",
        "service": "InternConnect AI API",
        "database": db_health.get("type", "unknown"),
        "database_name": db_health.get("database", settings.DB_NAME),
        "database_connected": db_health.get("connected", False),
        "environment": settings.ENVIRONMENT
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
