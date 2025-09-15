from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
import torch
import torchaudio
from transformers import WhisperProcessor, WhisperForConditionalGeneration
import os
import tempfile
import subprocess
import uuid
from typing import Dict, Optional, Generator, Tuple
import asyncio
from pydantic import BaseModel
import logging
from pronunciation_analyzer import PronunciationAnalyzer, PronunciationAnalysis

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Speech-to-Text API", description="Whisper-based speech transcription service")

# Get allowed origins from environment variable or use default
base_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001,https://qwv72vhd-3000.asse.devtunnels.ms").split(",")
ALLOWED_ORIGINS = base_origins.copy()

# Add common dev tunnel patterns
dev_tunnel_patterns = [
    "https://*.asse.devtunnels.ms",
    "https://*.devtunnels.ms",
    "https://qwv72vhd-3000.asse.devtunnels.ms"  # Your specific tunnel
]

if os.getenv("ENVIRONMENT") == "production":
    # Add your production frontend URLs here
    ALLOWED_ORIGINS.extend([
        "https://your-frontend-domain.vercel.app",
        "https://your-custom-domain.com"
    ])
else:
    # In development, be more permissive with dev tunnels
    ALLOWED_ORIGINS.extend(dev_tunnel_patterns)

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if os.getenv("ENVIRONMENT") != "production" else ALLOWED_ORIGINS,  # Allow all in dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for model
force_cpu = os.getenv("FORCE_CPU", "false").lower() == "true"
if force_cpu:
    device = torch.device("cpu")
    logger.info("Forcing CPU usage due to FORCE_CPU environment variable")
else:
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    if torch.cuda.is_available():
        logger.info(f"CUDA detected! Using GPU: {torch.cuda.get_device_name(0)}")
        logger.info(f"CUDA version: {torch.version.cuda}")
        logger.info(f"GPU memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")
    else:
        logger.info("CUDA not available, using CPU")

model_id = "openai/whisper-small"
processor = None
model = None
pronunciation_analyzer = None

# Storage for transcription jobs
transcription_jobs: Dict[str, Dict] = {}
pronunciation_jobs: Dict[str, Dict] = {}

class TranscriptionRequest(BaseModel):
    language: Optional[str] = "de"
    task: Optional[str] = "transcribe"

class PronunciationRequest(BaseModel):
    language: Optional[str] = "en"
    reference_text: str

class TranscriptionStatus(BaseModel):
    job_id: str
    status: str
    progress: Optional[int] = None
    transcript: Optional[str] = None
    error: Optional[str] = None

class PronunciationStatus(BaseModel):
    job_id: str
    status: str
    progress: Optional[int] = None
    analysis: Optional[Dict] = None
    error: Optional[str] = None

