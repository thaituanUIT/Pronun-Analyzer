# Sp## Features

- **Microphone Recording**: Record audio directly from your microphone in the browser
- **File Upload**: Support for uploaded audio files via drag & drop or file picker
- **AI Pronunciation Analysis**: Advanced pronunciation checking with detailed feedback
- **Scoring System**: Overall, accuracy, and fluency scores with visual feedback
- **Error Detection**: Identifies substitution, deletion, insertion, and stress errors
- **Smart Suggestions**: Personalized tips for pronunciation improvement
- **Multi-language Support**: German, English, Spanish, French, Italian, Portuguese, Russian, Japanese, Korean, Chinese
- **Multiple Audio Formats**: MP3, WAV, M4A, FLAC, OGG, WebM (including browser recordings)
- **Real-time Progress Tracking**: Live updates during transcription and analysis
- **Modern UI**: Beautiful, responsive React interface with recording controls
- **Chunked Processing**: Handles long audio files efficiently
- **Download & Copy**: Easy transcript export options
- **Docker Ready**: Complete containerization for deploymentt Application

A complete speech-to-text solution using OpenAI Whisper for the backend and React for the frontend, designed for easy deployment.

## Features

- **Microphone Recording**: Record audio directly from your microphone in the browser
- **File Upload**: Support for uploaded audio files via drag & drop or file picker
- **Multi-language Support**: German, English, Spanish, French, Italian, Portuguese, Russian, Japanese, Korean, Chinese
- **Multiple Audio Formats**: MP3, WAV, M4A, FLAC, OGG, WebM (including browser recordings)
- **Real-time Progress Tracking**: Live updates during transcription
- **Modern UI**: Beautiful, responsive React interface with recording controls
- **Chunked Processing**: Handles long audio files efficiently
- **Download & Copy**: Easy transcript export options
- **Docker Ready**: Complete containerization for deployment

## Project Structure

```
Croissant/
├── backend/                 # FastAPI backend
│   ├── app.py              # Main API application
│   ├── requirements.txt    # Python dependencies
│   ├── Dockerfile         # Backend container config
│   └── uploads/           # Temporary file storage
├── frontend/               # React frontend
│   ├── src/
│   │   ├── App.js         # Main React component
│   │   ├── index.js       # React entry point
│   │   └── index.css      # Styling
│   ├── public/
│   │   └── index.html     # HTML template
│   ├── package.json       # Node.js dependencies
│   ├── Dockerfile         # Frontend container config
│   └── nginx.conf         # Nginx configuration
├── audio/                  # Sample audio files
├── audio_proc/            # Original processing script
└── docker-compose.yml     # Multi-container orchestration
```

## Quick Start

### Option 1: Docker Deployment (Recommended)

1. **Prerequisites**
   ```bash
   # Install Docker and Docker Compose
   # Windows: Docker Desktop
   # Linux: docker.io docker-compose
   ```

2. **Clone and Deploy**
   ```bash
   cd C:\Users\USER\Documents\MachineLearning\Chocolatemint\Croissant
   docker-compose up --build
   ```

3. **Access Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### Option 2: Manual Setup

#### Backend Setup

1. **Install Python Dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Start Backend Server**
   ```bash
   uvicorn app:app --host 0.0.0.0 --port 8000 --reload
   ```

#### Frontend Setup

1. **Install Node.js Dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Start React Development Server**
   ```bash
   npm start
   ```

## Workflow

### 1. Development Phase

1. **Backend Development**
   - FastAPI application with Whisper integration
   - Asynchronous file processing
   - Progress tracking with job queues
   - CORS enabled for React communication

2. **Frontend Development**
   - React application with Material-UI components
   - Drag-and-drop file upload
   - Real-time progress monitoring
   - Responsive design for all devices

### 2. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/transcribe` | Upload audio and start transcription |
| GET | `/status/{job_id}` | Check transcription progress |
| POST | `/analyze-pronunciation` | Upload audio and analyze pronunciation |
| GET | `/pronunciation-status/{job_id}` | Check pronunciation analysis progress |
| DELETE | `/job/{job_id}` | Delete transcription or analysis job |
| GET | `/health` | Health check endpoint |

### 3. Deployment Workflow

#### Development
```bash
# Terminal 1 - Backend
cd backend
uvicorn app:app --reload

# Terminal 2 - Frontend  
cd frontend
npm start
```

#### Production
```bash
# Using Docker Compose
docker-compose up -d

# Or individual containers
docker build -t speech-backend ./backend
docker build -t speech-frontend ./frontend
docker run -p 8000:8000 speech-backend
docker run -p 3000:80 speech-frontend
```

## Configuration

### Backend Configuration

Edit `backend/app.py` to customize:

```python
# Model configuration
model_id = "openai/whisper-small"  # Change to whisper-medium, whisper-large

# Chunk processing
CHUNK_LENGTH = 30  # Seconds per chunk

# CORS origins
allow_origins=["http://localhost:3000", "https://yourdomain.com"]
```

### Frontend Configuration

Edit `frontend/src/App.js`:

