import os
import uuid
import logging
from fastapi import BackgroundTasks, UploadFile
from backend.config import logger
from backend.state import pronunciation_jobs
from backend.core.model_manager import model_manager
from backend.logic.pronunciation import PronunciationAnalyzer

async def analyze_pronunciation_background(job_id: str, file_path: str, reference_text: str, language: str):
    """Background task for pronunciation analysis"""
    converted_path = None
    try:
        pronunciation_jobs[job_id]["status"] = "processing"
        pronunciation_jobs[job_id]["progress"] = 20
        
        # Ensure models are loaded
        model_manager.load_models()
        
        # Initialize analyzer with shared model
        analyzer = PronunciationAnalyzer(model_manager.processor, model_manager.model)
        pronunciation_jobs[job_id]["progress"] = 50
        
        analysis = await analyzer.analyze_pronunciation(file_path, reference_text, language)
        
        # Convert to dictionary for JSON serialization
        analysis_dict = {
            "overall_score": analysis.overall_score,
            "accuracy_score": analysis.accuracy_score,
            "fluency_score": analysis.fluency_score,
            "transcript": analysis.transcript,
            "phonetic_transcript": analysis.phonetic_transcript,
            "words_analyzed": analysis.words_analyzed,
            "total_errors": analysis.total_errors,
            "pronunciation_errors": [
                {
                    "word": error.word,
                    "expected_pronunciation": error.expected_pronunciation,
                    "actual_pronunciation": error.actual_pronunciation,
                    "confidence": error.confidence,
                    "error_type": error.error_type,
                    "position": error.position,
                    "suggestion": error.suggestion
                }
                for error in analysis.pronunciation_errors
            ]
        }
        
        pronunciation_jobs[job_id]["analysis"] = analysis_dict
        pronunciation_jobs[job_id]["progress"] = 100
        pronunciation_jobs[job_id]["status"] = "completed"
        
    except Exception as e:
        pronunciation_jobs[job_id]["status"] = "failed"
        pronunciation_jobs[job_id]["error"] = str(e)
        logger.error(f"Pronunciation analysis failed for job {job_id}: {e}")
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

async def start_pronunciation_job(background_tasks: BackgroundTasks, file: UploadFile, reference_text: str, language: str):
    """Initialize a pronunciation job and start background processing"""
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