@app.on_event("startup")
async def load_model():
    """Load the Whisper model on startup"""
    global processor, model, pronunciation_analyzer
    try:
        logger.info("Starting model loading process...")
        
        # Set offline mode if needed for Docker environments
        import os
        os.environ['TRANSFORMERS_OFFLINE'] = '0'  # Ensure we can download
        
        logger.info("Loading Whisper processor...")
        processor = WhisperProcessor.from_pretrained(
            model_id,
            cache_dir="/app/.cache",
            local_files_only=False
        )
        
        logger.info("Loading Whisper model...")
        model = WhisperForConditionalGeneration.from_pretrained(
            model_id,
            cache_dir="/app/.cache",
            local_files_only=False
        ).to(device)
        
        logger.info(f"Model loaded successfully on device: {device}")
        
        # Initialize pronunciation analyzer
        logger.info("Initializing pronunciation analyzer...")
        pronunciation_analyzer = PronunciationAnalyzer(model_id)
        pronunciation_analyzer.load_model()
        logger.info("Pronunciation analyzer loaded successfully")
        
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        logger.error(f"Error type: {type(e).__name__}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        # Don't raise the exception to prevent the app from crashing
        # Instead, we'll handle this gracefully in the endpoints

def process_audio_file(file_path: str, language: str = "de", task: str = "transcribe") -> Generator[Tuple[int, str], None, None]:
    """Process audio file and return transcript"""
    try:
        logger.info(f"Processing audio file: {file_path}")
        
        # Check if file exists
        if not os.path.exists(file_path):
            raise Exception(f"Audio file not found: {file_path}")
        
        # Get file size for logging
        file_size = os.path.getsize(file_path)
        logger.info(f"Audio file size: {file_size} bytes")
        
        # Load audio with error handling
        try:
            waveform, sample_rate = torchaudio.load(file_path)
            logger.info(f"Audio loaded successfully. Sample rate: {sample_rate}, Shape: {waveform.shape}")
        except Exception as e:
            logger.error(f"torchaudio failed to load audio file {file_path}: {e}")
            # Try alternative loading methods for WebM and other formats
            try:
                import librosa
                waveform, sample_rate = librosa.load(file_path, sr=None)
                waveform = torch.tensor(waveform).unsqueeze(0)
                logger.info(f"Audio loaded with librosa. Sample rate: {sample_rate}, Shape: {waveform.shape}")
            except ImportError:
                logger.error("librosa not available")
                # Try pydub for WebM support
                try:
                    from pydub import AudioSegment
                    import numpy as np
                    
                    # Get file extension
                    file_ext = os.path.splitext(file_path)[1].lower()
                    
                    # Load audio with pydub
                    if file_ext == '.webm':
                        audio = AudioSegment.from_file(file_path, format="webm")
                    elif file_ext == '.mp4' or file_ext == '.m4a':
                        audio = AudioSegment.from_file(file_path, format="mp4")
                    else:
                        audio = AudioSegment.from_file(file_path)
                    
                    # Convert to mono
                    audio = audio.set_channels(1)
                    sample_rate = audio.frame_rate
                    
                    # Convert to numpy array and then to torch tensor
                    samples = np.array(audio.get_array_of_samples(), dtype=np.float32)
                    if audio.sample_width == 2:  # 16-bit
                        samples = samples / 32768.0
                    elif audio.sample_width == 4:  # 32-bit
                        samples = samples / 2147483648.0
                    
                    waveform = torch.tensor(samples).unsqueeze(0)
                    logger.info(f"Audio loaded with pydub. Sample rate: {sample_rate}, Shape: {waveform.shape}")
                    
                except ImportError:
                    raise Exception(f"Failed to load audio file. torchaudio failed: {e}. Neither librosa nor pydub available as fallback. Please install: pip install librosa pydub")
                except Exception as e2:
                    raise Exception(f"Failed to load audio file with all methods. torchaudio: {e}, pydub: {e2}")
            except Exception as e2:
                raise Exception(f"Failed to load audio file with both torchaudio ({e}) and librosa ({e2})")
        
        # Validate audio data
        if waveform.numel() == 0:
            raise Exception("Audio file appears to be empty or corrupted")
        
        # Resample to 16kHz if needed
        if sample_rate != 16000:
            logger.info(f"Resampling from {sample_rate}Hz to 16000Hz")
            resampler = torchaudio.transforms.Resample(orig_freq=sample_rate, new_freq=16000)
            waveform = resampler(waveform)
        
        # Convert to mono if stereo
        if waveform.shape[0] > 1:
            logger.info("Converting stereo to mono")
            waveform = torch.mean(waveform, dim=0, keepdim=True)
        
        waveform = waveform.squeeze()
        
        # Check audio duration
        duration = len(waveform) / 16000
        logger.info(f"Audio duration: {duration:.2f} seconds")
        
        if duration < 0.1:
            raise Exception("Audio file is too short (less than 0.1 seconds)")
        
        # Chunk processing
        CHUNK_LENGTH = 30
        SAMPLE_RATE = 16000
        CHUNK_SIZE = CHUNK_LENGTH * SAMPLE_RATE
        
        chunks = [waveform[i:i+CHUNK_SIZE] for i in range(0, len(waveform), CHUNK_SIZE)]
        full_transcript = []
        
        logger.info(f"Processing {len(chunks)} chunks")
        
        for idx, chunk in enumerate(chunks):
            try:
                # Process chunk
                inputs = processor(chunk, sampling_rate=16000, return_tensors="pt")
                input_ids = inputs["input_features"].to(device)
                
                forced_decoder_ids = processor.get_decoder_prompt_ids(language=language, task=task)
                
                with torch.no_grad():
                    predicted_ids = model.generate(input_ids, forced_decoder_ids=forced_decoder_ids)
                
                transcript = processor.batch_decode(predicted_ids, skip_special_tokens=True)[0]
                
                if transcript.strip():  # Only add non-empty transcripts
                    full_transcript.append(transcript.strip())
                
                progress = int((idx + 1) / len(chunks) * 100)
                current_transcript = " ".join(full_transcript) if full_transcript else ""
                
                logger.info(f"Chunk {idx + 1}/{len(chunks)} processed. Progress: {progress}%")
                yield progress, current_transcript
                
            except Exception as e:
                logger.error(f"Error processing chunk {idx + 1}: {e}")
                # Continue with next chunk instead of failing completely
                continue
        
        final_transcript = " ".join(full_transcript) if full_transcript else "[No speech detected]"
        logger.info(f"Final transcript: {final_transcript}")
        return 100, final_transcript
        
    except Exception as e:
        logger.error(f"Error processing audio: {e}")
        raise e

async def transcribe_audio_background(job_id: str, file_path: str, language: str, task: str):
    """Background task for audio transcription"""
    converted_path = None
    try:
        transcription_jobs[job_id]["status"] = "processing"
        
        # Try to convert file if it's not a standard format
        try:
            for progress, partial_transcript in process_audio_file(file_path, language, task):
                transcription_jobs[job_id]["progress"] = progress
                transcription_jobs[job_id]["transcript"] = partial_transcript
                await asyncio.sleep(0.1)  # Allow other tasks to run
        except Exception as audio_error:
            logger.warning(f"Direct audio processing failed: {audio_error}. Trying conversion...")
            # Try converting to WAV first
            converted_path = convert_audio_to_wav(file_path)
            
            for progress, partial_transcript in process_audio_file(converted_path, language, task):
                transcription_jobs[job_id]["progress"] = progress
                transcription_jobs[job_id]["transcript"] = partial_transcript
                await asyncio.sleep(0.1)  # Allow other tasks to run
        
        transcription_jobs[job_id]["status"] = "completed"
        
    except Exception as e:
        transcription_jobs[job_id]["status"] = "failed"
        transcription_jobs[job_id]["error"] = str(e)
        logger.error(f"Transcription failed for job {job_id}: {e}")
    finally:
        # Clean up uploaded file
        if os.path.exists(file_path):
            os.remove(file_path)
        # Clean up converted file if it exists
        if converted_path and os.path.exists(converted_path):
            os.remove(converted_path)

async def analyze_pronunciation_background(job_id: str, file_path: str, reference_text: str, language: str):
    """Background task for pronunciation analysis"""
    converted_path = None
    try:
        pronunciation_jobs[job_id]["status"] = "processing"
        pronunciation_jobs[job_id]["progress"] = 50
        
        # Try pronunciation analysis
        try:
            analysis = pronunciation_analyzer.analyze_pronunciation(file_path, reference_text, language)
        except Exception as audio_error:
            logger.warning(f"Direct pronunciation analysis failed: {audio_error}. Trying conversion...")
            # Try converting to WAV first
            converted_path = convert_audio_to_wav(file_path)
            analysis = pronunciation_analyzer.analyze_pronunciation(converted_path, reference_text, language)
        
        # Convert to dictionary for JSON serialization
        analysis_dict = {
            "overall_score": analysis.overall_score,
            "accuracy_score": analysis.accuracy_score,
            "fluency_score": analysis.fluency_score,
            "transcript": analysis.transcript,
            "phonetic_transcript": analysis.phonetic_transcript,
            "words_analyzed": analysis.words_analyzed,
            "total_errors": analysis.total_errors,
            "pronunciation_errors": [
                {
                    "word": error.word,
                    "expected_pronunciation": error.expected_pronunciation,
                    "actual_pronunciation": error.actual_pronunciation,
                    "confidence": error.confidence,
                    "error_type": error.error_type,
                    "position": error.position,
                    "suggestion": error.suggestion
                }
                for error in analysis.pronunciation_errors
            ]
        }
        
        pronunciation_jobs[job_id]["analysis"] = analysis_dict
        pronunciation_jobs[job_id]["progress"] = 100
        pronunciation_jobs[job_id]["status"] = "completed"
        
    except Exception as e:
        pronunciation_jobs[job_id]["status"] = "failed"
        pronunciation_jobs[job_id]["error"] = str(e)
        logger.error(f"Pronunciation analysis failed for job {job_id}: {e}")
    finally:
        # Clean up uploaded file
        if os.path.exists(file_path):
            os.remove(file_path)
        # Clean up converted file if it exists
        if converted_path and os.path.exists(converted_path):
            os.remove(converted_path)

@app.post("/transcribe", response_model=dict)
async def upload_and_transcribe(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    language: str = "de",
    task: str = "transcribe"
):
    """Upload audio file and start transcription"""
    
    # Log file details for debugging
    logger.info(f"Received file: {file.filename}, content_type: {file.content_type}, size: {file.size}")
    
    # Validate file type - check both extension and content type
    allowed_extensions = ['.mp3', '.wav', '.m4a', '.flac', '.ogg', '.webm']
    allowed_content_types = [
        'audio/mpeg', 'audio/mp3',  # MP3
        'audio/wav', 'audio/wave', 'audio/x-wav',  # WAV
        'audio/mp4', 'audio/m4a', 'audio/x-m4a',  # M4A
        'audio/flac', 'audio/x-flac',  # FLAC
        'audio/ogg', 'audio/vorbis',  # OGG
        'audio/webm',  # WebM
        'application/octet-stream'  # Sometimes browsers send this for audio files
    ]
    
    # Get file extension
    file_extension = ""
    if file.filename:
        file_extension = os.path.splitext(file.filename)[1].lower()
        logger.info(f"Detected file extension: {file_extension}")
    
    # Check if extension is allowed (if we have a filename)
    extension_valid = not file.filename or file_extension in allowed_extensions
    
    # Check content type (be more lenient)
    content_type_valid = (
        not file.content_type or 
        file.content_type in allowed_content_types or
        file.content_type.startswith('audio/') or
        file.content_type == 'application/octet-stream'
    )
    
    if not extension_valid:
        logger.error(f"Invalid file extension: {file_extension}. Allowed: {allowed_extensions}")
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file extension '{file_extension}'. Allowed: {', '.join(allowed_extensions)}"
        )
    
    if not content_type_valid:
        logger.error(f"Invalid content type: {file.content_type}. Allowed: {allowed_content_types}")
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{file.content_type}'. Please upload an audio file."
        )
    
    # If no extension detected, try to determine from content type
    if not file_extension and file.content_type:
        if 'wav' in file.content_type.lower():
            file_extension = '.wav'
        elif 'mp3' in file.content_type.lower() or 'mpeg' in file.content_type.lower():
            file_extension = '.mp3'
        elif 'm4a' in file.content_type.lower() or 'mp4' in file.content_type.lower():
            file_extension = '.m4a'
        elif 'flac' in file.content_type.lower():
            file_extension = '.flac'
        elif 'ogg' in file.content_type.lower() or 'vorbis' in file.content_type.lower():
            file_extension = '.ogg'
        elif 'webm' in file.content_type.lower():
            file_extension = '.webm'
        else:
            file_extension = '.wav'  # Default fallback
        
        logger.info(f"Determined file extension from content type: {file_extension}")
    
    # Create unique job ID
    job_id = str(uuid.uuid4())
    
    # Save uploaded file
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, f"{job_id}{file_extension}")
    
    try:
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        logger.info(f"File saved successfully: {file_path}, size: {len(content)} bytes")
    except Exception as e:
        logger.error(f"Failed to save file: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")
    
    # Initialize job status
    transcription_jobs[job_id] = {
        "status": "queued",
        "progress": 0,
        "transcript": None,
        "error": None,
        "filename": file.filename or f"audio{file_extension}"
    }
    
    # Start background transcription
    background_tasks.add_task(transcribe_audio_background, job_id, file_path, language, task)
    
    return {"job_id": job_id, "message": "Transcription started"}

