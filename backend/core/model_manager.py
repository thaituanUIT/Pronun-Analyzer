import torch
from transformers import WhisperProcessor, WhisperForConditionalGeneration
from backend.config import MODEL_ID, CACHE_DIR, DEVICE, logger

class ModelManager:
    _instance = None
    
    def __init__(self):
        self.processor = None
        self.model = None
        
    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def load_models(self):
        if self.processor is not None and self.model is not None:
            return
            
        try:
            logger.info(f"Loading Whisper processor ({MODEL_ID})...")
            self.processor = WhisperProcessor.from_pretrained(
                MODEL_ID,
                cache_dir=CACHE_DIR,
                local_files_only=False
            )
            
            logger.info(f"Loading Whisper model ({MODEL_ID}) on {DEVICE}...")
            self.model = WhisperForConditionalGeneration.from_pretrained(
                MODEL_ID,
                cache_dir=CACHE_DIR,
                local_files_only=False
            ).to(DEVICE)
            
            logger.info("Models loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load models: {e}")
            raise e

model_manager = ModelManager.get_instance()
