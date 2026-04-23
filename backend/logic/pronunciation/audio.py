import os
import torch
import torchaudio
import subprocess
import tempfile
import logging

logger = logging.getLogger(__name__)

async def validate_and_fix_audio(audio_file_path: str) -> str:
    """Validate audio file and fix common issues"""
    logger.info(f"Validating audio file: {audio_file_path}")
    
    try:
        file_size = os.path.getsize(audio_file_path)
        if file_size == 0:
            raise Exception("Audio file is empty")
        
        file_ext = os.path.splitext(audio_file_path)[1].lower()
        
        if file_ext == '.wav':
            try:
                with open(audio_file_path, 'rb') as f:
                    header = f.read(12)
                    if len(header) < 12 or header[:4] != b'RIFF' or header[8:12] != b'WAVE':
                        logger.warning("WAV file invalid header, re-encoding...")
                        return convert_audio_to_wav(audio_file_path)
            except Exception as e:
                logger.warning(f"WAV validation failed: {e}, re-encoding...")
                return convert_audio_to_wav(audio_file_path)
        
        elif file_ext in ['.webm', '.mp4', '.m4a', '.ogg', '.flac']:
            return convert_audio_to_wav(audio_file_path)
        
        return audio_file_path
        
    except Exception as e:
        logger.error(f"Audio validation failed: {e}")
        return convert_audio_to_wav(audio_file_path)

def convert_audio_to_wav(input_path: str) -> str:
    """Convert audio file to WAV format using ffmpeg"""
    temp_wav = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
    temp_wav.close()
    
    try:
        cmd = [
            'ffmpeg', '-i', input_path,
            '-acodec', 'pcm_s16le', '-ac', '1', '-ar', '16000',
            '-f', 'wav', '-loglevel', 'error', '-y',
            temp_wav.name
        ]
        subprocess.run(cmd, check=True, capture_output=True, text=True)
        return temp_wav.name
    except Exception as e:
        if os.path.exists(temp_wav.name):
            os.unlink(temp_wav.name)
        raise Exception(f"Audio conversion failed: {e}")

async def load_audio_robust(file_path: str):
    """Robust audio loading with multiple fallbacks"""
    # Method 1: torchaudio
    try:
        waveform, sample_rate = torchaudio.load(file_path)
        if waveform.numel() > 0:
            return waveform, sample_rate
    except Exception:
        pass

    # Method 2: librosa
    try:
        import librosa
        waveform, sample_rate = librosa.load(file_path, sr=None)
        return torch.tensor(waveform).unsqueeze(0), sample_rate
    except Exception:
        pass

    # Method 3: pydub
    try:
        from pydub import AudioSegment
        import numpy as np
        audio = AudioSegment.from_file(file_path)
        audio = audio.set_channels(1)
        samples = np.array(audio.get_array_of_samples(), dtype=np.float32)
        samples = samples / (2**15 if audio.sample_width == 2 else 2**31)
        return torch.tensor(samples).unsqueeze(0), audio.frame_rate
    except Exception:
        pass
        
    raise Exception(f"Failed to load audio file {file_path} with all available methods.")