@app.get("/status/{job_id}", response_model=TranscriptionStatus)
async def get_transcription_status(job_id: str):
    """Get transcription job status"""
    if job_id not in transcription_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = transcription_jobs[job_id]
    return TranscriptionStatus(
        job_id=job_id,
        status=job["status"],
        progress=job["progress"],
        transcript=job["transcript"],
        error=job["error"]
    )

@app.post("/analyze-pronunciation", response_model=dict)
async def upload_and_analyze_pronunciation(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    reference_text: str = Form(...),
    language: str = Form("en")
):
    """Upload audio file and analyze pronunciation against reference text"""
    
    # Check if models are loaded
    if pronunciation_analyzer is None:
        logger.error("Pronunciation analyzer not loaded")
        raise HTTPException(
            status_code=503, 
            detail="Pronunciation analyzer is not available. Please wait for the model to load."
        )
    
    # Log file details for debugging
    logger.info(f"Received file for pronunciation: {file.filename}, content_type: {file.content_type}, size: {file.size}")
    
    # Validate file type - check both extension and content type
    allowed_extensions = ['.mp3', '.wav', '.m4a', '.flac', '.ogg', '.webm']
    allowed_content_types = [
        'audio/mpeg', 'audio/mp3',  # MP3
        'audio/wav', 'audio/wave', 'audio/x-wav',  # WAV
        'audio/mp4', 'audio/m4a', 'audio/x-m4a',  # M4A
        'audio/flac', 'audio/x-flac',  # FLAC
        'audio/ogg', 'audio/vorbis',  # OGG
        'audio/webm',  # WebM
        'application/octet-stream'  # Sometimes browsers send this for audio files
    ]
    
    # Get file extension
    file_extension = ""
    if file.filename:
        file_extension = os.path.splitext(file.filename)[1].lower()
        logger.info(f"Detected file extension: {file_extension}")
    
    # Check if extension is allowed (if we have a filename)
    extension_valid = not file.filename or file_extension in allowed_extensions
    
    # Check content type (be more lenient)
    content_type_valid = (
        not file.content_type or 
        file.content_type in allowed_content_types or
        file.content_type.startswith('audio/') or
        file.content_type == 'application/octet-stream'
    )
    
    if not extension_valid:
        logger.error(f"Invalid file extension: {file_extension}. Allowed: {allowed_extensions}")
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file extension '{file_extension}'. Allowed: {', '.join(allowed_extensions)}"
        )
    
    if not content_type_valid:
        logger.error(f"Invalid content type: {file.content_type}. Allowed: {allowed_content_types}")
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{file.content_type}'. Please upload an audio file."
        )
    
    # If no extension detected, try to determine from content type
    if not file_extension and file.content_type:
        if 'wav' in file.content_type.lower():
            file_extension = '.wav'
        elif 'mp3' in file.content_type.lower() or 'mpeg' in file.content_type.lower():
            file_extension = '.mp3'
        elif 'm4a' in file.content_type.lower() or 'mp4' in file.content_type.lower():
            file_extension = '.m4a'
        elif 'flac' in file.content_type.lower():
            file_extension = '.flac'
        elif 'ogg' in file.content_type.lower() or 'vorbis' in file.content_type.lower():
            file_extension = '.ogg'
        elif 'webm' in file.content_type.lower():
            file_extension = '.webm'
        else:
            file_extension = '.wav'  # Default fallback
        
        logger.info(f"Determined file extension from content type: {file_extension}")
    
    # Validate reference text
    if not reference_text.strip():
        raise HTTPException(status_code=400, detail="Reference text cannot be empty")
    
    # Create unique job ID
    job_id = str(uuid.uuid4())
    
    # Save uploaded file
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, f"{job_id}{file_extension}")
    
    try:
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        logger.info(f"Pronunciation file saved successfully: {file_path}, size: {len(content)} bytes")
    except Exception as e:
        logger.error(f"Failed to save pronunciation file: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")
    
    # Initialize job status
    pronunciation_jobs[job_id] = {
        "status": "queued",
        "progress": 0,
        "analysis": None,
        "error": None,
        "filename": file.filename or f"audio{file_extension}",
        "reference_text": reference_text
    }
    
    # Start background analysis
    background_tasks.add_task(analyze_pronunciation_background, job_id, file_path, reference_text, language)
    
    return {"job_id": job_id, "message": "Pronunciation analysis started"}

