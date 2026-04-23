import os
import torch
import torchaudio
import logging
from typing import Generator, Tuple

logger = logging.getLogger(__name__)

async def process_audio_file(file_path: str, processor, model, device, language: str = "de", task: str = "transcribe"):
    """
    Process audio file and yield progress. 
    Converted to async generator to allow better integration with FastAPI event loop.
    """
    try:
        logger.info(f"Processing audio file: {file_path}")
        
        # Load audio (simplified for brevity, should use the robust loading from app.py)
        # Using a helper for robust loading
        waveform, sample_rate = await load_audio_robust(file_path)
        
        if waveform.numel() == 0:
            raise Exception("Audio file appears to be empty or corrupted")
        
        # Resample to 16kHz if needed
        if sample_rate != 16000:
            resampler = torchaudio.transforms.Resample(orig_freq=sample_rate, new_freq=16000)
            waveform = resampler(waveform)
        
        # Convert to mono if stereo
        if waveform.shape[0] > 1:
            waveform = torch.mean(waveform, dim=0, keepdim=True)
        
        waveform = waveform.squeeze()
        duration = len(waveform) / 16000
        
        # Chunk processing (30s chunks for Whisper)
        CHUNK_SIZE = 30 * 16000
        chunks = [waveform[i:i+CHUNK_SIZE] for i in range(0, len(waveform), CHUNK_SIZE)]
        full_transcript = []
        
        for idx, chunk in enumerate(chunks):
            # Move to device and process
            inputs = processor(chunk, sampling_rate=16000, return_tensors="pt")
            input_features = inputs["input_features"].to(device)
            
            forced_decoder_ids = processor.get_decoder_prompt_ids(language=language, task=task)
            
            # This is the blocking part
            with torch.no_grad():
                predicted_ids = model.generate(input_features, forced_decoder_ids=forced_decoder_ids)
            
            transcript = processor.batch_decode(predicted_ids, skip_special_tokens=True)[0]
            if transcript.strip():
                full_transcript.append(transcript.strip())
            
            progress = int((idx + 1) / len(chunks) * 100)
            yield progress, " ".join(full_transcript)

    except Exception as e:
        logger.error(f"Error in process_audio_file: {e}")
        raise e

async def load_audio_robust(file_path: str):
    """Robust audio loading with fallbacks"""
    try:
        waveform, sample_rate = torchaudio.load(file_path)
        return waveform, sample_rate
    except Exception as e:
        logger.warning(f"torchaudio failed: {e}. Trying librosa...")
        import librosa
        waveform, sample_rate = librosa.load(file_path, sr=None)
        return torch.tensor(waveform).unsqueeze(0), sample_rate
