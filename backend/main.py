from fastapi import FastAPI
from backend.routers.transcription_router import router as transcription_router
from backend.routers.pronunciation_router import router as pronunciation_router
from backend.routers.tts_router import router as tts_router

app = FastAPI(title="Speech-to-Text API", description="Whisper-based speech transcription service")

# Register routers
app.include_router(transcription_router)
app.include_router(pronunciation_router)
app.include_router(tts_router)

# Optionally, add health and root endpoints here or import from a separate router
