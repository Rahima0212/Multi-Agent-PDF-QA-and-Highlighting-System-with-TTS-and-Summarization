from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.db.database import engine
from app.db import models
from app.api.endpoints import router as api_router
import os

app = FastAPI(title="Multi-Agent PDF QA System")

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)

# Ensure storage directories exist
os.makedirs("/data/audio", exist_ok=True)
os.makedirs("/data/highlights", exist_ok=True)
os.makedirs("/data/docs", exist_ok=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files
app.mount("/data", StaticFiles(directory="/data"), name="data")

# Include API Router
app.include_router(api_router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Multi-Agent PDF QA System API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
