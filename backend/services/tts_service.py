import os
import tempfile
import asyncio
import logging
from fastapi import HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from gtts import gTTS

logger = logging.getLogger(__name__)

async def cleanup_temp_file(file_path: str):
    """Clean up temporary files"""
    try:
        if os.path.exists(file_path):
            os.unlink(file_path)
            logger.info(f"Cleaned up temporary file: {file_path}")
    except Exception as e:
        logger.warning(f"Failed to clean up temporary file {file_path}: {e}")

async def synthesize_speech_service(text: str, language: str):
    """Generate audio for correct pronunciation of a word or phrase using optimized TTS"""
    try:
        if not text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        clean_text = text.strip()
        if len(clean_text.split()) == 1:
            clean_text = f"{clean_text}."
        
        temp_audio = tempfile.NamedTemporaryFile(suffix='.mp3', delete=False)
        temp_audio.close()
        
        language_map = {
            'en': 'en', 'de': 'de', 'es': 'es', 'fr': 'fr', 'it': 'it',
            'pt': 'pt', 'ru': 'ru', 'ja': 'ja', 'ko': 'ko', 'zh': 'zh',
            'nl': 'nl', 'ar': 'ar', 'hi': 'hi', 'th': 'th', 'vi': 'vi',
        }
        gtts_lang = language_map.get(language, 'en')
        
        def create_tts_audio():
            tts = gTTS(text=clean_text, lang=gtts_lang, slow=False, lang_check=False)
            tts.save(temp_audio.name)
            return temp_audio.name
            
        loop = asyncio.get_event_loop()
        audio_file = await loop.run_in_executor(None, create_tts_audio)
        
        if not os.path.exists(audio_file) or os.path.getsize(audio_file) == 0:
            if os.path.exists(audio_file): os.unlink(audio_file)
            raise HTTPException(status_code=500, detail="Generated audio file is empty")
        
        # Return FileResponse with background cleanup
        background_tasks = BackgroundTasks()
        background_tasks.add_task(cleanup_temp_file, audio_file)
        
        return FileResponse(
            audio_file, 
            media_type="audio/mpeg",
            filename=f"pronunciation_{clean_text[:20].replace(' ', '_')}.mp3",
            background=background_tasks
        )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating speech: {e}")
        raise HTTPException(status_code=500, detail=f"Speech synthesis failed: {str(e)}")
