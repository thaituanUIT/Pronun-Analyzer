from fastapi import APIRouter, Form
from backend.apis.tts import synthesize_speech_handler

router = APIRouter()

@router.post("/synthesize-speech")
async def synthesize_speech(
    text: str = Form(...),
    language: str = Form("en")
):
    return await synthesize_speech_handler(text, language)
