import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getScoreColor } from './utils';
import './index.css';
import './debug-env.js'; // Import debug script

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

// Debug logging
console.log('=== API Configuration Debug ===');
console.log(
  'process.env.REACT_APP_API_BASE_URL:',
  process.env.REACT_APP_API_BASE_URL
);
console.log('API_BASE_URL being used:', API_BASE_URL);
console.log('=== End Debug ===');

function App() {
  // Navigation state
  const [activeTab, setActiveTab] = useState('recorder');

  const [file, setFile] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [language, setLanguage] = useState('de');
  const [isProcessing, setIsProcessing] = useState(false);

  // Microphone recording states
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioStream, setAudioStream] = useState(null);

  // Pronunciation analysis states
  // const [showPronunciationAnalysis, setShowPronunciationAnalysis] = useState(false);
  const [referenceText, setReferenceText] = useState('');
  const [pronunciationJobId, setPronunciationJobId] = useState(null);
  const [pronunciationStatus, setPronunciationStatus] = useState(null);
  const [pronunciationAnalysis, setPronunciationAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const onDrop = useCallback(acceptedFiles => {
    const uploadedFile = acceptedFiles[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      setRecordedBlob(null); // Clear recorded audio when file is uploaded
      setJobId(null);
      setStatus(null);
      setProgress(0);
      setTranscript('');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a', '.flac', '.ogg', '.webm'],
      'audio/wav': ['.wav'],
      'audio/wave': ['.wav'],
      'audio/x-wav': ['.wav'],
      'audio/mpeg': ['.mp3'],
      'audio/mp3': ['.mp3'],
      'audio/mp4': ['.m4a'],
      'audio/m4a': ['.m4a'],
      'audio/flac': ['.flac'],
      'audio/ogg': ['.ogg'],
      'audio/webm': ['.webm'],
    },
    multiple: false,
  });

  const uploadAndTranscribe = async () => {
    const audioFile = file || recordedBlob;

    if (!audioFile) {
      toast.error(
        'Please select an audio file or record from microphone first'
      );
      return;
    }

    setIsProcessing(true);
    const formData = new FormData();

    if (recordedBlob) {
      // Create a file from the recorded blob with proper extension
      let fileExtension = '.wav'; // Default fallback
      let mimeType = recordedBlob.type || 'audio/wav';
      
      // Determine extension based on MIME type
      if (mimeType.includes('webm')) {
        fileExtension = '.webm';
      } else if (mimeType.includes('mp4') || mimeType.includes('m4a')) {
        fileExtension = '.m4a';
      } else if (mimeType.includes('mpeg') || mimeType.includes('mp3')) {
        fileExtension = '.mp3';
      } else if (mimeType.includes('ogg')) {
        fileExtension = '.ogg';
      } else if (mimeType.includes('flac')) {
        fileExtension = '.flac';
      } else if (mimeType.includes('wav') || mimeType.includes('wave')) {
        fileExtension = '.wav';
      }
      
      const fileName = `recording${fileExtension}`;
      const recordedFile = new File(
        [recordedBlob],
        fileName,
        {
          type: mimeType,
        }
      );
      console.log(
        `Uploading recorded file: name="${recordedFile.name}", size=${recordedFile.size}, type="${recordedFile.type}"`
      );
      // Explicitly set the filename in FormData to ensure it's preserved
      formData.append('file', recordedFile, fileName);
    } else {
      console.log(
        `Uploading file: ${audioFile.name}, size: ${audioFile.size}, type: ${audioFile.type}`
      );
      formData.append('file', audioFile);
    }

    formData.append('language', language);

    try {
      console.log(`Starting transcription with language: ${language}`);
      const response = await axios.post(
        `${API_BASE_URL}/transcribe`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setJobId(response.data.job_id);
      toast.success('Upload successful! Transcription started...');

      // Start polling for status
      pollStatus(response.data.job_id);
    } catch (error) {
      console.error('Upload error:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.detail || error.message;
      toast.error(`Failed to upload file: ${errorMessage}`);
      setIsProcessing(false);
    }
  };

  const pollStatus = async currentJobId => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/status/${currentJobId}`
      );
      const jobStatus = response.data;

      setStatus(jobStatus.status);
      setProgress(jobStatus.progress || 0);

      if (jobStatus.transcript) {
        setTranscript(jobStatus.transcript);
      }

      if (jobStatus.status === 'completed') {
        setIsProcessing(false);
        toast.success('Transcription completed!');
      } else if (jobStatus.status === 'failed') {
        setIsProcessing(false);
        toast.error(
          `Transcription failed: ${jobStatus.error || 'Unknown error'}`
        );
      } else if (
        jobStatus.status === 'processing' ||
        jobStatus.status === 'queued'
      ) {
        // Continue polling
        setTimeout(() => pollStatus(currentJobId), 2000);
      }
    } catch (error) {
      console.error('Status check error:', error);
      setIsProcessing(false);
      toast.error('Failed to check status');
    }
  };

  const resetState = () => {
    setPronunciationJobId(null);
    setPronunciationStatus(null);
    setPronunciationAnalysis(null);
    setIsAnalyzing(false);

    // Stop recording if active
    if (isRecording) {
      stopRecording();
    }

    // Reset other states based on active tab
    if (activeTab === 'upload') {
      setFile(null);
      setJobId(null);
      setStatus(null);
      setProgress(0);
      setTranscript('');
      setIsProcessing(false);
    } else {
      // For recorder tab, keep some states but reset others
      setRecordedBlob(null);
      setRecordingTime(0);
      setJobId(null);
      setStatus(null);
      setProgress(0);
      setTranscript('');
      setIsProcessing(false);
      setReferenceText('');
    }
  };

  // Microphone recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      setAudioStream(stream);

      // Try different MIME types in order of preference
      const supportedTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/wav',
      ];

      let mimeType = '';
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          // console.log(`Using MIME type: ${mimeType}`);
          break;
        }
      }

      if (!mimeType) {
        mimeType = 'audio/webm'; // Fallback
        console.warn(
          'No preferred MIME type supported, using fallback:',
          mimeType
        );
      }

      const recorder = new MediaRecorder(stream, {
        mimeType,
      });

      const chunks = [];

      recorder.ondataavailable = event => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        console.log(
          `Recording completed. Blob size: ${blob.size} bytes, type: ${blob.type}`
        );
        setRecordedBlob(blob);
        setFile(null); // Clear file upload when recording

        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
        setAudioStream(null);
      };

      recorder.start(1000); // Record in 1-second chunks
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);

      toast.success('Recording started!');

      // Start timer
      const timer = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Store timer ID for cleanup
      recorder.timerId = timer;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      clearInterval(mediaRecorder.timerId);
      setIsRecording(false);
      setMediaRecorder(null);
      toast.success('Recording stopped!');
    }
  };

  const formatTime = seconds => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const playRecording = () => {
    if (recordedBlob) {
      const audio = new Audio(URL.createObjectURL(recordedBlob));
      audio.play();
    }
  };

  // Pronunciation analysis functions
  const startPronunciationAnalysis = async () => {
    if (!recordedBlob) {
      toast.error('Please record audio from microphone first');
      return;
    }

    if (!referenceText.trim()) {
      toast.error('Please enter reference text for pronunciation analysis');
      return;
    }

    setIsAnalyzing(true);
    const formData = new FormData();

    // Create a file from the recorded blob with proper extension
    let fileExtension = '.wav'; // Default fallback
    let mimeType = recordedBlob.type || 'audio/wav';
    
    // Determine extension based on MIME type
    if (mimeType.includes('webm')) {
      fileExtension = '.webm';
    } else if (mimeType.includes('mp4') || mimeType.includes('m4a')) {
      fileExtension = '.m4a';
    } else if (mimeType.includes('mpeg') || mimeType.includes('mp3')) {
      fileExtension = '.mp3';
    } else if (mimeType.includes('ogg')) {
      fileExtension = '.ogg';
    } else if (mimeType.includes('flac')) {
      fileExtension = '.flac';
    } else if (mimeType.includes('wav') || mimeType.includes('wave')) {
      fileExtension = '.wav';
    }
    
    const fileName = `recording${fileExtension}`;
    const recordedFile = new File([recordedBlob], fileName, {
      type: mimeType,
    });
    
    // Verify the file object was created properly
    console.log(
      `Uploading for pronunciation analysis: name="${recordedFile.name}", size=${recordedFile.size}, type="${recordedFile.type}"`
    );
    
    // Explicitly set the filename in FormData to ensure it's preserved
    formData.append('file', recordedFile, fileName);
    formData.append('reference_text', referenceText);
    formData.append('language', language);

    try {
      console.log(
        `Starting pronunciation analysis with language: ${language}, reference: "${referenceText}"`
      );
      const response = await axios.post(
        `${API_BASE_URL}/analyze-pronunciation`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setPronunciationJobId(response.data.job_id);
      toast.success('Pronunciation analysis started!');

      // Start polling for status
      pollPronunciationStatus(response.data.job_id);
    } catch (error) {
      console.error('Pronunciation analysis error:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.detail || error.message;
      toast.error(`Failed to start pronunciation analysis: ${errorMessage}`);
      setIsAnalyzing(false);
    }
  };

  const pollPronunciationStatus = async currentJobId => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/pronunciation-status/${currentJobId}`
      );
      const jobStatus = response.data;

      setPronunciationStatus(jobStatus.status);

      if (jobStatus.analysis) {
        setPronunciationAnalysis(jobStatus.analysis);
      }

      if (jobStatus.status === 'completed') {
        setIsAnalyzing(false);
        toast.success('Pronunciation analysis completed!');
      } else if (jobStatus.status === 'failed') {
        setIsAnalyzing(false);
        toast.error(
          `Pronunciation analysis failed: ${jobStatus.error || 'Unknown error'}`
        );
      } else if (
        jobStatus.status === 'processing' ||
        jobStatus.status === 'queued'
      ) {
        // Continue polling
        setTimeout(() => pollPronunciationStatus(currentJobId), 2000);
      }
    } catch (error) {
      console.error('Pronunciation status check error:', error);
      setIsAnalyzing(false);
      toast.error('Failed to check pronunciation analysis status');
    }
  };

  // Function to play correct pronunciation
  const playCorrectPronunciation = async (word, language = 'en') => {
    try {
      console.log(
        `Playing correct pronunciation for word: "${word}" in language: ${language}`
      );
      console.log(`API_BASE_URL: ${API_BASE_URL}`);
      console.log(`Full URL: ${API_BASE_URL}/synthesize-speech`);

      // Show loading toast with shorter timeout for faster feedback
      const loadingToast = toast.loading('Generating pronunciation...', {
        autoClose: 3000,
      });

      // Create form data for the request
      const formData = new FormData();
      formData.append('text', word);
      formData.append('language', language);

      // Call the synthesize-speech endpoint with shorter timeout
      const response = await axios.post(
        `${API_BASE_URL}/synthesize-speech`,
        formData,
        {
          responseType: 'blob',
          timeout: 10000, // 10 second timeout
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      // Dismiss loading toast immediately
      toast.dismiss(loadingToast);

      // Determine content type from response
      const contentType = response.headers['content-type'] || 'audio/wav';
      const isMP3 = contentType.includes('mpeg') || contentType.includes('mp3');

      // Create audio URL from blob and play it
      const audioBlob = new Blob([response.data], { type: contentType });
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);

      // Optimize audio playback
      audio.preload = 'auto';
      audio.volume = 0.8;

      // Add event listeners for better feedback
      audio.addEventListener('canplaythrough', () => {
        console.log('Audio ready to play');
      });

      audio.addEventListener('ended', () => {
        // Clean up immediately when audio ends
        URL.revokeObjectURL(audioUrl);
        console.log(`Finished playing pronunciation for: ${word}`);
      });

      // Play with error handling
      try {
        await audio.play();
        // toast.success(`🔊 Playing "${word}"`, { autoClose: 2000 });
        // console.log(`Successfully started pronunciation for: ${word}`);
      } catch (playError) {
        console.error('Error playing audio:', playError);
        URL.revokeObjectURL(audioUrl); // Clean up on error

        if (playError.name === 'NotAllowedError') {
          toast.error(
            'Audio playback blocked. Please enable audio permissions.'
          );
        } else {
          toast.error('Failed to play pronunciation audio');
        }
      }
    } catch (error) {
      console.error('Error generating pronunciation:', error);
      console.error('Error response status:', error.response?.status);
      console.error('Error response data:', error.response?.data);

      // Handle specific error cases with better messages
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        toast.error('Request timed out. Please try again.');
      } else if (error.response?.status === 503) {
        toast.error('Check internet connection.');
      } else if (error.response?.status === 404) {
        toast.error('Pronunciation service not available.');
      } else if (error.response?.status === 429) {
        toast.error('Too many requests. Please wait a moment and try again.');
      } else {
        const errorMessage = error.response?.data?.detail || error.message;
        toast.error(`Failed to generate pronunciation: ${errorMessage}`);
      }
    }
  };

  const getErrorTypeColor = errorType => {
    const colors = {
      substitution: '#e74c3c',
      deletion: '#e67e22',
      insertion: '#f39c12',
      errors: '#8e44ad',
      stress: '#9b59b6',
    };
    return colors[errorType] || '#95a5a6';
  };

  const getScoreColor = score => {
    if (score >= 90) return '#27ae60';
    if (score >= 80) return '#f39c12';
    if (score >= 70) return '#e67e22';
    return '#e74c3c';
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(transcript);
    toast.success('Transcript copied to clipboard!');
  };

  const downloadTranscript = () => {
    const element = document.createElement('a');
    const file = new Blob([transcript], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'transcript.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success('Transcript downloaded!');
  };

  return (
    <div className="App">
      <div className="container">
        <h1 style={{ color: 'white', fontSize: '3rem', marginBottom: '30px' }}>
          Speech to Text
        </h1>
        <p style={{ color: 'white', fontSize: '1.2rem', marginBottom: '40px' }}>
          Record from your microphone for transcription and pronunciation
          analysis, or upload audio files for transcription powered by OpenAI
          Whisper
        </p>

        {/* Navigation Bar */}
        <div className="navigation-bar">
          <button
            className={`nav-button ${
              activeTab === 'recorder' ? 'nav-active' : ''
            }`}
            onClick={() => setActiveTab('recorder')}
          >
            Microphone Recording & Pronunciation
          </button>
          <button
            className={`nav-button ${
              activeTab === 'upload' ? 'nav-active' : ''
            }`}
            onClick={() => setActiveTab('upload')}
          >
            File Upload & Transcription
          </button>
          <button
            className={`nav-button ${
              activeTab === 'mobile-test' ? 'nav-active' : ''
            }`}
            onClick={() => setActiveTab('mobile-test')}
          >
            📱 Mobile Test
          </button>
        </div>

        {/* Microphone Recording & Pronunciation Analysis Tab */}
        {activeTab === 'recorder' && (
          <div className="card">
            <h2>Record from Microphone</h2>

            <div className="language-selector">
              <label htmlFor="language">Language:</label>
              <select
                id="language"
                data-testid="language-select"
                value={language}
                onChange={e => setLanguage(e.target.value)}
                disabled={isProcessing || isRecording || isAnalyzing}
              >
                <option value="de">German</option>
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="it">Italian</option>
                <option value="pt">Portuguese</option>
                <option value="ru">Russian</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
                <option value="zh">Chinese</option>
              </select>
            </div>

            {/* Microphone Recording Section */}
            <div className="recording-section">
              <div className="recording-controls">
                {!isRecording ? (
                  <button
                    className="button record-button"
                    data-testid="record-button"
                    onClick={startRecording}
                    disabled={isProcessing || isAnalyzing}
                  >
                    Start Recording
                  </button>
                ) : (
                  <div>
                    <button
                      className="button stop-button"
                      onClick={stopRecording}
                    >
                      Stop Recording
                    </button>
                    <div className="recording-indicator">
                      <div className="recording-pulse" />
                      <span>Recording: {formatTime(recordingTime)}</span>
                    </div>
                  </div>
                )}

                {recordedBlob && !isRecording && (
                  <div className="recorded-audio">
                    <p>Recording ready ({formatTime(recordingTime)})</p>
                    <button
                      className="button play-button"
                      onClick={playRecording}
                      disabled={isProcessing || isAnalyzing}
                    >
                      Play Recording
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Transcription Section */}
            <div className="transcription-section">
              <h3>Speech to Text Transcription</h3>
              <button
                className="button"
                onClick={uploadAndTranscribe}
                disabled={
                  !recordedBlob || isProcessing || isRecording || isAnalyzing
                }
              >
                {isProcessing ? 'Processing...' : 'Start Transcription'}
              </button>
            </div>

            {/* Pronunciation Analysis Section */}
            <div className="pronunciation-section">
              <h3>Pronunciation Analysis</h3>
              <p>
                Enter the text you want to practice pronouncing, then analyze
                your recording:
              </p>

              <div className="reference-text-input">
                <textarea
                  id="referenceText"
                  value={referenceText}
                  onChange={e => setReferenceText(e.target.value)}
                  placeholder="Enter the text you want to practice pronouncing..."
                  rows={4}
                  disabled={isAnalyzing || isProcessing}
                />
              </div>

              <button
                className="button analyze-button"
                onClick={startPronunciationAnalysis}
                disabled={
                  !referenceText.trim() ||
                  !recordedBlob ||
                  isAnalyzing ||
                  isRecording ||
                  isProcessing
                }
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze Pronunciation'}
              </button>

              {pronunciationStatus && (
                <div className="analysis-status">
                  {pronunciationStatus === 'processing' && (
                    <div>
                      <div className="spinner" />
                      <p>Analyzing pronunciation patterns...</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              className="button"
              onClick={resetState}
              disabled={isProcessing || isAnalyzing}
            >
              Reset
            </button>
          </div>
        )}

        {/* File Upload & Transcription Tab */}
        {activeTab === 'upload' && (
          <div className="card">
            <h2>Upload Audio File</h2>

            <div className="language-selector">
              <label htmlFor="language-upload">Language:</label>
              <select
                id="language-upload"
                value={language}
                onChange={e => setLanguage(e.target.value)}
                disabled={isProcessing}
              >
                <option value="de">German</option>
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="it">Italian</option>
                <option value="pt">Portuguese</option>
                <option value="ru">Russian</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
                <option value="zh">Chinese</option>
              </select>
            </div>

            <div
              {...getRootProps()}
              className={`upload-area ${isDragActive ? 'drag-over' : ''}`}
              data-testid="upload-area"
            >
              <input {...getInputProps()} />
              {file ? (
                <div>
                  <p>Selected: {file.name}</p>
                  <p>Size: {(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <div>
                  <p>Drag & drop an audio file here, or click to select</p>
                  <p>Supported formats: MP3, WAV, M4A, FLAC, OGG, WebM</p>
                </div>
              )}
            </div>

            <button
              className="button"
              onClick={uploadAndTranscribe}
              disabled={!file || isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Start Transcription'}
            </button>

            <button
              className="button"
              onClick={resetState}
              disabled={isProcessing}
            >
              Reset
            </button>
          </div>
        )}

        {status && (
          <div className="card">
            <h3>Transcription Status</h3>
            <div className={`status-badge status-${status}`}>
              {status.toUpperCase()}
            </div>

            {status === 'processing' && (
              <div>
                <div className="spinner" />
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {transcript && (
          <div className="card" data-testid="transcription-result">
            <h3>Transcription Result</h3>
            <div className="transcript-area">{transcript}</div>
            <button className="button" onClick={copyToClipboard}>
              Copy to Clipboard
            </button>
            <button className="button" onClick={downloadTranscript}>
              Download Transcript
            </button>
          </div>
        )}

        {/* Pronunciation Analysis Results */}
        {pronunciationAnalysis && (
          <div
            className="card pronunciation-results"
            data-testid="pronunciation-analysis"
          >
            <h3>Pronunciation Analysis Results</h3>

            {/* Score Overview */}
            <div className="score-overview">
              <div className="score-card">
                <div className="score-title">Overall Score</div>
                <div
                  className="score-value"
                  style={{
                    color: getScoreColor(pronunciationAnalysis.overall_score),
                  }}
                >
                  {pronunciationAnalysis.overall_score}%
                </div>
              </div>
              <div className="score-card">
                <div className="score-title">Accuracy</div>
                <div
                  className="score-value"
                  style={{
                    color: getScoreColor(pronunciationAnalysis.accuracy_score),
                  }}
                >
                  {pronunciationAnalysis.accuracy_score}%
                </div>
              </div>
              <div className="score-card">
                <div className="score-title">Fluency</div>
                <div
                  className="score-value"
                  style={{
                    color: getScoreColor(pronunciationAnalysis.fluency_score),
                  }}
                >
                  {pronunciationAnalysis.fluency_score}%
                </div>
              </div>
            </div>

            {/* Analysis Summary */}
            <div className="analysis-summary">
              <p>
                <strong>What you said:</strong> "
                {pronunciationAnalysis.transcript}"
              </p>
              <p>
                <strong>Words analyzed:</strong>{' '}
                {pronunciationAnalysis.words_analyzed}
              </p>
              <p>
                <strong>Total errors found:</strong>{' '}
                {pronunciationAnalysis.total_errors}
              </p>
            </div>

            {/* Pronunciation Errors */}
            {pronunciationAnalysis.pronunciation_errors &&
            pronunciationAnalysis.pronunciation_errors.length > 0 ? (
              <div className="pronunciation-errors">
                <h4>Areas for Improvement</h4>
                {pronunciationAnalysis.pronunciation_errors.map(
                  (error, index) => (
                    <div key={index} className="error-card">
                      <div className="error-header">
                        <span
                          className="error-word clickable-word"
                          onClick={() =>
                            playCorrectPronunciation(error.word, language)
                          }
                          title="Click to hear correct pronunciation"
                        >
                          {error.word} 🔊
                        </span>
                        <span
                          className="error-type"
                          style={{
                            backgroundColor: getErrorTypeColor(
                              error.error_type
                            ),
                          }}
                        >
                          {error.error_type}
                        </span>
                        <span className="error-confidence">
                          {Math.round(error.confidence * 100)}% confidence
                        </span>
                      </div>
                      <div className="error-details">
                        <p>
                          <strong>Expected:</strong>{' '}
                          {error.expected_pronunciation}
                        </p>
                        <p>
                          <strong>You said:</strong>{' '}
                          {error.actual_pronunciation}
                        </p>
                        <p>
                          <strong>Tip:</strong> {error.suggestion}
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="no-errors">
                <h4>Excellent Pronunciation!</h4>
                <p>
                  No significant pronunciation errors detected. Keep up the
                  great work!
                </p>
              </div>
            )}

            {/* Phonetic Transcript */}
            <div className="phonetic-section">
              <h4>Phonetic Transcript</h4>
              <div className="phonetic-transcript">
                {pronunciationAnalysis.phonetic_transcript}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Test Tab */}
        {activeTab === 'mobile-test' && (
          <MobileTestPage />
        )}
      </div>

      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
}

export default App;
