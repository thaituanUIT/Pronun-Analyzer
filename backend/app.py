from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config import ALLOWED_ORIGINS, ENVIRONMENT, logger
from backend.routers import transcription_router, pronunciation_router, tts_router
from backend.core.model_manager import model_manager

app = FastAPI(
    title="Speech-to-Text & Pronunciation API",
    description="Refactored modular API for speech analysis"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if ENVIRONMENT != "production" else ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(transcription_router.router, tags=["Transcription"])
app.include_router(pronunciation_router.router, tags=["Pronunciation"])
app.include_router(tts_router.router, tags=["TTS"])

@app.on_event("startup")
async def startup_event():
    logger.info("Initializing application...")
    # Optionally load models on startup if RAM allows
    # In a production environment with auto-scaling, we might load on first request
    # but here we'll trigger it to ensure we're ready
    try:
        model_manager.load_models()
    except Exception as e:
        logger.error(f"Failed to load models during startup: {e}")

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "models_loaded": model_manager.model is not None,
        "environment": ENVIRONMENT
    }

# Logic for deleting jobs can be added here or in a separate router
@app.delete("/job/{job_id}")
async def delete_job(job_id: str):
    from backend.state import transcription_jobs, pronunciation_jobs
    deleted = False
    if job_id in transcription_jobs:
        del transcription_jobs[job_id]
        deleted = True
    if job_id in pronunciation_jobs:
        del pronunciation_jobs[job_id]
        deleted = True
    
    if deleted:
        return {"message": "Job deleted successfully"}
    return {"error": "Job not found"}, 404
