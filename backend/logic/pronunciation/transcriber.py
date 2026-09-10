import torch
import torchaudio
import logging
from typing import Dict
from backend.services.stt_provider import transcribe_with_free_ai, using_hosted_stt
from .audio import load_audio_robust

logger = logging.getLogger(__name__)

async def get_detailed_transcription(audio_file_path: str, language: str, processor, model, device) -> Dict:
    """Get detailed transcription with word-level timestamps using Whisper"""
    try:
        waveform, sample_rate = await load_audio_robust(audio_file_path)
        
        # Resample and mono-ize
        if sample_rate != 16000:
            resampler = torchaudio.transforms.Resample(orig_freq=sample_rate, new_freq=16000)
            waveform = resampler(waveform)
        if waveform.shape[0] > 1:
            waveform = torch.mean(waveform, dim=0, keepdim=True)
        
        waveform = waveform.squeeze()
        duration = len(waveform) / 16000

        if using_hosted_stt():
            transcript_data = await transcribe_with_free_ai(audio_file_path, language)
            words = [w.strip() for w in transcript_data["text"].split() if w.strip()]
            transcript_data["words"] = build_even_word_timestamps(words, duration)
            return transcript_data
        
        inputs = processor(waveform, sampling_rate=16000, return_tensors="pt")
        input_ids = inputs["input_features"].to(device)
        
        with torch.no_grad():
            generation = model.generate(
                input_ids,
                task="transcribe",
                language=language,
                max_length=448,
                do_sample=False,
                return_dict_in_generate=True,
                output_scores=True,
            )
            
        predicted_ids = generation.sequences
        transcript = processor.batch_decode(predicted_ids, skip_special_tokens=True)[0].strip()
        words = [w.strip() for w in transcript.split() if w.strip()]

        token_confidences = []
        for scores in generation.scores or []:
            probabilities = torch.softmax(scores, dim=-1)
            token_confidences.append(float(probabilities.max().item()))

        average_token_confidence = (
            sum(token_confidences) / len(token_confidences)
            if token_confidences else None
        )
        
        word_timestamps = build_even_word_timestamps(words, duration)
            
        return {
            'text': transcript,
            'words': word_timestamps,
            'average_token_confidence': average_token_confidence,
        }
    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        return {'text': "[Transcription error]", 'words': []}

def build_even_word_timestamps(words, duration: float):
    if not words:
        return []

    return [
        {
            'word': word,
            'start': (i / len(words)) * duration,
            'end': ((i + 1) / len(words)) * duration,
        }
        for i, word in enumerate(words)
    ]
