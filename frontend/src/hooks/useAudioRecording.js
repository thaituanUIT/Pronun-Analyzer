import { useState, useRef, useCallback, useEffect } from 'react';
import { audioService } from '../services/audioService';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '../constants';
import { debugLog } from '../utils';

/**
 * Custom hook for audio recording functionality
 * @param {Object} options - Configuration options
 * @returns {Object} Recording state and methods
 */
export const useAudioRecording = (options = {}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(true);

  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  const timerRef = useRef(null);

  // Check browser support on mount
  useEffect(() => {
    const support = audioService.checkRecordingSupport();
    setIsSupported(support.isSupported);

    if (!support.isSupported) {
      setError('Audio recording is not supported in this browser');
    }

    debugLog('Audio recording support:', support);
  }, []);

  /**
   * Start recording audio
   */
  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError('Audio recording is not supported');
      return false;
    }

    if (isRecording) {
      console.warn('Recording is already in progress');
      return false;
    }

    setError(null);
    setRecordedBlob(null);
    setRecordingTime(0);

    try {
      // Get media stream
      const { stream, error: streamError } =
        await audioService.getUserMediaStream(options.constraints);

      if (streamError) {
        setError(streamError);
        if (options.onError) options.onError(streamError);
        return false;
      }

      audioStreamRef.current = stream;

      // Create media recorder
      const {
        recorder,
        mimeType,
        error: recorderError,
      } = audioService.createMediaRecorder(stream);

      if (recorderError) {
        setError(recorderError);
        audioService.stopMediaStream(stream);
        if (options.onError) options.onError(recorderError);
        return false;
      }

      mediaRecorderRef.current = recorder;

      // Set up recording callbacks
      const handleDataAvailable = data => {
        debugLog('Recording data available:', data.size);
      };

      const handleStop = blob => {
        debugLog('Recording stopped, blob created:', {
          size: blob.size,
          type: blob.type,
        });

        setRecordedBlob(blob);
        setIsRecording(false);

        // Cleanup
        audioService.stopMediaStream(audioStreamRef.current);
        audioStreamRef.current = null;
        mediaRecorderRef.current = null;

        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        if (options.onRecordingComplete) {
          options.onRecordingComplete(blob);
        }
      };

      // Start recording
      const success = audioService.startRecording(
        recorder,
        handleDataAvailable,
        handleStop
      );

      if (!success) {
        setError('Failed to start recording');
        audioService.stopMediaStream(stream);
        if (options.onError) options.onError('Failed to start recording');
        return false;
      }

      setIsRecording(true);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      if (options.onRecordingStart) {
        options.onRecordingStart();
      }

      debugLog('Recording started successfully');
      return true;
    } catch (error) {
      const errorMessage = error.message || ERROR_MESSAGES.MICROPHONE_ACCESS;
      setError(errorMessage);
      if (options.onError) options.onError(errorMessage);
      return false;
    }
  }, [isRecording, isSupported, options]);

  /**
   * Stop recording audio
   */
  const stopRecording = useCallback(() => {
    if (!isRecording || !mediaRecorderRef.current) {
      console.warn('No active recording to stop');
      return false;
    }

    try {
      const success = audioService.stopRecording(mediaRecorderRef.current);

      if (success) {
        debugLog('Recording stop initiated');
        if (options.onRecordingStop) {
          options.onRecordingStop();
        }
        return true;
      }

      return false;
    } catch (error) {
      const errorMessage = 'Failed to stop recording';
      setError(errorMessage);
      if (options.onError) options.onError(errorMessage);
      return false;
    }
  }, [isRecording, options]);

  /**
   * Play the recorded audio
   */
  const playRecording = useCallback(async () => {
    if (!recordedBlob) {
      const errorMessage = 'No recording available to play';
      setError(errorMessage);
      return false;
    }

    try {
      await audioService.playAudioBlob(recordedBlob, {
        volume: options.playbackVolume,
      });

      if (options.onPlaybackStart) {
        options.onPlaybackStart();
      }

      return true;
    } catch (error) {
      const errorMessage = error.message || 'Failed to play recording';
      setError(errorMessage);
      if (options.onError) options.onError(errorMessage);
      return false;
    }
  }, [recordedBlob, options]);

  /**
   * Clear the current recording
   */
  const clearRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    }

    setRecordedBlob(null);
    setRecordingTime(0);
    setError(null);

    if (options.onRecordingClear) {
      options.onRecordingClear();
    }

    debugLog('Recording cleared');
  }, [isRecording, stopRecording, options]);

  /**
   * Get recording as File object
   */
  const getRecordingAsFile = useCallback(
    (filename = 'recording') => {
      if (!recordedBlob) {
        return null;
      }

      return audioService.blobToFile(recordedBlob, filename);
    },
    [recordedBlob]
  );

  // Cleanup on unmount
  useEffect(
    () => () => {
      if (isRecording) {
        stopRecording();
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      if (audioStreamRef.current) {
        audioService.stopMediaStream(audioStreamRef.current);
      }
    },
    [isRecording, stopRecording]
  );

  return {
    // State
    isRecording,
    recordedBlob,
    recordingTime,
    error,
    isSupported,

    // Methods
    startRecording,
    stopRecording,
    playRecording,
    clearRecording,
    getRecordingAsFile,

    // Computed properties
    hasRecording: !!recordedBlob,
    canRecord: isSupported && !isRecording,
    canPlay: !!recordedBlob && !isRecording,
  };
};

export default useAudioRecording;
