import { useState, useCallback, useRef, useEffect } from 'react';
import { apiService } from '../services/apiService';
import {
  STATUS_TYPES,
  DEFAULT_VALUES,
  SUCCESS_MESSAGES,
  ERROR_MESSAGES,
} from '../constants';
import { debugLog } from '../utils';

/**
 * Custom hook for transcription functionality
 * @param {Object} options - Configuration options
 * @returns {Object} Transcription state and methods
 */
export const useTranscription = (options = {}) => {
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const pollingRef = useRef(null);
  const abortControllerRef = useRef(null);

  /**
   * Poll for transcription status
   */
  const pollStatus = useCallback(
    async currentJobId => {
      if (!currentJobId) return;

      try {
        debugLog('Polling transcription status for job:', currentJobId);

        const response = await apiService.getTranscriptionStatus(currentJobId);

        if (response.error) {
          throw new Error(response.error.message);
        }

        const jobStatus = response.data;

        setStatus(jobStatus.status);
        setProgress(jobStatus.progress || 0);

        if (jobStatus.transcript) {
          setTranscript(jobStatus.transcript);
        }

        if (jobStatus.status === STATUS_TYPES.COMPLETED) {
          setIsProcessing(false);

          if (options.onTranscriptionComplete) {
            options.onTranscriptionComplete(jobStatus.transcript);
          }

          debugLog('Transcription completed successfully');
          return;
        }

        if (jobStatus.status === STATUS_TYPES.FAILED) {
          setIsProcessing(false);
          const errorMessage =
            jobStatus.error || ERROR_MESSAGES.TRANSCRIPTION_FAILED;
          setError(errorMessage);

          if (options.onError) {
            options.onError(errorMessage);
          }

          debugLog('Transcription failed:', errorMessage);
          return;
        }

        if (
          jobStatus.status === STATUS_TYPES.PROCESSING ||
          jobStatus.status === STATUS_TYPES.QUEUED
        ) {
          // Continue polling
          pollingRef.current = setTimeout(() => {
            pollStatus(currentJobId);
          }, options.pollingInterval || DEFAULT_VALUES.pollingInterval);
        }
      } catch (error) {
        console.error('Status check error:', error);
        setIsProcessing(false);
        const errorMessage =
          error.message || ERROR_MESSAGES.STATUS_CHECK_FAILED;
        setError(errorMessage);

        if (options.onError) {
          options.onError(errorMessage);
        }
      }
    },
    [options]
  );

  /**
   * Start transcription process
   */
  const startTranscription = useCallback(
    async (audioFile, language = DEFAULT_VALUES.language) => {
      if (!audioFile) {
        const errorMessage = ERROR_MESSAGES.NO_AUDIO_FILE;
        setError(errorMessage);
        if (options.onError) options.onError(errorMessage);
        return false;
      }

      // Reset state
      setJobId(null);
      setStatus(null);
      setProgress(0);
      setTranscript('');
      setError(null);
      setIsProcessing(true);

      // Cancel any ongoing polling
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
        pollingRef.current = null;
      }

      try {
        debugLog('Starting transcription:', {
          fileName: audioFile.name,
          fileSize: audioFile.size,
          fileType: audioFile.type,
          language,
        });

        const response = await apiService.transcribeAudio(audioFile, language);

        if (response.error) {
          throw new Error(response.error.message);
        }

        const newJobId = response.data.job_id;
        setJobId(newJobId);

        if (options.onTranscriptionStart) {
          options.onTranscriptionStart(newJobId);
        }

        // Start polling for status
        pollStatus(newJobId);

        debugLog('Transcription started with job ID:', newJobId);
        return true;
      } catch (error) {
        console.error('Transcription start error:', error);
        setIsProcessing(false);
        const errorMessage = error.message || ERROR_MESSAGES.UPLOAD_FAILED;
        setError(errorMessage);

        if (options.onError) {
          options.onError(errorMessage);
        }

        return false;
      }
    },
    [options, pollStatus]
  );

  /**
   * Cancel ongoing transcription
   */
  const cancelTranscription = useCallback(() => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setIsProcessing(false);
    setStatus(null);
    setProgress(0);

    if (options.onTranscriptionCancel) {
      options.onTranscriptionCancel();
    }

    debugLog('Transcription cancelled');
  }, [options]);

  /**
   * Reset transcription state
   */
  const resetTranscription = useCallback(() => {
    cancelTranscription();

    setJobId(null);
    setTranscript('');
    setError(null);

    if (options.onTranscriptionReset) {
      options.onTranscriptionReset();
    }

    debugLog('Transcription state reset');
  }, [cancelTranscription, options]);

  /**
   * Retry transcription with same parameters
   */
  const retryTranscription = useCallback(
    (audioFile, language) => {
      debugLog('Retrying transcription');
      return startTranscription(audioFile, language);
    },
    [startTranscription]
  );

  // Cleanup on unmount
  useEffect(
    () => () => {
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    },
    []
  );

  return {
    // State
    jobId,
    status,
    progress,
    transcript,
    isProcessing,
    error,

    // Methods
    startTranscription,
    cancelTranscription,
    resetTranscription,
    retryTranscription,

    // Computed properties
    isQueued: status === STATUS_TYPES.QUEUED,
    isRunning: status === STATUS_TYPES.PROCESSING,
    isCompleted: status === STATUS_TYPES.COMPLETED,
    isFailed: status === STATUS_TYPES.FAILED,
    hasTranscript: !!transcript,
    canRetry: status === STATUS_TYPES.FAILED || error,
  };
};

export default useTranscription;
