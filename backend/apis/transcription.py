from fastapi import BackgroundTasks, UploadFile
from fastapi.responses import JSONResponse
from backend.services.transcription_service import start_transcription_job
from backend.app import transcription_jobs

async def handle_transcription_upload(background_tasks: BackgroundTasks, file: UploadFile, language: str, task: str):
    return await start_transcription_job(background_tasks, file, language, task)

def get_transcription_status(job_id: str):
    from backend.app import TranscriptionStatus
    if job_id not in transcription_jobs:
        return JSONResponse(status_code=404, content={"error": "Job not found"})
    job = transcription_jobs[job_id]
    return TranscriptionStatus(
        job_id=job_id,
        status=job["status"],
        progress=job["progress"],
        transcript=job["transcript"],
        error=job["error"]
    )
