import os
import torch
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

FORCE_CPU = os.getenv("FORCE_CPU", "false").lower() == "true"
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
MODEL_ID = "openai/whisper-small"
CACHE_DIR = os.getenv("CACHE_DIR", "/app/.cache")

if FORCE_CPU:
    DEVICE = torch.device("cpu")
    logger.info("Forcing CPU usage due to FORCE_CPU environment variable")
else:
    DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    if torch.cuda.is_available():
        logger.info(f"CUDA detected! Using GPU: {torch.cuda.get_device_name(0)}")
    else:
        logger.info("CUDA not available, using CPU")

# CORS Configuration
base_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001,https://qwv72vhd-3000.asse.devtunnels.ms").split(",")
ALLOWED_ORIGINS = base_origins.copy()

dev_tunnel_patterns = [
    "https://*.asse.devtunnels.ms",
    "https://*.devtunnels.ms",
]

if ENVIRONMENT == "production":
    ALLOWED_ORIGINS.extend([
        "https://your-frontend-domain.vercel.app",
        "https://your-custom-domain.com"
    ])
else:
    ALLOWED_ORIGINS.extend(dev_tunnel_patterns)
