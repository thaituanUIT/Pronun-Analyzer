import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import { LanguageSelector } from '../components/common';
import { useTranscription } from '../hooks';
import { formatFileSize, copyToClipboard, downloadTextAsFile } from '../utils';
import DriveFolderUploadIcon from '@mui/icons-material/DriveFolderUpload';
import FolderIcon from '@mui/icons-material/Folder';
import './UploadPage.css';

const UploadPage = ({ language, onLanguageChange }) => {
  const [selectedFile, setSelectedFile] = useState(null);

  const {
    transcript,
    status,
    progress,
    isProcessing,
    startTranscription,
    resetTranscription,
  } = useTranscription();

  const onDrop = useCallback((acceptedFiles) => {
    const uploadedFile = acceptedFiles[0];
    if (uploadedFile) {
      setSelectedFile(uploadedFile);
      // Reset any previous transcription
      resetTranscription();
      toast.success(`File selected: ${uploadedFile.name}`);
    }
  }, [resetTranscription]);

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

  const handleTranscribe = () => {
    if (!selectedFile) {
      toast.error('Please select an audio file first');
      return;
    }

    startTranscription(selectedFile, language);
  };

  const handleReset = () => {
    setSelectedFile(null);
    resetTranscription();
    toast.info('Upload reset');
  };

  const handleCopyTranscript = () => {
    if (transcript) {
      copyToClipboard(transcript);
      toast.success('Transcript copied to clipboard!');
    }
  };

  const handleDownloadTranscript = () => {
    if (transcript) {
      downloadTextAsFile(transcript, 'transcript.txt');
      toast.success('Transcript downloaded!');
    }
  };

  return (
    <div className="upload-page">
      <div className="compact-card">
        <div className="card-header">
          <h2>Upload Audio File</h2>
          <div className="language-selector-inline">
            <LanguageSelector 
              value={language}
              onChange={onLanguageChange}
              inline={true}
            />
          </div>
        </div>

        {/* File Upload Area */}
        <div
          {...getRootProps()}
          className={`upload-area-compact ${isDragActive ? 'drag-active' : ''} ${selectedFile ? 'has-file' : ''}`}
        >
          <input {...getInputProps()} />
          {selectedFile ? (
            <div className="file-info">
              <div className="file-icon"><FolderIcon/></div>
              <div className="file-details">
                <p className="file-name">{selectedFile.name}</p>
                <p className="file-size">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
          ) : (
            <div className="upload-prompt">
              <div className="upload-icon"><DriveFolderUploadIcon fontSize='inherit'/></div>
              <p>Drag & drop an audio file here, or click to select</p>
              <p className="upload-formats">Supported: MP3, WAV, M4A, FLAC, OGG, WebM</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="upload-actions">
          <button
            type="button"
            className="action-btn primary"
            onClick={handleTranscribe}
            disabled={!selectedFile || isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Start Transcription'}
          </button>
          
          <button
            type="button"
            className="action-btn secondary"
            onClick={handleReset}
            disabled={isProcessing}
          >
            Reset
          </button>
        </div>

        {/* Status Display */}
        {status && (
          <div className="status-section">
            <h3>Transcription Status</h3>
            <div className={`status-badge status-${status}`}>
              {status.toUpperCase()}
            </div>
            
            {status === 'processing' && (
              <div className="progress-section">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="progress-text">{progress}%</span>
              </div>
            )}
          </div>
        )}

        {/* Transcription Results */}
        {transcript && (
          <div className="results-section">
            <h3>Transcription Result</h3>
            <div className="transcription-result">
              {transcript}
            </div>
            <div className="result-actions">
              <button
                type="button"
                className="action-btn"
                onClick={handleCopyTranscript}
              >
                Copy to Clipboard
              </button>
              <button
                type="button"
                className="action-btn"
                onClick={handleDownloadTranscript}
              >
                Download Transcript
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

UploadPage.propTypes = {
  language: PropTypes.string,
  onLanguageChange: PropTypes.func,
};

UploadPage.defaultProps = {
  language: 'de',
  onLanguageChange: () => {},
};

export default UploadPage;
