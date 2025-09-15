from fastapi import APIRouter, BackgroundTasks, File, UploadFile, Form
from backend.apis.transcription import handle_transcription_upload, get_transcription_status

router = APIRouter()

@router.post("/transcribe", response_model=dict)
async def upload_and_transcribe(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    language: str = "de",
    task: str = "transcribe"
):
    return await handle_transcription_upload(background_tasks, file, language, task)

@router.get("/status/{job_id}")
async def status(job_id: str):
    return get_transcription_status(job_id)
