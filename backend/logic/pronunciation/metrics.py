import logging
from typing import List, Optional, Dict
from Levenshtein import distance as levenshtein_distance
from backend.models import PronunciationError

logger = logging.getLogger(__name__)

def classify_error_type(transcript_word: Optional[str], reference_word: str, patterns: Dict) -> str:
    if transcript_word is None: return 'deletion'
    if reference_word is None: return 'insertion'
    
    for sound, substitutions in patterns.items():
        if sound in reference_word and any(sub in transcript_word for sub in substitutions):
            return 'substitution'
            
    distance = levenshtein_distance(transcript_word, reference_word)
    return 'substitution' if distance == 1 else 'errors'

def calculate_error_confidence(transcript_word: Optional[str], reference_word: str) -> float:
    if transcript_word is None: return 0.9
    distance = levenshtein_distance(transcript_word, reference_word)
    max_len = max(len(transcript_word), len(reference_word))
    similarity = 1.0 - (distance / max_len) if max_len > 0 else 1.0
    return max(0.1, 1.0 - similarity)

def calculate_overall_score(errors: List[PronunciationError], total_words: int) -> float:
    if total_words == 0: return 100.0
    weighted_errors = sum(error.confidence for error in errors)
    return round(max(0, (total_words - weighted_errors) / total_words) * 100, 1)

def calculate_accuracy_score(errors: List[PronunciationError], total_words: int) -> float:
    if total_words == 0: return 100.0
    return round(max(0, (total_words - len(errors)) / total_words) * 100, 1)

def calculate_fluency_score(transcript_data: Dict) -> float:
    words = transcript_data.get('words', [])
    if not words: return 50.0
    
    word_count = len(words)
    # Heuristic-based fluency
    score = 70 + (word_count * 2)
    return min(100.0, max(30.0, score))
