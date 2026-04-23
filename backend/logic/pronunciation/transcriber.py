import torch
import torchaudio
import logging
from typing import Dict
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
        
        inputs = processor(waveform, sampling_rate=16000, return_tensors="pt")
        input_ids = inputs["input_features"].to(device)
        
        with torch.no_grad():
            predicted_ids = model.generate(
                input_ids,
                task="transcribe",
                language=language,
                max_length=448,
                do_sample=False
            )
            
        transcript = processor.batch_decode(predicted_ids, skip_special_tokens=True)[0].strip()
        words = [w.strip() for w in transcript.split() if w.strip()]
        
        word_timestamps = []
        for i, word in enumerate(words):
            start_time = (i / len(words)) * duration
            end_time = ((i + 1) / len(words)) * duration
            word_timestamps.append({
                'word': word,
                'start': start_time,
                'end': end_time
            })
            
        return {'text': transcript, 'words': word_timestamps}
    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        return {'text': "[Transcription error]", 'words': []}
