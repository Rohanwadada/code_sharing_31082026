from contextlib import asynccontextmanager
from datetime import datetime # <-- Added datetime import here
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os

from fastapi.staticfiles import StaticFiles

from app.api.v1.endpoints.assessment_worker import router as ai_worker_router

app = FastAPI(
    title="Client-Facing API"
)


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
static_path = os.path.join(BASE_DIR, "static")

if os.path.exists(static_path):
    app.mount("/static", StaticFiles(directory=static_path), name="static")
    
    
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai_worker_router, prefix="/api/v1", tags=["Assessment"])

@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint to verify the application is running."""
    return JSONResponse(
        content={"status": "healthy", "message": "Backend application is running successfully"},
        status_code=200
    )