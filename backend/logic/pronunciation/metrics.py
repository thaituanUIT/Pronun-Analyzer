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

def calculate_overall_score(
    errors: List[PronunciationError],
    total_words: int,
    fluency_score: Optional[float] = None,
    acoustic_score: Optional[float] = None,
) -> float:
    accuracy_score = calculate_accuracy_score(errors, total_words)
    weighted_error_score = 100.0

    if total_words > 0:
        weighted_errors = sum(error.confidence for error in errors)
        weighted_error_score = max(0, (total_words - weighted_errors) / total_words) * 100

    if fluency_score is None:
        fluency_score = 50.0
    if acoustic_score is None:
        acoustic_score = fluency_score

    return round(
        (accuracy_score * 0.45)
        + (weighted_error_score * 0.25)
        + (fluency_score * 0.20)
        + (acoustic_score * 0.10),
        1,
    )

def calculate_accuracy_score(errors: List[PronunciationError], total_words: int) -> float:
    if total_words == 0: return 100.0
    return round(max(0, (total_words - len(errors)) / total_words) * 100, 1)

def calculate_fluency_score(transcript_data: Dict, acoustic_features: Optional[Dict] = None) -> float:
    words = transcript_data.get('words', [])
    if not words:
        return 30.0

    if not acoustic_features:
        word_count = len(words)
        score = 70 + (word_count * 2)
        return min(100.0, max(30.0, score))
    
    return acoustic_features.get('fluency_score', 50.0)

def calculate_acoustic_features(waveform, sample_rate: int, transcript_data: Dict) -> Dict[str, float]:
    if waveform.numel() == 0 or sample_rate <= 0:
        return {
            'duration_seconds': 0.0,
            'rms_energy': 0.0,
            'silence_ratio': 1.0,
            'pause_count': 0.0,
            'speech_rate_wpm': 0.0,
            'token_confidence': 0.0,
            'fluency_score': 30.0,
            'acoustic_score': 30.0,
        }

    if waveform.dim() > 1:
        waveform = waveform.mean(dim=0)
    waveform = waveform.float().flatten()

    duration_seconds = float(waveform.numel() / sample_rate)
    rms_energy = float(waveform.pow(2).mean().sqrt().item())

    frame_size = max(1, int(sample_rate * 0.03))
    frame_count = max(1, waveform.numel() // frame_size)
    trimmed = waveform[:frame_count * frame_size]
    frames = trimmed.reshape(frame_count, frame_size)
    frame_energy = frames.pow(2).mean(dim=1).sqrt()

    energy_mean = frame_energy.mean()
    silence_threshold = max(float(energy_mean.item()) * 0.35, 1e-4)
    silent_frames = frame_energy < silence_threshold
    silence_ratio = float(silent_frames.float().mean().item())

    pause_count = 0
    current_silent_frames = 0
    min_pause_frames = max(1, int(0.25 / 0.03))
    for is_silent in silent_frames.tolist():
        if is_silent:
            current_silent_frames += 1
        else:
            if current_silent_frames >= min_pause_frames:
                pause_count += 1
            current_silent_frames = 0
    if current_silent_frames >= min_pause_frames:
        pause_count += 1

    word_count = len(transcript_data.get('words', []))
    speech_rate_wpm = float((word_count / duration_seconds) * 60) if duration_seconds > 0 else 0.0
    token_confidence = transcript_data.get('average_token_confidence')
    token_confidence = float(token_confidence) if token_confidence is not None else 0.5

    speech_rate_score = max(0.0, 100.0 - abs(speech_rate_wpm - 135.0) * 1.2)
    silence_score = max(0.0, 100.0 - min(silence_ratio, 0.7) / 0.7 * 100.0)
    pause_penalty = min(35.0, pause_count * 4.0)
    confidence_score = max(0.0, min(100.0, token_confidence * 100.0))

    fluency_score = max(
        30.0,
        min(100.0, (speech_rate_score * 0.45) + (silence_score * 0.35) + (confidence_score * 0.20) - pause_penalty),
    )
    acoustic_score = max(
        30.0,
        min(100.0, (silence_score * 0.35) + (speech_rate_score * 0.30) + (confidence_score * 0.35) - (pause_penalty * 0.5)),
    )

    return {
        'duration_seconds': round(duration_seconds, 3),
        'rms_energy': round(rms_energy, 6),
        'silence_ratio': round(silence_ratio, 3),
        'pause_count': float(pause_count),
        'speech_rate_wpm': round(speech_rate_wpm, 1),
        'token_confidence': round(token_confidence, 3),
        'fluency_score': round(fluency_score, 1),
        'acoustic_score': round(acoustic_score, 1),
    }
