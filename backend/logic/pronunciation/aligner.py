from typing import List, Tuple, Optional, Dict
from Levenshtein import distance as levenshtein_distance
import logging

logger = logging.getLogger(__name__)

def align_words_improved(transcript_words: List[str], reference_words: List[str]) -> List[Tuple[Optional[str], Optional[str]]]:
    """Alignment logic for comparing transcript with reference"""
    aligned_pairs = []
    t_idx = 0
    r_idx = 0
    
    while t_idx < len(transcript_words) and r_idx < len(reference_words):
        t_word = transcript_words[t_idx].lower().strip('.,!?;:')
        r_word = reference_words[r_idx].lower().strip('.,!?;:')
        
        if t_word == r_word or words_similar(t_word, r_word):
            aligned_pairs.append((t_word, r_word))
            t_idx += 1
            r_idx += 1
        else:
            # Look ahead for better match
            if (t_idx + 1 < len(transcript_words) and 
                words_similar(transcript_words[t_idx + 1].lower().strip('.,!?;:'), r_word)):
                aligned_pairs.append((t_word, None))
                t_idx += 1
            elif (r_idx + 1 < len(reference_words) and 
                  words_similar(reference_words[r_idx + 1].lower().strip('.,!?;:'), t_word)):
                aligned_pairs.append((None, r_word))
                r_idx += 1
            else:
                aligned_pairs.append((t_word, r_word))
                t_idx += 1
                r_idx += 1
                
    while t_idx < len(transcript_words):
        aligned_pairs.append((transcript_words[t_idx], None))
        t_idx += 1
    while r_idx < len(reference_words):
        aligned_pairs.append((None, reference_words[r_idx]))
        r_idx += 1
        
    return aligned_pairs

def words_similar(word1: str, word2: str, threshold: float = 0.7) -> bool:
    if not word1 or not word2: return False
    distance = levenshtein_distance(word1, word2)
    max_len = max(len(word1), len(word2))
    return (1.0 - (distance / max_len)) >= threshold if max_len > 0 else True
