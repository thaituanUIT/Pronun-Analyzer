# Croissant 🥐 - AI Pronunciation Analyzer

A robust, modular, and AI-powered speech analysis application. Croissant uses OpenAI's Whisper model to provide high-fidelity transcription and detailed pronunciation feedback, helping language learners improve their speaking skills with data-driven insights.

![GitHub last commit](https://img.shields.io/github/last-commit/thaituanUIT/Pronun-Analyzer)
![License](https://img.shields.io/badge/license-MIT-blue)
![Python](https://img.shields.io/badge/python-3.8%2B-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100.0%2B-green)

---

## 🚀 Key Features

- **🧠 Pronunciation Analysis**: Get accuracy, fluency, acoustic signal metrics, and overall score compared to reference text.
- **🎙️ Seamless Recording**: Record high-quality audio directly from your browser.
- **📁 Multi-Format Support**: Upload files in MP3, WAV, M4A, FLAC, OGG, or WebM formats.
- **🌍 10+ Languages**: Support for English, German, Spanish, French, Italian, Portuguese, Russian, Japanese, Korean, and Chinese.
- **💾 Persistent Job State**: Background job status survives backend restarts through SQLite-backed storage.
- **⚡ Optimized Backend**: 
    - **Single-Model Architecture**: Whisper model is shared across services to minimize VRAM usage.
    - **Modular Design**: Clean separation of concerns (Routers -> APIs -> Logic -> Services).
    - **Async Processing**: High-performance asynchronous job handling with real-time status updates.
- **🐳 Docker Compose Support**: Run the frontend and backend together with persistent volumes.

---

## 🏗️ Architecture Overview

The backend has been refactored for professional-grade maintainability and performance:

```text
backend/
├── core/             # Central model management (Singleton ModelManager)
├── logic/            # Business logic (audio, alignment, metrics, transcription)
├── services/         # Background tasks and external integrations
├── apis/             # API handlers (business process orchestration)
├── routers/          # FastAPI endpoint definitions
├── models.py         # Central Pydantic schemas (Data Transfer Objects)
├── config.py         # Environment-based configuration
├── state.py          # Centralized in-memory job state
└── app.py            # Clean, modular application entry point
```

---

## 🛠️ Getting Started

### 1. Prerequisites

- **Python 3.8+**
- **FFmpeg** (Required for audio processing)
- **Node.js 16+** (For frontend)
- **Docker** (Optional, for Compose deployment)

### 2. Manual Installation

#### Backend
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload
```

#### Frontend
```bash
cd frontend
npm install
npm start
```

### 3. Docker Deployment

```bash
docker compose up --build
```

The frontend runs at [http://localhost:3000](http://localhost:3000), and the
backend API runs at [http://localhost:8000](http://localhost:8000). Compose keeps
model cache, uploads, and SQLite job state in named volumes.

---

## 🔌 API Documentation

Once the backend is running, access the interactive documentation at:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

### Primary Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/transcribe` | Upload audio for text transcription. |
| `POST` | `/analyze-pronunciation` | Upload audio + reference text for analysis. |
| `GET`  | `/status/{job_id}` | Retrieve real-time progress/results. |
| `GET`  | `/health` | API system health check. |

---

## ⚙️ Configuration

Copy `.env.development` or `.env.production` to `.env` in the `backend` folder to customize your environment:

- `ENVIRONMENT`: `development` or `production`
- `FORCE_CPU`: Set to `true` to disable GPU acceleration (VRAM limited).
- `CORS_ORIGINS`: Comma-separated list for CORS management.
- `JOB_STATE_DB`: SQLite path for persistent job status storage.
- `STT_PROVIDER`: Use `local` for bundled Whisper or `freeai` for Free.ai hosted STT.
- `PUBLIC_BASE_URL`: Public backend URL required by Free.ai so it can fetch uploaded audio.
- `FREE_AI_API_KEY`: Free.ai API key. Required when `STT_PROVIDER=freeai`.
- `FREE_AI_STT_MODEL`: Free.ai STT model name. Defaults to `whisper`.

Free.ai STT uses `POST /v1/stt/transcribe/` with an audio URL, so local
development requires `STT_PROVIDER=local` unless your backend is exposed through
a public tunnel.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
