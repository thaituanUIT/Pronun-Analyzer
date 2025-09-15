# Service for pronunciation analysis logic
from backend.app import pronunciation_jobs, analyze_pronunciation_background
import uuid, os
from fastapi import BackgroundTasks, UploadFile

async def start_pronunciation_job(background_tasks: BackgroundTasks, file: UploadFile, reference_text: str, language: str):
    file_extension = os.path.splitext(file.filename)[1] if file.filename else ''
    job_id = str(uuid.uuid4())
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, f"{job_id}{file_extension}")
    with open(file_path, "wb") as f:
        f.write(await file.read())
    pronunciation_jobs[job_id] = {
        "status": "queued",
        "progress": 0,
        "analysis": None,
        "error": None,
        "filename": file.filename or f"audio{file_extension}",
        "reference_text": reference_text
    }
    background_tasks.add_task(analyze_pronunciation_background, job_id, file_path, reference_text, language)
    return {"job_id": job_id, "message": "Pronunciation analysis started"}

