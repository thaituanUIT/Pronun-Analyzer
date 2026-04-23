import logging
from backend.models import PronunciationAnalysis, PronunciationError
from .audio import validate_and_fix_audio
from .transcriber import get_detailed_transcription
from .aligner import align_words_improved
from .metrics import (
    classify_error_type, calculate_error_confidence, 
    calculate_overall_score, calculate_accuracy_score, calculate_fluency_score
)
from .utils import generate_suggestion, generate_phonetic_transcript

logger = logging.getLogger(__name__)

class PronunciationAnalyzer:
    def __init__(self, processor, model, device):
        self.processor = processor
        self.model = model
        self.device = device
        
        self.pronunciation_patterns = {
            'en': {'th': ['s', 'z', 'f', 'v', 'd', 't'], 'r': ['w', 'l'], 'v': ['w', 'b', 'f'], 'w': ['v', 'u']},
            'de': {'ü': ['u', 'ue', 'y'], 'ö': ['o', 'oe'], 'ä': ['a', 'ae', 'e'], 'ch': ['sh', 'k', 'h'], 'r': ['ah', 'er']}
        }
        self.stress_patterns = {
            'en': {'photograph': 'PHO-to-graph', 'photography': 'pho-TOG-ra-phy', 'photographer': 'pho-TOG-ra-pher'}
        }

    async def analyze_pronunciation(self, audio_file_path: str, reference_text: str, language: str = "en") -> PronunciationAnalysis:
        try:
            # 1. Audio Validation
            validated_path = await validate_and_fix_audio(audio_file_path)
            
            # 2. Transcription
            transcript_data = await get_detailed_transcription(
                validated_path, language, self.processor, self.model, self.device
            )
            
            # 3. Alignment
            transcript_words = [w['word'] for w in transcript_data['words']]
            reference_words = reference_text.split()
            aligned_pairs = align_words_improved(transcript_words, reference_words)
            
            # 4. Error Identification
            errors = []
            patterns = self.pronunciation_patterns.get(language, {})
            for i, (t_word, r_word) in enumerate(aligned_pairs):
                if r_word is not None and t_word != r_word:
                    errors.append(PronunciationError(
                        word=r_word,
                        expected_pronunciation=r_word,
                        actual_pronunciation=t_word or '[missing]',
                        confidence=calculate_error_confidence(t_word, r_word),
                        error_type=classify_error_type(t_word, r_word, patterns),
                        position=i,
                        suggestion=generate_suggestion(r_word, t_word, patterns, self.stress_patterns.get(language, {}))
                    ))
            
            # 5. Scoring
            total_words = len(reference_words)
            analysis = PronunciationAnalysis(
                overall_score=calculate_overall_score(errors, total_words),
                accuracy_score=calculate_accuracy_score(errors, total_words),
                fluency_score=calculate_fluency_score(transcript_data),
                pronunciation_errors=errors,
                transcript=transcript_data['text'],
                phonetic_transcript=generate_phonetic_transcript(transcript_data['text']),
                words_analyzed=total_words,
                total_errors=len(errors)
            )
            return analysis
            
        except Exception as e:
            logger.error(f"Error in analyze_pronunciation: {e}")
            raise e
