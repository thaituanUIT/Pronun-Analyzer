from backend.services.tts_service import synthesize_speech_service

async def synthesize_speech_handler(text: str, language: str):
    return await synthesize_speech_service(text, language)
