import { AUDIO_CONFIG, DEFAULT_VALUES } from '../constants';
import { getSupportedMimeType, createFileFromBlob, debugLog } from '../utils';

/**
 * Audio service for handling recording, playback, and audio file operations
 */
export const audioService = {
  /**
   * Get user media stream for recording
   * @param {Object} constraints - Audio constraints
   * @returns {Promise<MediaStream>} Media stream
   */
  getUserMediaStream: async (constraints = AUDIO_CONFIG.recording) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: constraints,
      });
      debugLog('Media stream acquired successfully');
      return { stream, error: null };
    } catch (error) {
      console.error('Error accessing microphone:', error);
      return {
        stream: null,
        error: 'Could not access microphone. Please check permissions.',
      };
    }
  },

  /**
   * Create media recorder with optimal settings
   * @param {MediaStream} stream - Media stream
   * @returns {Object} Media recorder and MIME type
   */
  createMediaRecorder: stream => {
    const mimeType = getSupportedMimeType(
      AUDIO_CONFIG.supportedMimeTypes,
      AUDIO_CONFIG.fallbackMimeType
    );

    try {
      const recorder = new MediaRecorder(stream, { mimeType });
      debugLog('MediaRecorder created with MIME type:', mimeType);

      return {
        recorder,
        mimeType,
        error: null,
      };
    } catch (error) {
      console.error('Error creating MediaRecorder:', error);
      return {
        recorder: null,
        mimeType: null,
        error: 'Failed to create media recorder',
      };
    }
  },

  /**
   * Start recording with the provided recorder
   * @param {MediaRecorder} recorder - Media recorder instance
   * @param {Function} onDataAvailable - Callback for data chunks
   * @param {Function} onStop - Callback when recording stops
   * @returns {boolean} Success status
   */
  startRecording: (recorder, onDataAvailable, onStop) => {
    try {
      const chunks = [];

      recorder.ondataavailable = event => {
        if (event.data.size > 0) {
          chunks.push(event.data);
          if (onDataAvailable) onDataAvailable(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType });
        debugLog('Recording completed:', {
          size: blob.size,
          type: blob.type,
        });
        if (onStop) onStop(blob);
      };

      recorder.onerror = event => {
        console.error('Recording error:', event.error);
      };

      recorder.start(AUDIO_CONFIG.chunkInterval);
      debugLog('Recording started');
      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      return false;
    }
  },

  /**
   * Stop recording
   * @param {MediaRecorder} recorder - Media recorder instance
   * @returns {boolean} Success status
   */
  stopRecording: recorder => {
    try {
      if (recorder && recorder.state === 'recording') {
        recorder.stop();
        debugLog('Recording stopped');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      return false;
    }
  },

  /**
   * Stop media stream and release resources
   * @param {MediaStream} stream - Media stream to stop
   */
  stopMediaStream: stream => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        debugLog('Media track stopped:', track.kind);
      });
    }
  },

  /**
   * Play audio from blob
   * @param {Blob} audioBlob - Audio blob to play
   * @param {Object} options - Playback options
   * @returns {Promise<boolean>} Success status
   */
  playAudioBlob: async (audioBlob, options = {}) => {
    try {
      if (!audioBlob || !(audioBlob instanceof Blob)) {
        throw new Error('Invalid audio blob provided');
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      // Set audio properties with fallback values
      audio.preload = 'auto';
      audio.volume = Math.min(Math.max(options.volume || 0.8, 0), 1); // Clamp volume between 0 and 1

      // Promise-based audio playback
      return new Promise((resolve, reject) => {
        const cleanup = () => {
          URL.revokeObjectURL(audioUrl);
        };

        audio.addEventListener('ended', () => {
          cleanup();
          debugLog('Audio playback completed and URL cleaned up');
          resolve(true);
        });

        audio.addEventListener('error', (event) => {
          cleanup();
          console.error('Audio playback error:', event);
          reject(new Error('Audio playback failed'));
        });

        audio.addEventListener('loadstart', () => {
          debugLog('Audio loading started');
        });

        audio.addEventListener('canplay', () => {
          debugLog('Audio can start playing');
        });

        // Start playback
        audio.play()
          .then(() => {
            debugLog('Audio playback started successfully');
          })
          .catch((error) => {
            cleanup();
            console.error('Failed to start audio playback:', error);
            
            if (error.name === 'NotAllowedError') {
              reject(new Error('Audio playback blocked. Please enable audio permissions or interact with the page first.'));
            } else if (error.name === 'NotSupportedError') {
              reject(new Error('Audio format not supported by this browser.'));
            } else {
              reject(new Error(`Failed to play audio: ${error.message}`));
            }
          });
      });
    } catch (error) {
      console.error('Failed to play audio blob:', error);
      throw error;
    }
  },

  /**
   * Convert blob to file with proper naming
   * @param {Blob} blob - Audio blob
   * @param {string} baseName - Base name for the file
   * @returns {File} File object
   */
  blobToFile: (blob, baseName = 'recording') =>
    createFileFromBlob(blob, baseName),

  /**
   * Validate audio file
   * @param {File} file - File to validate
   * @returns {Object} Validation result
   */
  validateAudioFile: file => {
    if (!file) {
      return { isValid: false, error: 'No file provided' };
    }

    // Check if it's an audio file
    if (!file.type.startsWith('audio/')) {
      return { isValid: false, error: 'File is not an audio file' };
    }

    // Check file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return { isValid: false, error: 'File is too large (max 100MB)' };
    }

    // Check for empty file
    if (file.size === 0) {
      return { isValid: false, error: 'File is empty' };
    }

    return { isValid: true, error: null };
  },

  /**
   * Get audio file information
   * @param {File} file - Audio file
   * @returns {Object} File information
   */
  getAudioFileInfo: file => ({
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
    sizeFormatted: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
  }),

  /**
   * Create audio element for playback control
   * @param {string} audioUrl - Audio URL
   * @param {Object} options - Audio element options
   * @returns {HTMLAudioElement} Audio element
   */
  createAudioElement: (audioUrl, options = {}) => {
    const audio = new Audio(audioUrl);
    audio.preload = options.preload || 'auto';
    audio.volume = options.volume || DEFAULT_VALUES.audioVolume;
    audio.loop = options.loop || false;
    audio.muted = options.muted || false;

    return audio;
  },

  /**
   * Check if browser supports audio recording
   * @returns {Object} Support information
   */
  checkRecordingSupport: () => {
    const hasGetUserMedia = !!(
      navigator.mediaDevices && navigator.mediaDevices.getUserMedia
    );
    const hasMediaRecorder = !!window.MediaRecorder;

    return {
      isSupported: hasGetUserMedia && hasMediaRecorder,
      hasGetUserMedia,
      hasMediaRecorder,
      supportedMimeTypes: AUDIO_CONFIG.supportedMimeTypes.filter(
        type =>
          MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)
      ),
    };
  },
};

export default audioService;
