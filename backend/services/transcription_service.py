import os
import torch
import torchaudio
import asyncio
from fastapi import BackgroundTasks, UploadFile
from backend.config import DEVICE, logger
from backend.state import transcription_jobs
from backend.core.model_manager import model_manager

def convert_audio_to_wav(file_path):
    # This should be implemented or imported
    # For now, let's assume it exists or we use the logic from app.py
    import subprocess
    output_path = file_path + ".wav"
    try:
        subprocess.run(['ffmpeg', '-y', '-i', file_path, '-ar', '16000', '-ac', '1', output_path], check=True, capture_output=True)
        return output_path
    except Exception as e:
        logger.error(f"FFmpeg conversion failed: {e}")
        return file_path

async def transcribe_audio_background(job_id: str, file_path: str, language: str, task: str):
    """Background task for audio transcription"""
    converted_path = None
    try:
        transcription_jobs[job_id]["status"] = "processing"
        
        # Ensure models are loaded
        model_manager.load_models()
        processor = model_manager.processor
        model = model_manager.model
        
        # Use the processing logic (I'll need to move process_audio_file here too)
        from backend.services.audio_processing import process_audio_file
        
        try:
            async for progress, partial_transcript in process_audio_file(file_path, processor, model, DEVICE, language, task):
                transcription_jobs[job_id]["progress"] = progress
                transcription_jobs[job_id]["transcript"] = partial_transcript
                await asyncio.sleep(0.1)
        except Exception as audio_error:
            logger.warning(f"Direct audio processing failed: {audio_error}. Trying conversion...")
            converted_path = convert_audio_to_wav(file_path)
            
            async for progress, partial_transcript in process_audio_file(converted_path, processor, model, DEVICE, language, task):
                transcription_jobs[job_id]["progress"] = progress
                transcription_jobs[job_id]["transcript"] = partial_transcript
                await asyncio.sleep(0.1)
        
        transcription_jobs[job_id]["status"] = "completed"
        
    except Exception as e:
        transcription_jobs[job_id]["status"] = "failed"
        transcription_jobs[job_id]["error"] = str(e)
        logger.error(f"Transcription failed for job {job_id}: {e}")
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)
async def start_transcription_job(background_tasks: BackgroundTasks, file: UploadFile, language: str, task: str):
    """Initialize a transcription job and start background processing"""
    import uuid
    job_id = str(uuid.uuid4())
    
    # Save file
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_extension = os.path.splitext(file.filename)[1] if file.filename else ".wav"
    file_path = os.path.join(upload_dir, f"{job_id}{file_extension}")
    
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
        
    transcription_jobs[job_id] = {
        "status": "queued",
        "progress": 0,
        "transcript": None,
        "error": None,
        "filename": file.filename or f"audio{file_extension}"
    }
    
    background_tasks.add_task(transcribe_audio_background, job_id, file_path, language, task)
    return {"job_id": job_id, "message": "Transcription started"}
