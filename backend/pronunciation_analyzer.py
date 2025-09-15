import os
import re
import json
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from Levenshtein import distance as levenshtein_distance
import torch
import torchaudio
from transformers import WhisperProcessor, WhisperForConditionalGeneration
import logging

logger = logging.getLogger(__name__)

@dataclass
class PronunciationError:
    word: str
    expected_pronunciation: str
    actual_pronunciation: str
    confidence: float
    error_type: str  # 'substitution', 'deletion', 'insertion', 'stress'
    position: int
    suggestion: str

@dataclass
class PronunciationAnalysis:
    overall_score: float  # 0-100
    accuracy_score: float
    fluency_score: float
    pronunciation_errors: List[PronunciationError]
    transcript: str
    phonetic_transcript: str
    words_analyzed: int
    total_errors: int

class PronunciationAnalyzer:
    def __init__(self, model_id: str = "openai/whisper-small"):
        self.model_id = model_id
        self.processor = None
        self.model = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        # Common pronunciation patterns for different languages
        self.pronunciation_patterns = {
            'en': {
                'th': ['s', 'z', 'f', 'v', 'd', 't'],  # Common TH substitutions
                'r': ['w', 'l'],  # R pronunciation issues
                'v': ['w', 'b', 'f'],  # V pronunciation issues
                'w': ['v', 'u'],  # W pronunciation issues
            },
            'de': {
                'ü': ['u', 'ue', 'y'],  # German umlaut issues
                'ö': ['o', 'oe'],  # German umlaut issues
                'ä': ['a', 'ae', 'e'],  # German umlaut issues
                'ch': ['sh', 'k', 'h'],  # German CH sound
                'r': ['ah', 'er'],  # German R pronunciation
            }
        }
        
        # Word stress patterns (simplified)
        self.stress_patterns = {
            'en': {
                'photograph': 'PHO-to-graph',
                'photography': 'pho-TOG-ra-phy',
                'photographer': 'pho-TOG-ra-pher',
            }
        }

    def load_model(self):
        """Load the Whisper model for pronunciation analysis"""
        try:
            logger.info("Loading Whisper model for pronunciation analysis...")
            self.processor = WhisperProcessor.from_pretrained(self.model_id)
            self.model = WhisperForConditionalGeneration.from_pretrained(self.model_id).to(self.device)
            logger.info(f"Pronunciation model loaded successfully on device: {self.device}")
        except Exception as e:
            logger.error(f"Failed to load pronunciation model: {e}")
            raise e

    def analyze_pronunciation(self, audio_file_path: str, reference_text: str, language: str = "en") -> PronunciationAnalysis:
        """
        Analyze pronunciation by comparing audio with reference text
        """
        converted_path = None
        validated_path = None
        try:
            # Validate inputs
            if not audio_file_path or not os.path.exists(audio_file_path):
                raise ValueError(f"Audio file not found: {audio_file_path}")
            
            if not reference_text or not reference_text.strip():
                raise ValueError("Reference text cannot be empty")
            
            # First validate and fix audio file if needed
            try:
                validated_path = self._validate_and_fix_audio(audio_file_path)
                if validated_path != audio_file_path:
                    converted_path = validated_path  # Track for cleanup
            except Exception as validate_error:
                logger.warning(f"Audio validation failed: {validate_error}. Using original file...")
                validated_path = audio_file_path
            
            # Get transcription with timestamps
            try:
                transcript_with_timestamps = self._get_detailed_transcription(validated_path, language)
            except Exception as audio_error:
                logger.warning(f"Direct audio processing failed: {audio_error}. Trying additional conversion...")
                # Try converting to WAV with additional processing
                if validated_path == audio_file_path:  # Haven't converted yet
                    converted_path = self._convert_audio_to_wav(audio_file_path)
                    transcript_with_timestamps = self._get_detailed_transcription(converted_path, language)
                else:
                    # Already converted, this might be a deeper issue
                    raise audio_error
            
            # Validate transcription result
            if not transcript_with_timestamps or not isinstance(transcript_with_timestamps, dict):
                logger.error("Failed to get valid transcription")
                # Return a basic analysis with all words marked as missing
                reference_words = reference_text.split()
                return PronunciationAnalysis(
                    overall_score=0.0,
                    accuracy_score=0.0,
                    fluency_score=50.0,
                    pronunciation_errors=[
                        PronunciationError(
                            word=word,
                            expected_pronunciation=word,
                            actual_pronunciation='[missing]',
                            confidence=0.9,
                            error_type='deletion',
                            position=i,
                            suggestion=f"Make sure to pronounce '{word}'"
                        ) for i, word in enumerate(reference_words)
                    ],
                    transcript="[Transcription failed]",
                    phonetic_transcript="[Not available]",
                    words_analyzed=len(reference_words),
                    total_errors=len(reference_words)
                )
            
            # Compare with reference text
            try:
                pronunciation_errors = self._compare_pronunciation(
                    transcript_with_timestamps, 
                    reference_text, 
                    language
                )
                # Ensure pronunciation_errors is always a list
                if not isinstance(pronunciation_errors, list):
                    logger.warning("_compare_pronunciation didn't return a list, using empty list")
                    pronunciation_errors = []
            except Exception as e:
                logger.error(f"Pronunciation comparison failed: {e}")
                pronunciation_errors = []
            
            # Calculate scores with error handling
            try:
                overall_score = self._calculate_overall_score(pronunciation_errors, reference_text)
                if not isinstance(overall_score, (int, float)) or overall_score < 0 or overall_score > 100:
                    overall_score = 50.0
            except Exception as e:
                logger.error(f"Overall score calculation failed: {e}")
                overall_score = 50.0
            
            try:
                accuracy_score = self._calculate_accuracy_score(pronunciation_errors, reference_text)
                if not isinstance(accuracy_score, (int, float)) or accuracy_score < 0 or accuracy_score > 100:
                    accuracy_score = 50.0
            except Exception as e:
                logger.error(f"Accuracy score calculation failed: {e}")
                accuracy_score = 50.0
            
            try:
                fluency_score = self._calculate_fluency_score(transcript_with_timestamps)
                if not isinstance(fluency_score, (int, float)) or fluency_score < 0 or fluency_score > 100:
                    fluency_score = 50.0
            except Exception as e:
                logger.error(f"Fluency score calculation failed: {e}")
                fluency_score = 50.0
            
            # Generate phonetic transcription (simplified)
            try:
                transcript_text = transcript_with_timestamps.get('text', '[No text]')
                if not transcript_text or not isinstance(transcript_text, str):
                    transcript_text = '[No text]'
                phonetic_transcript = self._generate_phonetic_transcript(transcript_text)
                if not phonetic_transcript or not isinstance(phonetic_transcript, str):
                    phonetic_transcript = "[Not available]"
            except Exception as e:
                logger.error(f"Phonetic transcription failed: {e}")
                phonetic_transcript = "[Not available]"
                transcript_text = transcript_with_timestamps.get('text', '[No text]')
                if not transcript_text or not isinstance(transcript_text, str):
                    transcript_text = '[No text]'
            
            return PronunciationAnalysis(
                overall_score=overall_score,
                accuracy_score=accuracy_score,
                fluency_score=fluency_score,
                pronunciation_errors=pronunciation_errors,
                transcript=transcript_text,
                phonetic_transcript=phonetic_transcript,
                words_analyzed=len(reference_text.split()),
                total_errors=len(pronunciation_errors)
            )
            
        except Exception as e:
            logger.error(f"Error analyzing pronunciation: {e}")
            # Return a safe fallback analysis instead of raising
            reference_words = reference_text.split() if reference_text else ['unknown']
            return PronunciationAnalysis(
                overall_score=0.0,
                accuracy_score=0.0,
                fluency_score=0.0,
                pronunciation_errors=[
                    PronunciationError(
                        word=word,
                        expected_pronunciation=word,
                        actual_pronunciation='[error]',
                        confidence=0.5,
                        error_type='processing_error',
                        position=i,
                        suggestion=f"Unable to analyze '{word}' due to processing error"
                    ) for i, word in enumerate(reference_words)
                ],
                transcript="[Analysis failed]",
                phonetic_transcript="[Not available]",
                words_analyzed=len(reference_words),
                total_errors=len(reference_words)
            )
        finally:
            # Clean up converted file if it exists
            if converted_path and os.path.exists(converted_path):
                try:
                    os.remove(converted_path)
                except Exception as e:
                    logger.warning(f"Failed to clean up converted file {converted_path}: {e}")

    def _get_detailed_transcription(self, audio_file_path: str, language: str) -> Dict:
        """Get detailed transcription with word-level timestamps"""
        # Define default safe return structure
        default_return = {
            'text': "[Transcription error]",
            'words': []
        }
        
        try:
            # Check if model is loaded
            if self.processor is None or self.model is None:
                logger.error("Model not loaded - call load_model() first")
                try:
                    logger.info("Attempting to load model automatically...")
                    self.load_model()
                    logger.info("Model loaded successfully")
                except Exception as load_error:
                    logger.error(f"Failed to auto-load model: {load_error}")
                    return default_return
            
            # Load audio with multiple fallback methods
            try:
                waveform, sample_rate = self._load_audio_robust(audio_file_path)
                logger.info(f"Audio loaded successfully: {waveform.numel()} samples at {sample_rate}Hz")
            except Exception as e:
                logger.error(f"Failed to load audio: {e}")
                return default_return
            
            # Validate audio data
            if waveform is None or waveform.numel() == 0:
                logger.warning("Audio waveform is empty or None")
                return {
                    'text': "[No speech detected]",
                    'words': []
                }
            
            # Resample to 16kHz if needed
            if sample_rate != 16000:
                try:
                    resampler = torchaudio.transforms.Resample(orig_freq=sample_rate, new_freq=16000)
                    waveform = resampler(waveform)
                except Exception as e:
                    logger.error(f"Failed to resample audio: {e}")
                    return default_return
            
            # Convert to mono if stereo
            if waveform.shape[0] > 1:
                waveform = torch.mean(waveform, dim=0, keepdim=True)
            
            waveform = waveform.squeeze()
            
            # Check if audio is too short
            if len(waveform) < 1600:  # Less than 0.1 seconds at 16kHz
                logger.warning("Audio is too short for processing")
                return {
                    'text': "[Audio too short]",
                    'words': []
                }
            
            # Process with Whisper
            try:
                inputs = self.processor(waveform, sampling_rate=16000, return_tensors="pt")
                logger.debug("Whisper processor completed successfully")
            except Exception as e:
                logger.error(f"Failed to process with Whisper processor: {e}")
                return default_return
            
            if inputs is None or "input_features" not in inputs:
                logger.error("Failed to process audio with Whisper processor - no input_features")
                return default_return
            
            try:
                input_ids = inputs["input_features"].to(self.device)
                forced_decoder_ids = self.processor.get_decoder_prompt_ids(language=language, task="transcribe")
                
                with torch.no_grad():
                    # Use the generate method with task and language parameters (preferred approach)
                    predicted_ids = self.model.generate(
                        input_ids,
                        task="transcribe",
                        language=language,
                        max_length=448,
                        do_sample=False,  # Use greedy decoding for consistency
                        pad_token_id=self.processor.tokenizer.eos_token_id
                    )
                logger.debug("Model generation completed successfully")
            except Exception as e:
                logger.error(f"Failed to generate with model: {e}")
                return default_return
            
            if predicted_ids is None:
                logger.error("Model generation failed - no output returned")
                return default_return
            
            try:
                transcript = self.processor.batch_decode(predicted_ids, skip_special_tokens=True)[0]
                logger.debug(f"Raw transcript from model: '{transcript}'")
            except Exception as e:
                logger.error(f"Failed to decode transcript: {e}")
                return default_return
            
            # Clean up transcript
            transcript = transcript.strip() if transcript else ""
            if not transcript:
                logger.info("Empty transcript generated")
                return {
                    'text': "[No speech detected]",
                    'words': []
                }
            
            # Split into words and remove empty strings
            words = [word.strip() for word in transcript.split() if word.strip()]
            
            # If no words detected, return empty structure
            if not words:
                logger.info("No words detected in transcript")
                return {
                    'text': "[No speech detected]",
                    'words': []
                }
            
            word_timestamps = []
            duration = len(waveform) / 16000  # Duration in seconds
            
            # Ensure duration is valid
            if duration <= 0:
                duration = 1.0  # Fallback duration
            
            for i, word in enumerate(words):
                start_time = (i / len(words)) * duration
                end_time = ((i + 1) / len(words)) * duration
                word_timestamps.append({
                    'word': word,
                    'start': start_time,
                    'end': end_time
                })
            
            logger.info(f"Successfully transcribed: '{transcript}' with {len(words)} words")
            
            return {
                'text': transcript,
                'words': word_timestamps
            }
            
        except Exception as e:
            logger.error(f"Error getting detailed transcription: {e}")
            # Return a safe default structure instead of raising
            return default_return

    def _compare_pronunciation(self, transcript_data: Dict, reference_text: str, language: str) -> List[PronunciationError]:
        """Compare transcribed text with reference text to find pronunciation errors"""
        errors = []
        
        # Validate inputs
        if not transcript_data or not isinstance(transcript_data, dict):
            logger.error("Invalid transcript_data provided to _compare_pronunciation")
            return errors
        
        if not reference_text or not reference_text.strip():
            logger.error("Invalid reference_text provided to _compare_pronunciation")
            return errors
        
        # Extract words from transcript data
        transcript_words = []
        if 'words' in transcript_data and transcript_data['words']:
            # More robust word extraction with better validation
            for w in transcript_data['words']:
                if w and isinstance(w, dict) and 'word' in w and w['word']:
                    word = w['word'].lower().strip('.,!?;:')
                    if word:  # Only add non-empty words
                        transcript_words.append(word)
        elif 'text' in transcript_data and transcript_data['text']:
            # Fallback to splitting the text if words are not available
            transcript_words = [w.lower().strip('.,!?;:') for w in transcript_data['text'].split() if w.strip()]
        
        reference_words = [w.lower().strip('.,!?;:') for w in reference_text.split() if w.strip()]
        
        logger.info(f"Transcript words: {transcript_words}")
        logger.info(f"Reference words: {reference_words}")
        
        # Handle case where no words were transcribed
        if not transcript_words:
            logger.warning("No words found in transcript")
            # Create errors for all reference words
            for i, ref_word in enumerate(reference_words):
                error = PronunciationError(
                    word=ref_word,
                    expected_pronunciation=ref_word,
                    actual_pronunciation='[missing]',
                    confidence=0.9,
                    error_type='deletion',
                    position=i,
                    suggestion=f"Make sure to pronounce '{ref_word}'"
                )
                errors.append(error)
            return errors
        
        # Handle case where no reference words
        if not reference_words:
            logger.warning("No reference words provided")
            return errors
        
        # Use improved word alignment that better handles substitutions
        try:
            aligned_pairs = self._align_words_improved(transcript_words, reference_words)
        except Exception as e:
            logger.error(f"Word alignment failed: {e}")
            # Fallback to simple alignment
            aligned_pairs = self._simple_word_alignment(transcript_words, reference_words)
        
        # If alignment results in too many missing words, try simpler approach
        missing_count = sum(1 for t, r in aligned_pairs if t is None and r is not None)
        if missing_count > len(reference_words) * 0.5:  # More than 50% missing
            logger.warning("Too many missing words detected, using simple alignment")
            aligned_pairs = self._simple_word_alignment(transcript_words, reference_words)
        
        logger.info(f"Aligned pairs: {aligned_pairs}")
        
        for i, (transcript_word, reference_word) in enumerate(aligned_pairs):
            if transcript_word != reference_word and reference_word is not None:
                # Handle cases where transcript_word is None (deletion) or different (substitution)
                actual_word = transcript_word if transcript_word is not None else '[missing]'
                
                logger.info(f"Found error: expected='{reference_word}', actual='{actual_word}'")
                
                try:
                    error_type = self._classify_error_type(transcript_word, reference_word, language)
                    confidence = self._calculate_error_confidence(transcript_word, reference_word)
                    suggestion = self._generate_suggestion(reference_word, transcript_word, language)
                    
                    error = PronunciationError(
                        word=reference_word,
                        expected_pronunciation=reference_word,
                        actual_pronunciation=actual_word,
                        confidence=confidence,
                        error_type=error_type,
                        position=i,
                        suggestion=suggestion
                    )
                    errors.append(error)
                except Exception as e:
                    logger.error(f"Error creating PronunciationError for word '{reference_word}': {e}")
                    # Create a basic error as fallback
                    error = PronunciationError(
                        word=reference_word,
                        expected_pronunciation=reference_word,
                        actual_pronunciation=actual_word,
                        confidence=0.5,
                        error_type='substitution',
                        position=i,
                        suggestion=f"Practice saying '{reference_word}'"
                    )
                    errors.append(error)
        
        return errors

    def _align_words(self, transcript_words: List[str], reference_words: List[str]) -> List[Tuple[Optional[str], Optional[str]]]:
        """Align transcript words with reference words using dynamic programming"""
        m, n = len(transcript_words), len(reference_words)
        
        # Create DP table
        dp = [[0] * (n + 1) for _ in range(m + 1)]
        
        # Fill DP table
        for i in range(1, m + 1):
            for j in range(1, n + 1):
                if transcript_words[i-1] == reference_words[j-1]:
                    dp[i][j] = dp[i-1][j-1] + 1
                else:
                    dp[i][j] = max(dp[i-1][j], dp[i][j-1])
        
        # Backtrack to find alignment
        aligned_pairs = []
        i, j = m, n
        
        while i > 0 and j > 0:
            if transcript_words[i-1] == reference_words[j-1]:
                aligned_pairs.append((transcript_words[i-1], reference_words[j-1]))
                i -= 1
                j -= 1
            elif dp[i-1][j] > dp[i][j-1]:
                aligned_pairs.append((transcript_words[i-1], None))
                i -= 1
            else:
                aligned_pairs.append((None, reference_words[j-1]))
                j -= 1
        
        while i > 0:
            aligned_pairs.append((transcript_words[i-1], None))
            i -= 1
        
        while j > 0:
            aligned_pairs.append((None, reference_words[j-1]))
            j -= 1
        
        return list(reversed(aligned_pairs))

    def _align_words_improved(self, transcript_words: List[str], reference_words: List[str]) -> List[Tuple[Optional[str], Optional[str]]]:
        """Improved word alignment that better handles pronunciation variations"""
        aligned_pairs = []
        
        # Handle empty lists
        if not transcript_words and not reference_words:
            return aligned_pairs
        elif not transcript_words:
            return [(None, ref_word) for ref_word in reference_words]
        elif not reference_words:
            return [(trans_word, None) for trans_word in transcript_words]
        
        # First, try direct word-by-word comparison with fuzzy matching
        t_idx = 0  # transcript index
        r_idx = 0  # reference index
        
        while t_idx < len(transcript_words) and r_idx < len(reference_words):
            t_word = transcript_words[t_idx]
            r_word = reference_words[r_idx]
            
            # Skip None or empty words
            if not t_word:
                t_idx += 1
                continue
            if not r_word:
                r_idx += 1
                continue
            
            # Direct match
            if t_word == r_word:
                aligned_pairs.append((t_word, r_word))
                t_idx += 1
                r_idx += 1
            # Fuzzy match (similar words)
            elif self._words_similar(t_word, r_word):
                aligned_pairs.append((t_word, r_word))
                t_idx += 1
                r_idx += 1
            # Look ahead for better matches
            else:
                # Check if next transcript word matches current reference word
                if (t_idx + 1 < len(transcript_words) and 
                    transcript_words[t_idx + 1] and
                    (transcript_words[t_idx + 1] == r_word or self._words_similar(transcript_words[t_idx + 1], r_word))):
                    # Current transcript word is an insertion
                    aligned_pairs.append((t_word, None))
                    t_idx += 1
                # Check if next reference word matches current transcript word
                elif (r_idx + 1 < len(reference_words) and 
                      reference_words[r_idx + 1] and
                      (reference_words[r_idx + 1] == t_word or self._words_similar(reference_words[r_idx + 1], t_word))):
                    # Current reference word is a deletion
                    aligned_pairs.append((None, r_word))
                    r_idx += 1
                # Neither matches, treat as substitution
                else:
                    aligned_pairs.append((t_word, r_word))
                    t_idx += 1
                    r_idx += 1
        
        # Handle remaining words
        while t_idx < len(transcript_words):
            if transcript_words[t_idx]:  # Only add non-empty words
                aligned_pairs.append((transcript_words[t_idx], None))
            t_idx += 1
        
        while r_idx < len(reference_words):
            if reference_words[r_idx]:  # Only add non-empty words
                aligned_pairs.append((None, reference_words[r_idx]))
            r_idx += 1
        
        return aligned_pairs

    def _words_similar(self, word1: str, word2: str, threshold: float = 0.7) -> bool:
        """Check if two words are similar enough to be considered the same"""
        if not word1 or not word2:
            return False
        
        # Calculate similarity based on edit distance
        distance = levenshtein_distance(word1, word2)
        max_len = max(len(word1), len(word2))
        
        if max_len == 0:
            return True
        
        similarity = 1.0 - (distance / max_len)
        return similarity >= threshold

    def _simple_word_alignment(self, transcript_words: List[str], reference_words: List[str]) -> List[Tuple[Optional[str], Optional[str]]]:
        """Simple word alignment that pairs words by position"""
        aligned_pairs = []
        max_len = max(len(transcript_words), len(reference_words))
        
        for i in range(max_len):
            transcript_word = transcript_words[i] if i < len(transcript_words) else None
            reference_word = reference_words[i] if i < len(reference_words) else None
            aligned_pairs.append((transcript_word, reference_word))
        
        return aligned_pairs

    def _classify_error_type(self, transcript_word: Optional[str], reference_word: str, language: str) -> str:
        """Classify the type of pronunciation error"""
        if transcript_word is None:
            return 'deletion'
        
        if reference_word is None:
            return 'insertion'
        
        # Check for common pronunciation substitutions
        patterns = self.pronunciation_patterns.get(language, {})
        for sound, substitutions in patterns.items():
            if sound in reference_word and any(sub in transcript_word for sub in substitutions):
                return 'substitution'
        
        # Check Levenshtein distance
        distance = levenshtein_distance(transcript_word, reference_word)
        if distance == 1:
            return 'substitution'
        elif distance > 1:
            return 'errors'
        
        return 'substitution'

    def _calculate_error_confidence(self, transcript_word: Optional[str], reference_word: str) -> float:
        """Calculate confidence score for the error detection"""
        if transcript_word is None:
            return 0.9  # High confidence for deletions
        
        distance = levenshtein_distance(transcript_word, reference_word)
        max_len = max(len(transcript_word), len(reference_word))
        
        if max_len == 0:
            return 1.0
        
        similarity = 1.0 - (distance / max_len)
        return max(0.1, 1.0 - similarity)  # Invert similarity for error confidence

    def _generate_suggestion(self, reference_word: str, transcript_word: Optional[str], language: str) -> str:
        """Generate a helpful suggestion for pronunciation improvement"""
        if transcript_word is None:
            return f"Don't forget to pronounce '{reference_word}'"
        
        patterns = self.pronunciation_patterns.get(language, {})
        
        # Check for common patterns
        for sound, substitutions in patterns.items():
            if sound in reference_word and any(sub in transcript_word for sub in substitutions):
                return f"Focus on the '{sound}' sound in '{reference_word}'"
        
        # Check for stress patterns
        stress_patterns = self.stress_patterns.get(language, {})
        if reference_word in stress_patterns:
            return f"Pay attention to stress: {stress_patterns[reference_word]}"
        
        return f"Practice saying '{reference_word}' slowly"

    def _calculate_overall_score(self, errors: List[PronunciationError], reference_text: str) -> float:
        """Calculate overall pronunciation score (0-100)"""
        total_words = len(reference_text.split())
        if total_words == 0:
            return 100.0
        
        error_count = len(errors)
        accuracy = max(0, (total_words - error_count) / total_words)
        
        # Weight by error confidence
        weighted_errors = sum(error.confidence for error in errors)
        weighted_accuracy = max(0, (total_words - weighted_errors) / total_words)
        
        return round(weighted_accuracy * 100, 1)

    def _calculate_accuracy_score(self, errors: List[PronunciationError], reference_text: str) -> float:
        """Calculate pronunciation accuracy score"""
        total_words = len(reference_text.split())
        if total_words == 0:
            return 100.0
        
        error_count = len(errors)
        accuracy = max(0, (total_words - error_count) / total_words)
        return round(accuracy * 100, 1)

    def _calculate_fluency_score(self, transcript_data: Dict) -> float:
        """Calculate fluency score based on speech characteristics and word count"""
        if not transcript_data or not isinstance(transcript_data, dict):
            logger.warning("Invalid transcript_data for fluency calculation")
            return 50.0
        
        words = transcript_data.get('words', [])
        transcript_text = transcript_data.get('text', '')
        
        if not words or len(words) < 1:
            logger.info("No words for fluency calculation")
            return 50.0
        
        try:
            # Base score calculation using multiple factors
            word_count = len(words)
            
            # Factor 1: Word count fluency (more words = better fluency up to a point)
            if word_count <= 2:
                word_count_score = 60  # Short phrases get moderate score
            elif word_count <= 5:
                word_count_score = 70 + (word_count - 2) * 5  # Progressive improvement
            elif word_count <= 10:
                word_count_score = 85 + (word_count - 5) * 2  # Diminishing returns
            else:
                word_count_score = 95  # Cap at 95 for longer phrases
            
            # Factor 2: Speech completeness (check if speech sounds complete)
            completeness_score = 85  # Base completeness score
            if transcript_text:
                # Bonus for complete sentences (ending with punctuation)
                if transcript_text.strip().endswith(('.', '!', '?')):
                    completeness_score += 10
                # Penalty for very short or incomplete-sounding speech
                if len(transcript_text.strip()) < 10:
                    completeness_score -= 15
            
            # Factor 3: Word distribution (check for natural speech patterns)
            distribution_score = 80
            if word_count > 1:
                # Calculate average word length
                avg_word_length = sum(len(word.get('word', '')) for word in words if isinstance(word, dict)) / word_count
                if 3 <= avg_word_length <= 6:  # Natural word length range
                    distribution_score = 90
                elif avg_word_length < 2:  # Very short words might indicate issues
                    distribution_score = 70
            
            # Combine factors with weights
            fluency_score = (
                word_count_score * 0.4 +      # 40% weight on word count
                completeness_score * 0.4 +    # 40% weight on completeness
                distribution_score * 0.2       # 20% weight on distribution
            )
            
            # Apply realistic bounds
            fluency_score = max(30, min(100, fluency_score))
            
            logger.info(f"Fluency calculation: words={word_count}, word_score={word_count_score}, "
                       f"completeness={completeness_score}, distribution={distribution_score}, "
                       f"final_score={fluency_score}")
            
            return round(fluency_score, 1)
            
        except Exception as e:
            logger.error(f"Error calculating fluency score: {e}")
            return 75.0  # Return a neutral score on error

    def _generate_phonetic_transcript(self, text: str) -> str:
        """Generate a simplified phonetic transcription"""
        # Validate input
        if not text or not isinstance(text, str):
            return "[Invalid text]"
        
        try:
            # This is a simplified version - in production, you'd use a proper phonetic library
            phonetic_map = {
                'th': 'θ',
                'sh': 'ʃ',
                'ch': 'tʃ',
                'ng': 'ŋ',
                'ph': 'f',
                'gh': 'f',
            }
            
            phonetic = text.lower()
            for grapheme, phoneme in phonetic_map.items():
                phonetic = phonetic.replace(grapheme, phoneme)
            
            return phonetic
        except Exception as e:
            logger.error(f"Error generating phonetic transcript: {e}")
            return "[Phonetic error]"

    def _load_audio_robust(self, audio_file_path: str) -> Tuple[torch.Tensor, int]:
        """Load audio with multiple fallback methods to handle various formats including WebM"""
        logger.info(f"Loading audio file: {audio_file_path}")
        
        # Check if file exists
        if not audio_file_path or not os.path.exists(audio_file_path):
            raise Exception(f"Audio file not found: {audio_file_path}")
        
        # Get file size and extension for logging
        try:
            file_size = os.path.getsize(audio_file_path)
            file_ext = os.path.splitext(audio_file_path)[1].lower()
            logger.info(f"Audio file size: {file_size} bytes, extension: {file_ext}")
            
            if file_size == 0:
                raise Exception("Audio file is empty")
                
        except Exception as e:
            logger.error(f"Error checking file: {e}")
            raise Exception(f"Cannot access audio file: {e}")
        
        # Method 1: Try torchaudio with different backends
        try:
            # First try with default backend
            waveform, sample_rate = torchaudio.load(audio_file_path)
            if waveform is not None and waveform.numel() > 0:
                logger.info(f"Audio loaded with torchaudio. Sample rate: {sample_rate}, Shape: {waveform.shape}")
                return waveform, sample_rate
        except Exception as e:
            logger.warning(f"torchaudio default backend failed to load {audio_file_path}: {e}")
            
        # Try with soundfile backend if available
        try:
            original_backend = torchaudio.get_audio_backend()
            if original_backend != 'soundfile':
                try:
                    torchaudio.set_audio_backend('soundfile')
                    waveform, sample_rate = torchaudio.load(audio_file_path)
                    if waveform is not None and waveform.numel() > 0:
                        logger.info(f"Audio loaded with torchaudio soundfile backend. Sample rate: {sample_rate}, Shape: {waveform.shape}")
                        return waveform, sample_rate
                finally:
                    torchaudio.set_audio_backend(original_backend)
        except Exception as e:
            logger.warning(f"torchaudio soundfile backend failed: {e}")

        # Method 2: Try librosa with explicit audio reading and suppress warnings
        try:
            import librosa
            import warnings
            # Temporarily suppress warnings for cleaner output
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                waveform, sample_rate = librosa.load(audio_file_path, sr=None)
            if waveform is not None and len(waveform) > 0:
                waveform = torch.tensor(waveform).unsqueeze(0)
                logger.info(f"Audio loaded with librosa. Sample rate: {sample_rate}, Shape: {waveform.shape}")
                return waveform, sample_rate
        except ImportError:
            logger.warning("librosa not available")
        except Exception as e:
            logger.warning(f"librosa failed to load {audio_file_path}: {e}")
        
        # Method 3: Try pydub for WebM and other formats
        try:
            from pydub import AudioSegment
            import numpy as np
            
            # Load audio with pydub
            if file_ext == '.webm':
                audio = AudioSegment.from_file(audio_file_path, format="webm")
            elif file_ext == '.mp4' or file_ext == '.m4a':
                audio = AudioSegment.from_file(audio_file_path, format="mp4")
            else:
                audio = AudioSegment.from_file(audio_file_path)
            
            if audio is None or len(audio) == 0:
                raise Exception("pydub loaded empty audio")
            
            # Convert to mono and resample if needed
            audio = audio.set_channels(1)
            sample_rate = audio.frame_rate
            
            # Convert to numpy array and then to torch tensor
            samples = np.array(audio.get_array_of_samples(), dtype=np.float32)
            if audio.sample_width == 2:  # 16-bit
                samples = samples / 32768.0
            elif audio.sample_width == 4:  # 32-bit
                samples = samples / 2147483648.0
            
            if len(samples) == 0:
                raise Exception("No audio samples extracted")
            
            waveform = torch.tensor(samples).unsqueeze(0)
            logger.info(f"Audio loaded with pydub. Sample rate: {sample_rate}, Shape: {waveform.shape}")
            return waveform, sample_rate
            
        except ImportError:
            logger.warning("pydub not available")
        except Exception as e:
            logger.warning(f"pydub failed to load {audio_file_path}: {e}")
        
        # Method 4: Try ffmpeg-python directly
        try:
            import ffmpeg
            import numpy as np
            
            # Use ffmpeg to convert to raw audio
            out, err = (
                ffmpeg
                .input(audio_file_path)
                .output('pipe:', format='f32le', acodec='pcm_f32le', ac=1, ar=16000)
                .run(capture_stdout=True, capture_stderr=True)
            )
            
            if not out:
                raise Exception(f"ffmpeg produced no output. Error: {err.decode() if err else 'Unknown'}")
            
            # Convert bytes to numpy array and then to torch tensor
            samples = np.frombuffer(out, np.float32)
            
            if len(samples) == 0:
                raise Exception("No audio samples from ffmpeg")
            
            waveform = torch.tensor(samples).unsqueeze(0)
            sample_rate = 16000  # We forced 16kHz in ffmpeg
            
            logger.info(f"Audio loaded with ffmpeg. Sample rate: {sample_rate}, Shape: {waveform.shape}")
            return waveform, sample_rate
            
        except ImportError:
            logger.warning("ffmpeg-python not available")
        except Exception as e:
            logger.warning(f"ffmpeg failed to load {audio_file_path}: {e}")
        
        # If all methods fail, raise an error
        raise Exception(f"Failed to load audio file {audio_file_path}. Tried torchaudio, librosa, pydub, and ffmpeg. "
                       f"File format {file_ext} may not be supported. Please convert to WAV, MP3, or FLAC.")

    def _convert_audio_to_wav(self, input_path: str) -> str:
        """Convert audio file to WAV format using ffmpeg with robust error handling"""
        import tempfile
        import subprocess
        
        logger.info(f"Converting audio file to WAV: {input_path}")
        
        # Check if file is already WAV - but still validate it's properly formatted
        if input_path.lower().endswith('.wav'):
            try:
                # Try to validate the WAV file by attempting to load it
                file_size = os.path.getsize(input_path)
                if file_size > 44:  # Minimum WAV header size
                    # Quick validation - check if it's a proper WAV file
                    with open(input_path, 'rb') as f:
                        header = f.read(12)
                        if header[:4] == b'RIFF' and header[8:12] == b'WAVE':
                            logger.info(f"File {input_path} is already a valid WAV file")
                            return input_path
                logger.warning(f"WAV file {input_path} appears to be invalid, will re-encode")
            except Exception as e:
                logger.warning(f"Error validating WAV file {input_path}: {e}, will re-encode")
        
        # Create temporary WAV file
        temp_wav = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
        temp_wav.close()
        
        try:
            # Use ffmpeg to convert to WAV with more robust settings
            cmd = [
                'ffmpeg', '-i', input_path,
                '-acodec', 'pcm_s16le',  # 16-bit PCM
                '-ac', '1',  # Mono
                '-ar', '16000',  # 16kHz sample rate
                '-f', 'wav',  # Force WAV format
                '-loglevel', 'error',  # Reduce ffmpeg output noise
                '-y',  # Overwrite output file
                temp_wav.name
            ]
            
            result = subprocess.run(cmd, check=True, capture_output=True, text=True)
            
            # Validate the output file
            if not os.path.exists(temp_wav.name) or os.path.getsize(temp_wav.name) == 0:
                raise Exception("ffmpeg produced empty output file")
            
            logger.info(f"Successfully converted {input_path} to WAV: {temp_wav.name}")
            return temp_wav.name
            
        except subprocess.CalledProcessError as e:
            error_msg = e.stderr.decode() if e.stderr else "Unknown error"
            logger.error(f"ffmpeg conversion failed: {error_msg}")
            if os.path.exists(temp_wav.name):
                os.unlink(temp_wav.name)  # Clean up temp file
            raise Exception(f"Failed to convert audio file to WAV format: {error_msg}")
        except FileNotFoundError:
            logger.error("ffmpeg not found")
            if os.path.exists(temp_wav.name):
                os.unlink(temp_wav.name)  # Clean up temp file
            raise Exception("ffmpeg not found. Please install ffmpeg for audio format conversion.")
        except Exception as e:
            logger.error(f"Unexpected error during conversion: {e}")
            if os.path.exists(temp_wav.name):
                os.unlink(temp_wav.name)  # Clean up temp file
            raise Exception(f"Unexpected error during audio conversion: {e}")

    def _validate_and_fix_audio(self, audio_file_path: str) -> str:
        """Validate audio file and fix common issues"""
        logger.info(f"Validating audio file: {audio_file_path}")
        
        try:
            # Check file size
            file_size = os.path.getsize(audio_file_path)
            if file_size == 0:
                raise Exception("Audio file is empty")
            
            # Check file extension
            file_ext = os.path.splitext(audio_file_path)[1].lower()
            logger.info(f"Audio file extension: {file_ext}, size: {file_size} bytes")
            
            # For WAV files, do additional validation
            if file_ext == '.wav':
                try:
                    with open(audio_file_path, 'rb') as f:
                        header = f.read(44)  # WAV header is typically 44 bytes
                        if len(header) < 12:
                            raise Exception("WAV file too small to contain valid header")
                        
                        # Check RIFF header
                        if header[:4] != b'RIFF':
                            logger.warning("WAV file missing RIFF header")
                            return self._convert_audio_to_wav(audio_file_path)
                        
                        # Check WAVE format
                        if header[8:12] != b'WAVE':
                            logger.warning("WAV file missing WAVE format marker")
                            return self._convert_audio_to_wav(audio_file_path)
                        
                        logger.info("WAV file appears to have valid header")
                        
                except Exception as e:
                    logger.warning(f"WAV validation failed: {e}, will re-encode")
                    return self._convert_audio_to_wav(audio_file_path)
            
            # For other formats, try conversion to ensure compatibility
            elif file_ext in ['.webm', '.mp4', '.m4a', '.ogg', '.flac']:
                logger.info(f"Converting {file_ext} file to WAV for better compatibility")
                return self._convert_audio_to_wav(audio_file_path)
            
            return audio_file_path
            
        except Exception as e:
            logger.error(f"Audio validation failed: {e}")
            # Try to fix by converting
            try:
                return self._convert_audio_to_wav(audio_file_path)
            except Exception as conv_error:
                logger.error(f"Audio conversion also failed: {conv_error}")
                raise Exception(f"Unable to validate or fix audio file: {e}")
