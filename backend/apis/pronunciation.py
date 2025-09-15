from fastapi import BackgroundTasks, UploadFile, Form
from fastapi.responses import JSONResponse
from backend.services.pronunciation_service import start_pronunciation_job
from backend.app import pronunciation_jobs

async def handle_pronunciation_upload(background_tasks: BackgroundTasks, file: UploadFile, reference_text: str, language: str):
    return await start_pronunciation_job(background_tasks, file, reference_text, language)

def get_pronunciation_status(job_id: str):
    from backend.app import PronunciationStatus
    if job_id not in pronunciation_jobs:
        return JSONResponse(status_code=404, content={"error": "Job not found"})
    job = pronunciation_jobs[job_id]
    return PronunciationStatus(
        job_id=job_id,
        status=job["status"],
        progress=job["progress"],
        analysis=job["analysis"],
        error=job["error"]
    )
