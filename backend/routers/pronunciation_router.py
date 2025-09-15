from fastapi import APIRouter, BackgroundTasks, File, UploadFile, Form
from backend.apis.pronunciation import handle_pronunciation_upload, get_pronunciation_status

router = APIRouter()

@router.post("/analyze-pronunciation", response_model=dict)
async def upload_and_analyze_pronunciation(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    reference_text: str = Form(...),
    language: str = Form("en")
):
    return await handle_pronunciation_upload(background_tasks, file, reference_text, language)

@router.get("/pronunciation-status/{job_id}")
async def status(job_id: str):
    return get_pronunciation_status(job_id)
