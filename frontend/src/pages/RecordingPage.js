import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { LanguageSelector } from '../components/common';
import { PronunciationResults } from '../components/pronunciation';
import { useTranscription, usePronunciationAnalysis } from '../hooks';
import { getScoreColor } from '../utils';
import './RecordingPage.css';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';

const RecordingPage = ({ language, onLanguageChange }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [referenceText, setReferenceText] = useState('');
  
  const mediaRecorderRef = useRef(null);
  const audioRef = useRef(null);
  const timerRef = useRef(null);

  // Use existing hooks for functionality
  const {
    transcript,
    isProcessing: isTranscribing,
    startTranscription,
    resetTranscription,
  } = useTranscription();

  const {
    analysis,
    isAnalyzing,
    startAnalysis,
    resetAnalysis,
  } = usePronunciationAnalysis();

  const startRecording = async () => {
    try {
      // Check if getUserMedia is supported (important for mobile)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('Audio recording not supported on this device');
        return;
      }

      // Request microphone with mobile-friendly constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const audioChunks = [];
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioBlob(audioBlob);
        setAudioUrl(audioUrl);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      toast.success('Recording started!');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      
      // Provide specific error messages for mobile users
      let errorMessage = 'Could not access microphone.';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Microphone permission denied. Please allow microphone access and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No microphone found. Please check your device settings.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Audio recording not supported on this device or browser.';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Microphone access blocked. Please ensure you\'re using HTTPS and try again.';
      }
      
      toast.error(errorMessage);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
      toast.success('Recording stopped!');
    }
  };

  const playRecording = () => {
    if (audioUrl && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const transcribeAudio = () => {
    if (!audioBlob) {
      toast.error('No recording available to transcribe');
      return;
    }
    // Use the hook's functionality
    startTranscription(audioBlob, language);
  };

  const analyzePronounciation = () => {
    if (!audioBlob) {
      toast.error('No recording available to analyze');
      return;
    }

    if (!referenceText.trim()) {
      toast.error('Please enter reference text for pronunciation analysis');
      return;
    }

    // Use the hook's functionality
    startAnalysis(audioBlob, referenceText, language);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const resetRecording = () => {
    setRecordingTime(0);
    setIsRecording(false);
    setAudioBlob(null);
    setAudioUrl(null);
    setIsPlaying(false);
    setReferenceText('');
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    clearInterval(timerRef.current);
    resetTranscription();
    resetAnalysis();
    toast.info('Recording reset');
  };

  return (
    <div className="recording-page">
      <div className="compact-card">
        <div className="card-header">
          <h2>Pronun-Analyzer</h2>
          <div className="language-selector-inline">
            <LanguageSelector 
              value={language}
              onChange={onLanguageChange}
              inline={true}
            />
          </div>
        </div>

        <div className="recording-controls-compact">
          <div className="recording-status">
            {isRecording ? (
              <div className="recording-active">
                <div className="pulse-dot"></div>
                <span>Recording: {formatTime(recordingTime)}</span>
              </div>
            ) : (
              <span className="recording-ready">Ready to record</span>
            )}
          </div>

          <div className="control-buttons">
            <button 
              type="button"
              className={`record-btn ${isRecording ? 'recording' : ''}`}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={false}
            >
              {isRecording ?  (
                <>
                  Stop
                </>
              ) : (
                <>
                  Record
                </>
              )}
            </button>
            
            {audioUrl && (
              <button 
                type="button"
                className={`play-btn ${isPlaying ? 'playing' : ''}`}
                onClick={playRecording}
                disabled={isRecording}
              >
                {isPlaying ? 'Pause' : 'Play'}
              </button>
            )}
            
            <button 
              type="button"
              className="action-btn"
              onClick={transcribeAudio}
              disabled={isRecording || !audioBlob || isTranscribing}
            >
              {isTranscribing ? 'Processing...' : 'Transcribe'}
            </button>
            
            <button 
              type="button"
              className="action-btn"
              onClick={analyzePronounciation}
              disabled={isRecording || !audioBlob || isAnalyzing || !referenceText.trim()}
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze'}
            </button>
            
            <button 
              type="button"
              className="reset-btn"
              onClick={resetRecording}
              disabled={isRecording}
            >
              Reset
            </button>
          </div>
        </div>

        <div className="analysis-input-compact">
          <textarea
            placeholder="Enter reference text for pronunciation analysis..."
            className="compact-textarea"
            value={referenceText}
            onChange={(e) => setReferenceText(e.target.value)}
            rows={3}
          />
        </div>

        {/* Audio element for playback */}
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            style={{ display: 'none' }}
          />
        )}

        {/* Transcription Results */}
        {transcript && (
          <div className="results-section">
            <h3>Transcription</h3>
            <div className="transcription-result">
              {transcript}
            </div>
          </div>
        )}

        {/* Analysis Results */}
        {analysis && (
          <div className="results-section">
            <PronunciationResults analysis={analysis} language={language} />
          </div>
        )}
      </div>
    </div>
  );
};

RecordingPage.propTypes = {
  language: PropTypes.string.isRequired,
  onLanguageChange: PropTypes.func.isRequired
};

export default RecordingPage;
