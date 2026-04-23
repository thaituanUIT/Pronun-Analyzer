from pydantic import BaseModel
from typing import Optional, Dict, List

class TranscriptionRequest(BaseModel):
    language: Optional[str] = "de"
    task: Optional[str] = "transcribe"

class PronunciationRequest(BaseModel):
    language: Optional[str] = "en"
    reference_text: str

class TranscriptionStatus(BaseModel):
    job_id: str
    status: str
    progress: Optional[int] = None
    transcript: Optional[str] = None
    error: Optional[str] = None

class PronunciationError(BaseModel):
    word: str
    expected_pronunciation: str
    actual_pronunciation: str
    confidence: float
    error_type: str  # 'substitution', 'deletion', 'insertion', 'stress'
    position: int
    suggestion: str

class PronunciationAnalysis(BaseModel):
    overall_score: float  # 0-100
    accuracy_score: float
    fluency_score: float
    pronunciation_errors: List[PronunciationError]
    transcript: str
    phonetic_transcript: str
    words_analyzed: int
    total_errors: int

class PronunciationStatus(BaseModel):
    job_id: str
    status: str
    progress: Optional[int] = None
    analysis: Optional[PronunciationAnalysis] = None
    error: Optional[str] = None
