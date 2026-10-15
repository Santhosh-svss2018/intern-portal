import uvicorn
from app.core.config import settings

if __name__ == "__main__":
    print(f"Starting InternConnect backend on http://127.0.0.1:{settings.PORT}...")
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