```javascript
// API endpoint
const API_BASE_URL = 'http://localhost:8000';

// Supported languages
const languages = ['de', 'en', 'es', 'fr', ...];
```

## Usage

### Method 1: Microphone Recording

1. **Grant Microphone Permission**
   - Click "Start Recording"
   - Allow microphone access when prompted by browser
   - Microphone icon will pulse during recording

2. **Record Audio**
   - Speak clearly into your microphone
   - Monitor recording time in real-time
   - Click "Stop Recording" when finished

3. **Review Recording**
   - Click "Play Recording" to preview
   - Recording is ready for transcription

### Method 2: File Upload

1. **Upload Audio File**
   - Drag & drop or click to select
   - Supports: MP3, WAV, M4A, FLAC, OGG, WebM
   - Max file size: Limited by server config

2. **Select Language**
   - Choose from 10+ supported languages
   - Default: German (configurable)

### Method 3: Pronunciation Analysis

1. **Enable Pronunciation Analysis**
   - Click "🧠 Pronunciation Analysis" button
   - Enter reference text you want to practice

2. **Provide Reference Text**
   - Type or paste the text you want to practice pronouncing
   - This will be used to compare against your recording

3. **Record or Upload**
   - Use microphone recording or upload an audio file
   - Make sure you're reading the reference text

4. **Get Detailed Analysis**
   - Overall pronunciation score (0-100%)
   - Accuracy and fluency breakdowns
   - Specific error identification
   - Personalized improvement suggestions
   - Phonetic transcript

5. **Improve Your Pronunciation**
   - Review identified errors
   - Follow AI-generated suggestions
   - Practice and re-analyze

## Troubleshooting

### Common Issues

1. **Microphone Permission Denied**
   ```
   - Check browser settings for microphone access
   - Reload the page and try again
   - Use HTTPS for production (required for microphone access)
   ```

2. **CUDA/GPU Issues**
   ```python
   # In backend/app.py, force CPU usage:
   device = torch.device("cpu")
   ```

3. **CORS Errors**
   ```python
   # Add your domain to CORS origins in app.py
   allow_origins=["http://localhost:3000", "https://yourdomain.com"]
   ```

4. **File Upload Errors**
   ```bash
   # Check file permissions
   chmod 755 backend/uploads/
   
   # Check disk space
   df -h
   ```

5. **Memory Issues**
   ```python
   # Use smaller Whisper model
   model_id = "openai/whisper-tiny"  # Instead of whisper-small
   ```

6. **Browser Compatibility**
   ```
   - MediaRecorder API requires modern browsers
   - Chrome/Edge: Full support
   - Firefox: Full support
   - Safari: Limited WebM support (will fallback to other formats)
   ```

### Debug Mode

```bash
# Backend debug
export PYTHONPATH="${PYTHONPATH}:."
python -m uvicorn app:app --reload --log-level debug

# Frontend debug
REACT_APP_DEBUG=true npm start
```

## Performance Optimization

### Backend Optimizations

1. **GPU Acceleration**
   - Install CUDA-compatible PyTorch
   - Use appropriate Whisper model size
   - Monitor GPU memory usage

2. **Chunking Strategy**
   ```python
   # Adjust chunk size based on available memory
   CHUNK_LENGTH = 30  # Reduce for limited memory
   ```

3. **Model Caching**
   ```python
   # Pre-load models on startup
   @app.on_event("startup")
   async def load_model():
       # Model loading logic
   ```

### Frontend Optimizations

1. **Bundle Size**
   ```bash
   # Analyze bundle
   npm run build
   npx webpack-bundle-analyzer build/static/js/*.js
   ```

2. **Progressive Upload**
   - Implement file chunking
   - Add upload progress indicators
   - Enable resume functionality

## Deployment Options

### 1. Local Development
- Use `npm start` and `uvicorn` directly
- Best for development and testing

### 2. Docker Compose
- Single command deployment
- Includes networking and volumes
- Best for production deployments

### 3. Cloud Deployment

#### AWS/Azure/GCP
```bash
# Build and push to container registry
docker build -t your-registry/speech-backend ./backend
docker push your-registry/speech-backend

# Deploy to cloud container service
```

#### Heroku
```bash
# Add Procfile to backend/
echo "web: uvicorn app:app --host 0.0.0.0 --port \$PORT" > backend/Procfile

# Deploy
git subtree push --prefix backend heroku main
```

## Scaling Considerations

### Horizontal Scaling
- Add Redis for job queue management
- Implement load balancing
- Use shared storage for uploads

### Vertical Scaling
- Increase GPU memory for larger models
- Add more CPU cores for parallel processing
- Optimize chunk processing algorithms

## Security

### Backend Security
- Add authentication middleware
- Implement rate limiting
- Validate file types and sizes
- Sanitize file uploads

### Frontend Security
- Implement HTTPS
- Add Content Security Policy
- Validate user inputs
- Secure API communication

## License

This project is open source. Modify and distribute as needed for your use case.

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review API documentation at `/docs`
3. Check container logs: `docker-compose logs`
4. Open an issue with detailed error information
