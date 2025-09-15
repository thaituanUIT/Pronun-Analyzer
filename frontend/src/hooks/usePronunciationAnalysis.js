import { useState, useCallback, useRef, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { ttsService } from '../services/ttsService';
import { STATUS_TYPES, DEFAULT_VALUES, ERROR_MESSAGES } from '../constants';
import { debugLog } from '../utils';

/**
 * Custom hook for pronunciation analysis functionality
 * @param {Object} options - Configuration options
 * @returns {Object} Pronunciation analysis state and methods
 */
export const usePronunciationAnalysis = (options = {}) => {
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  const pollingRef = useRef(null);

  /**
   * Poll for pronunciation analysis status
   */
  const pollPronunciationStatus = useCallback(
    async currentJobId => {
      if (!currentJobId) return;

      try {
        debugLog('Polling pronunciation status for job:', currentJobId);

        const response = await apiService.getPronunciationStatus(currentJobId);

        if (response.error) {
          throw new Error(response.error.message);
        }

        const jobStatus = response.data;

        setStatus(jobStatus.status);

        if (jobStatus.analysis) {
          setAnalysis(jobStatus.analysis);
        }

        if (jobStatus.status === STATUS_TYPES.COMPLETED) {
          setIsAnalyzing(false);

          if (options.onAnalysisComplete) {
            options.onAnalysisComplete(jobStatus.analysis);
          }

          debugLog('Pronunciation analysis completed successfully');
          return;
        }

        if (jobStatus.status === STATUS_TYPES.FAILED) {
          setIsAnalyzing(false);
          const errorMessage =
            jobStatus.error || ERROR_MESSAGES.PRONUNCIATION_FAILED;
          setError(errorMessage);

          if (options.onError) {
            options.onError(errorMessage);
          }

          debugLog('Pronunciation analysis failed:', errorMessage);
          return;
        }

        if (
          jobStatus.status === STATUS_TYPES.PROCESSING ||
          jobStatus.status === STATUS_TYPES.QUEUED
        ) {
          // Continue polling
          pollingRef.current = setTimeout(() => {
            pollPronunciationStatus(currentJobId);
          }, options.pollingInterval || DEFAULT_VALUES.pollingInterval);
        }
      } catch (error) {
        console.error('Pronunciation status check error:', error);
        setIsAnalyzing(false);
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
   * Start pronunciation analysis
   */
  const startAnalysis = useCallback(
    async (audioFile, referenceText, language = DEFAULT_VALUES.language) => {
      if (!audioFile) {
        const errorMessage = ERROR_MESSAGES.NO_AUDIO_FILE;
        setError(errorMessage);
        if (options.onError) options.onError(errorMessage);
        return false;
      }

      if (!referenceText?.trim()) {
        const errorMessage = ERROR_MESSAGES.NO_REFERENCE_TEXT;
        setError(errorMessage);
        if (options.onError) options.onError(errorMessage);
        return false;
      }

      // Reset state
      setJobId(null);
      setStatus(null);
      setAnalysis(null);
      setError(null);
      setIsAnalyzing(true);

      // Cancel any ongoing polling
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
        pollingRef.current = null;
      }

      try {
        debugLog('Starting pronunciation analysis:', {
          fileName: audioFile.name,
          fileSize: audioFile.size,
          referenceText,
          language,
        });

        const response = await apiService.analyzePronunciation(
          audioFile,
          referenceText,
          language
        );

        if (response.error) {
          throw new Error(response.error.message);
        }

        const newJobId = response.data.job_id;
        setJobId(newJobId);

        if (options.onAnalysisStart) {
          options.onAnalysisStart(newJobId);
        }

        // Start polling for status
        pollPronunciationStatus(newJobId);

        debugLog('Pronunciation analysis started with job ID:', newJobId);
        return true;
      } catch (error) {
        console.error('Pronunciation analysis start error:', error);
        setIsAnalyzing(false);
        const errorMessage =
          error.message || ERROR_MESSAGES.PRONUNCIATION_FAILED;
        setError(errorMessage);

        if (options.onError) {
          options.onError(errorMessage);
        }

        return false;
      }
    },
    [options, pollPronunciationStatus]
  );

  /**
   * Play pronunciation for a specific word
   */
  const playWordPronunciation = useCallback(
    async (word, language = 'en') => {
      try {
        debugLog('Playing pronunciation for word:', word);

        if (options.onPronunciationStart) {
          options.onPronunciationStart(word);
        }

        await ttsService.playPronunciation(word, language, {
          volume: options.playbackVolume,
        });

        if (options.onPronunciationComplete) {
          options.onPronunciationComplete(word);
        }

        return true;
      } catch (error) {
        console.error('Pronunciation playback error:', error);
        const errorMessage =
          error.message || ERROR_MESSAGES.AUDIO_PLAYBACK_FAILED;
        setError(errorMessage);

        if (options.onError) {
          options.onError(errorMessage);
        }

        return false;
      }
    },
    [options]
  );

  /**
   * Preload pronunciations for mispronounced words
   */
  const preloadMispronunciations = useCallback(
    async (language = 'en') => {
      if (!analysis?.pronunciation_errors) return false;

      try {
        const mispronuncedWords = analysis.pronunciation_errors.map(
          error => error.word
        );
        await ttsService.preloadPronunciations(mispronuncedWords, language);

        debugLog(
          'Preloaded pronunciations for mispronounced words:',
          mispronuncedWords
        );
        return true;
      } catch (error) {
        console.error('Failed to preload pronunciations:', error);
        return false;
      }
    },
    [analysis]
  );

  /**
   * Cancel ongoing analysis
   */
  const cancelAnalysis = useCallback(() => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }

    setIsAnalyzing(false);
    setStatus(null);

    if (options.onAnalysisCancel) {
      options.onAnalysisCancel();
    }

    debugLog('Pronunciation analysis cancelled');
  }, [options]);

  /**
   * Reset analysis state
   */
  const resetAnalysis = useCallback(() => {
    cancelAnalysis();

    setJobId(null);
    setAnalysis(null);
    setError(null);

    if (options.onAnalysisReset) {
      options.onAnalysisReset();
    }

    debugLog('Pronunciation analysis state reset');
  }, [cancelAnalysis, options]);

  /**
   * Retry analysis with same parameters
   */
  const retryAnalysis = useCallback(
    (audioFile, referenceText, language) => {
      debugLog('Retrying pronunciation analysis');
      return startAnalysis(audioFile, referenceText, language);
    },
    [startAnalysis]
  );

  /**
   * Get analysis summary
   */
  const getAnalysisSummary = useCallback(() => {
    if (!analysis) return null;

    return {
      overallScore: analysis.overall_score,
      accuracyScore: analysis.accuracy_score,
      fluencyScore: analysis.fluency_score,
      wordsAnalyzed: analysis.words_analyzed,
      totalErrors: analysis.total_errors,
      hasErrors: analysis.pronunciation_errors?.length > 0,
      errorCount: analysis.pronunciation_errors?.length || 0,
      transcript: analysis.transcript,
      phoneticTranscript: analysis.phonetic_transcript,
    };
  }, [analysis]);

  /**
   * Get mispronounced words
   */
  const getMispronunciations = useCallback(() => {
    if (!analysis?.pronunciation_errors) return [];

    return analysis.pronunciation_errors.map(error => ({
      word: error.word,
      errorType: error.error_type,
      confidence: error.confidence,
      expected: error.expected_pronunciation,
      actual: error.actual_pronunciation,
      suggestion: error.suggestion,
    }));
  }, [analysis]);

  // Cleanup on unmount
  useEffect(
    () => () => {
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
      }
    },
    []
  );

  return {
    // State
    jobId,
    status,
    analysis,
    isAnalyzing,
    error,

    // Methods
    startAnalysis,
    cancelAnalysis,
    resetAnalysis,
    retryAnalysis,
    playWordPronunciation,
    preloadMispronunciations,

    // Computed properties
    isQueued: status === STATUS_TYPES.QUEUED,
    isRunning: status === STATUS_TYPES.PROCESSING,
    isCompleted: status === STATUS_TYPES.COMPLETED,
    isFailed: status === STATUS_TYPES.FAILED,
    hasAnalysis: !!analysis,
    canRetry: status === STATUS_TYPES.FAILED || error,

    // Helper methods
    getAnalysisSummary,
    getMispronunciations,
  };
};

export default usePronunciationAnalysis;
