from typing import Optional, Dict

def generate_suggestion(reference_word: str, transcript_word: Optional[str], patterns: Dict, stress_patterns: Dict) -> str:
    if transcript_word is None:
        return f"Don't forget to pronounce '{reference_word}'"
    
    for sound, substitutions in patterns.items():
        if sound in reference_word and any(sub in transcript_word for sub in substitutions):
            return f"Focus on the '{sound}' sound in '{reference_word}'"
            
    if reference_word in stress_patterns:
        return f"Pay attention to stress: {stress_patterns[reference_word]}"
        
    return f"Practice saying '{reference_word}' slowly"

def generate_phonetic_transcript(text: str) -> str:
    phonetic_map = {'th': 'θ', 'sh': 'ʃ', 'ch': 'tʃ', 'ng': 'ŋ', 'ph': 'f', 'gh': 'f'}
    result = text.lower()
    for k, v in phonetic_map.items():
        result = result.replace(k, v)
    return result