@app.get("/pronunciation-status/{job_id}", response_model=PronunciationStatus)
async def get_pronunciation_status(job_id: str):
    """Get pronunciation analysis job status"""
    if job_id not in pronunciation_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = pronunciation_jobs[job_id]
    return PronunciationStatus(
        job_id=job_id,
        status=job["status"],
        progress=job["progress"],
        analysis=job["analysis"],
        error=job["error"]
    )

@app.delete("/job/{job_id}")
async def delete_job(job_id: str):
    """Delete a transcription job"""
    deleted = False
    if job_id in transcription_jobs:
        del transcription_jobs[job_id]
        deleted = True
    if job_id in pronunciation_jobs:
        del pronunciation_jobs[job_id]
        deleted = True
    
    if deleted:
        return {"message": "Job deleted successfully"}
    else:
        raise HTTPException(status_code=404, detail="Job not found")

@app.post("/synthesize-speech")
async def synthesize_speech(
    text: str = Form(...),
    language: str = Form("en")
):
    """Generate audio for correct pronunciation of a word or phrase using optimized TTS"""
    try:
        # Validate input
        if not text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        # Clean and optimize text for TTS
        clean_text = text.strip()
        
        # For single words, make it shorter and clearer
        if len(clean_text.split()) == 1:
            # Add slight pause for clarity in single words
            clean_text = f"{clean_text}."
        
        # Create temporary audio file
        temp_audio = tempfile.NamedTemporaryFile(suffix='.mp3', delete=False)
        temp_audio.close()
        
        # Map language codes to gTTS supported languages
        language_map = {
            'en': 'en',     # English
            'de': 'de',     # German
            'es': 'es',     # Spanish
            'fr': 'fr',     # French
            'it': 'it',     # Italian
            'pt': 'pt',     # Portuguese
            'ru': 'ru',     # Russian
            'ja': 'ja',     # Japanese
            'ko': 'ko',     # Korean
            'zh': 'zh',     # Chinese
            'nl': 'nl',     # Dutch
            'ar': 'ar',     # Arabic
            'hi': 'hi',     # Hindi
            'th': 'th',     # Thai
            'vi': 'vi',     # Vietnamese
        }
        
        # Get the gTTS language code, default to English if not supported
        gtts_lang = language_map.get(language, 'en')
        
        logger.info(f"Generating speech for text: '{clean_text}' in language: {gtts_lang}")
        
        try:
            from gtts import gTTS
            import asyncio
            import functools
            
            # Create TTS instance with optimized settings
            def create_tts_audio():
                # Use slow=False for faster, more natural speech
                # Set lang_check=False to skip language validation (faster)
                tts = gTTS(
                    text=clean_text, 
                    lang=gtts_lang, 
                    slow=False,
                    lang_check=False  # Skip validation for speed
                )
                tts.save(temp_audio.name)
                return temp_audio.name
            
            # Run TTS in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            audio_file = await loop.run_in_executor(None, create_tts_audio)
            
            # Verify the audio file was created
            if not os.path.exists(audio_file) or os.path.getsize(audio_file) == 0:
                os.unlink(audio_file)
                raise HTTPException(status_code=500, detail="Generated audio file is empty")
            
            logger.info(f"Speech generated successfully: {audio_file}")
            
            # For single words, return MP3 directly (faster than conversion)
            if len(clean_text.split()) <= 2:
                return FileResponse(
                    audio_file, 
                    media_type="audio/mpeg",
                    filename=f"pronunciation_{clean_text.replace(' ', '_').replace('.', '')}.mp3",
                    background=BackgroundTasks().add_task(cleanup_temp_file, audio_file)
                )
            
            # For longer text, convert to WAV for better compatibility
            wav_temp = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
            wav_temp.close()
            
            try:
                # Use pydub to convert MP3 to WAV (async)
                def convert_to_wav():
                    from pydub import AudioSegment
                    audio = AudioSegment.from_mp3(audio_file)
                    # Optimize audio settings for faster processing
                    audio = audio.set_frame_rate(22050)  # Lower sample rate for faster processing
                    audio = audio.set_channels(1)  # Mono
                    audio.export(wav_temp.name, format="wav")
                    return wav_temp.name
                
                wav_file = await loop.run_in_executor(None, convert_to_wav)
                
                # Clean up the MP3 file
                os.unlink(audio_file)
                
                # Return the WAV file
                return FileResponse(
                    wav_file, 
                    media_type="audio/wav",
                    filename=f"pronunciation_{clean_text.replace(' ', '_').replace('.', '')}.wav",
                    background=BackgroundTasks().add_task(cleanup_temp_file, wav_file)
                )
                
            except Exception as convert_error:
                logger.warning(f"Failed to convert to WAV: {convert_error}. Returning MP3.")
                # If conversion fails, return the MP3 file
                return FileResponse(
                    audio_file, 
                    media_type="audio/mpeg",
                    filename=f"pronunciation_{clean_text.replace(' ', '_').replace('.', '')}.mp3",
                    background=BackgroundTasks().add_task(cleanup_temp_file, audio_file)
                )
            
        except ImportError:
            logger.error("gTTS not installed. Please install: pip install gtts")
            os.unlink(temp_audio.name)
            raise HTTPException(
                status_code=503, 
                detail="Text-to-speech service unavailable. Please install gTTS: pip install gtts"
            )
        except Exception as tts_error:
            logger.error(f"gTTS failed: {tts_error}")
            if os.path.exists(temp_audio.name):
                os.unlink(temp_audio.name)
            
            # Check if it's a network error
            if "No connection" in str(tts_error) or "Network" in str(tts_error) or "timeout" in str(tts_error).lower():
                raise HTTPException(
                    status_code=503, 
                    detail="Text-to-speech service temporarily unavailable. Please check internet connection."
                )
            else:
                raise HTTPException(status_code=500, detail=f"Failed to generate speech: {str(tts_error)}")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating speech: {e}")
        raise HTTPException(status_code=500, detail=f"Speech synthesis failed: {str(e)}")

