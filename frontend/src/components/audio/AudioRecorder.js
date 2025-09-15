import React from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { useAudioRecording } from '../../hooks';
import { Button } from '../common';
import { formatTime } from '../../utils';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '../../constants';

/**
 * Audio recorder component with microphone recording functionality
 */
function AudioRecorder({
  onRecordingComplete,
  onRecordingStart,
  onRecordingStop,
  onError,
  disabled = false,
  className = '',
}) {
  const {
    isRecording,
    recordedBlob,
    recordingTime,
    error,
    isSupported,
    startRecording,
    stopRecording,
    playRecording,
    clearRecording,
    hasRecording,
    canRecord,
    canPlay,
  } = useAudioRecording({
    onRecordingComplete: blob => {
      toast.success(SUCCESS_MESSAGES.RECORDING_STOPPED);
      if (onRecordingComplete) onRecordingComplete(blob);
    },
    onRecordingStart: () => {
      toast.success(SUCCESS_MESSAGES.RECORDING_STARTED);
      if (onRecordingStart) onRecordingStart();
    },
    onRecordingStop: () => {
      if (onRecordingStop) onRecordingStop();
    },
    onError: errorMessage => {
      toast.error(errorMessage);
      if (onError) onError(errorMessage);
    },
  });

  // Show error if not supported
  if (!isSupported) {
    return (
      <div className={`card error-card ${className}`}>
        <h3>Audio Recording Not Supported</h3>
        <p>Your browser does not support audio recording.</p>
      </div>
    );
  }

  const handleStartRecording = async () => {
    const success = await startRecording();
    if (!success && error) {
      toast.error(error);
    }
  };

  const handleStopRecording = () => {
    const success = stopRecording();
    if (!success) {
      toast.error('Failed to stop recording');
    }
  };

  const handlePlayRecording = async () => {
    const success = await playRecording();
    if (!success && error) {
      toast.error(error);
    }
  };

  const handleClearRecording = () => {
    clearRecording();
    toast.success('Recording cleared');
  };

  return (
    <div className={`recording-section ${className}`}>
      <div className="recording-controls">
        {!isRecording ? (
          <Button
            onClick={handleStartRecording}
            disabled={!canRecord || disabled}
            variant="primary"
            size="large"
            testId="record-button"
            className="record-button"
          >
            Start Recording
          </Button>
        ) : (
          <div className="recording-active">
            <Button
              onClick={handleStopRecording}
              variant="danger"
              size="large"
              className="stop-button"
            >
              Stop Recording
            </Button>
            <div className="recording-indicator">
              <div className="recording-pulse" />
              <span data-testid="timer">
                Recording: {formatTime(recordingTime)}
              </span>
            </div>
          </div>
        )}

        {hasRecording && !isRecording && (
          <div className="recorded-audio">
            <p>Recording ready ({formatTime(recordingTime)})</p>
            <div className="recording-actions">
              <Button
                onClick={handlePlayRecording}
                disabled={!canPlay || disabled}
                variant="secondary"
                className="play-button"
              >
                Play Recording
              </Button>
              <Button
                onClick={handleClearRecording}
                disabled={disabled}
                variant="secondary"
                size="small"
              >
                Clear
              </Button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="error-message" data-testid="error-message">
          {error}
        </div>
      )}
    </div>
  );
}

AudioRecorder.propTypes = {
  onRecordingComplete: PropTypes.func,
  onRecordingStart: PropTypes.func,
  onRecordingStop: PropTypes.func,
  onError: PropTypes.func,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default AudioRecorder;
