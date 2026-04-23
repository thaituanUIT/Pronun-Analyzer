from typing import Dict

# Shared in-memory storage for jobs
# Note: Ideally this should be replaced with a database for production
transcription_jobs: Dict[str, Dict] = {}
pronunciation_jobs: Dict[str, Dict] = {}