def cleanup_temp_file(file_path: str):
    """Clean up temporary files"""
    try:
        if os.path.exists(file_path):
            os.unlink(file_path)
            logger.info(f"Cleaned up temporary file: {file_path}")
    except Exception as e:
        logger.warning(f"Failed to clean up temporary file {file_path}: {e}")

@app.get("/health")
async def health_check():
    """Health check endpoint for deployment monitoring"""
    model_status = {
        "transcription_model": processor is not None and model is not None,
        "pronunciation_analyzer": pronunciation_analyzer is not None
    }
    
    overall_status = "healthy" if all(model_status.values()) else "partial"
    if not any(model_status.values()):
        overall_status = "unhealthy"
    
    return {
        "status": overall_status, 
        "message": "Speech-to-Text API is running",
        "models": model_status
    }

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Speech-to-Text API",
        "version": "1.0.0",
        "endpoints": {
            "transcribe": "/transcribe",
            "status": "/status/{job_id}",
            "pronunciation": "/analyze-pronunciation",
            "pronunciation_status": "/pronunciation-status/{job_id}",
            "synthesize_speech": "/synthesize-speech",
            "health": "/health"
        }
    }

# Mobile debugging endpoint
@app.get("/mobile-test")
async def mobile_test():
    """Simple endpoint to test mobile device connectivity"""
    return {
        "status": "success",
        "message": "Mobile device can access the API!",
        "timestamp": str(asyncio.get_event_loop().time()),
        "cors_enabled": True,
        "mobile_friendly": True
    }

