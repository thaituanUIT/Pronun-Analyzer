# Croissant 🥐 - AI Pronunciation Analyzer

A robust, modular, and AI-powered speech analysis application. Croissant uses OpenAI's Whisper model to provide high-fidelity transcription and detailed pronunciation feedback, helping language learners improve their speaking skills with data-driven insights.

![GitHub last commit](https://img.shields.io/github/last-commit/thaituanUIT/Pronun-Analyzer)
![License](https://img.shields.io/badge/license-MIT-blue)
![Python](https://img.shields.io/badge/python-3.8%2B-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100.0%2B-green)

---

## 🚀 Key Features

- **🧠 Advanced Pronunciation Analysis**: Get detailed feedback on accuracy, fluency, and overall score compared to reference text.
- **🎙️ Seamless Recording**: Record high-quality audio directly from your browser.
- **📁 Multi-Format Support**: Upload files in MP3, WAV, M4A, FLAC, OGG, or WebM formats.
- **🌍 10+ Languages**: Support for English, German, Spanish, French, Italian, Portuguese, Russian, Japanese, Korean, and Chinese.
- **⚡ Optimized Backend**: 
    - **Single-Model Architecture**: Whisper model is shared across services to minimize VRAM usage.
    - **Modular Design**: Clean separation of concerns (Routers -> APIs -> Logic -> Services).
    - **Async Processing**: High-performance asynchronous job handling with real-time status updates.
- **🐳 Docker Ready**: Deploy anywhere with pre-configured containerization.

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
- **Docker** (Optional, for simplified deployment)

### 2. Manual Installation

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

#### Frontend
```bash
cd frontend
npm install
npm start
```

### 3. Docker Deployment (Recommended)

```bash
docker-compose up --build
```

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
- `ALLOWED_ORIGINS`: Comma-separated list for CORS management.

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
