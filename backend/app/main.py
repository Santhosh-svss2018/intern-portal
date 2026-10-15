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
    # Prevent automatic seeding in production or when explicitly disabled
    import os
    if settings.ENVIRONMENT != "production" and os.getenv("DISABLE_AUTO_SEED", "").lower() not in ("true", "1"):
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
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
