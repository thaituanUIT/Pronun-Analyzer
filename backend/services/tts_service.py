# Service for TTS logic
from backend.app import synthesize_speech
from fastapi.responses import JSONResponse

async def synthesize_speech_service(text: str, language: str):
    try:
        return await synthesize_speech(text, language)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
