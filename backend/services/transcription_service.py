# Service for transcription logic
from backend.app import transcription_jobs, transcribe_audio_background
import uuid, os
from fastapi import BackgroundTasks, UploadFile

async def start_transcription_job(background_tasks: BackgroundTasks, file: UploadFile, language: str, task: str):
    file_extension = os.path.splitext(file.filename)[1] if file.filename else ''
    job_id = str(uuid.uuid4())
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, f"{job_id}{file_extension}")
    with open(file_path, "wb") as f:
        f.write(await file.read())
    transcription_jobs[job_id] = {
        "status": "queued",
        "progress": 0,
        "transcript": None,
        "error": None,
        "filename": file.filename or f"audio{file_extension}"
    }
    background_tasks.add_task(transcribe_audio_background, job_id, file_path, language, task)
    return {"job_id": job_id, "message": "Transcription started"}