@app.get("/connection-info")
async def connection_info():
    """Endpoint to provide connection debugging information"""
    return {
        "backend_url": "https://qwv72vhd-8000.asse.devtunnels.ms/",
        "frontend_url": "https://qwv72vhd-3000.asse.devtunnels.ms/",
        "cors_origins": ALLOWED_ORIGINS,
        "environment": os.getenv("ENVIRONMENT", "development"),
        "instructions": {
            "mobile_users": "Use the frontend_url above to access the web application",
            "api_test": "Visit /mobile-test to verify API connectivity"
        }
    }

def convert_audio_to_wav(input_path: str) -> str:
    """Convert audio file to WAV format using ffmpeg if needed"""
    # Check if file is already WAV
    if input_path.lower().endswith('.wav'):
        return input_path
    
    # Create temporary WAV file
    temp_wav = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
    temp_wav.close()
    
    try:
        # Use ffmpeg to convert to WAV
        cmd = [
            'ffmpeg', '-i', input_path,
            '-acodec', 'pcm_s16le',  # 16-bit PCM
            '-ac', '1',  # Mono
            '-ar', '16000',  # 16kHz sample rate
            '-y',  # Overwrite output file
            temp_wav.name
        ]
        
        subprocess.run(cmd, check=True, capture_output=True)
        logger.info(f"Converted {input_path} to WAV: {temp_wav.name}")
        return temp_wav.name
        
    except subprocess.CalledProcessError as e:
        logger.error(f"ffmpeg conversion failed: {e}")
        os.unlink(temp_wav.name)  # Clean up temp file
        raise Exception(f"Failed to convert audio file to WAV format: {e}")
    except FileNotFoundError:
        logger.error("ffmpeg not found")
        os.unlink(temp_wav.name)  # Clean up temp file
        raise Exception("ffmpeg not found. Please install ffmpeg for audio format conversion.")
