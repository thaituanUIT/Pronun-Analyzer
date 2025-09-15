import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS, DEFAULT_VALUES } from '../constants';
import { debugLog } from '../utils';

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 seconds for mobile connections
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for debugging
apiClient.interceptors.request.use(
  config => {
    debugLog('API Request:', {
      method: config.method,
      url: config.url,
      baseURL: config.baseURL,
    });
    return config;
  },
  error => {
    debugLog('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for debugging and error handling
apiClient.interceptors.response.use(
  response => {
    debugLog('API Response:', {
      status: response.status,
      url: response.config.url,
    });
    return response;
  },
  error => {
    debugLog('API Response Error:', {
      status: error.response?.status,
      message: error.message,
      url: error.config?.url,
    });
    return Promise.reject(error);
  }
);

/**
 * Generic API call handler
 * @param {Function} apiCall - Axios API call function
 * @returns {Object} Response data or error
 */
const handleApiCall = async apiCall => {
  try {
    const response = await apiCall();
    return { data: response.data, error: null };
  } catch (error) {
    console.error('API Error:', error);

    const errorMessage = error.response?.data?.detail || error.message;
    const statusCode = error.response?.status;

    // Handle specific error codes
    let userMessage = errorMessage;

    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      userMessage = 'Request timed out. Please try again.';
    } else if (statusCode === 503) {
      userMessage =
        'Service temporarily unavailable. Please check your connection.';
    } else if (statusCode === 404) {
      userMessage = 'Service not available.';
    } else if (statusCode === 429) {
      userMessage = 'Too many requests. Please wait a moment and try again.';
    } else if (statusCode >= 500) {
      userMessage = 'Server error. Please try again later.';
    }

    return {
      data: null,
      error: {
        message: userMessage,
        originalError: error,
        statusCode,
      },
    };
  }
};

// API Functions
export const apiService = {
  /**
   * Upload audio file for transcription
   * @param {File} audioFile - Audio file to transcribe
   * @param {string} language - Language code
   * @returns {Promise<Object>} API response
   */
  transcribeAudio: async (audioFile, language = DEFAULT_VALUES.language) => {
    const formData = new FormData();
    
    // Ensure we have a proper File object with extension
    let fileToUpload = audioFile;
    
    // If it's a Blob without a name, convert it to a File with proper extension
    if (audioFile instanceof Blob && (!audioFile.name || audioFile.name === 'blob')) {
      let fileExtension = '.wav'; // Default fallback
      let mimeType = audioFile.type || 'audio/wav';
      
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
      fileToUpload = new File([audioFile], fileName, {
        type: mimeType,
      });
    }
    
    formData.append('file', fileToUpload);
    formData.append('language', language);

    return handleApiCall(() =>
      apiClient.post(API_ENDPOINTS.transcribe, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
    );
  },

  /**
   * Check transcription job status
   * @param {string} jobId - Job ID to check
   * @returns {Promise<Object>} API response
   */
  getTranscriptionStatus: async jobId =>
    handleApiCall(() => apiClient.get(`${API_ENDPOINTS.status}/${jobId}`)),

  /**
   * Analyze pronunciation
   * @param {File} audioFile - Audio file to analyze
   * @param {string} referenceText - Reference text for comparison
   * @param {string} language - Language code
   * @returns {Promise<Object>} API response
   */
  analyzePronunciation: async (
    audioFile,
    referenceText,
    language = DEFAULT_VALUES.language
  ) => {
    const formData = new FormData();
    
    // Ensure we have a proper File object with extension
    let fileToUpload = audioFile;
    
    // If it's a Blob without a name, convert it to a File with proper extension
    if (audioFile instanceof Blob && (!audioFile.name || audioFile.name === 'blob')) {
      let fileExtension = '.wav'; // Default fallback
      let mimeType = audioFile.type || 'audio/wav';
      
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
      fileToUpload = new File([audioFile], fileName, {
        type: mimeType,
      });
    }
    
    formData.append('file', fileToUpload);
    formData.append('reference_text', referenceText);
    formData.append('language', language);

    return handleApiCall(() =>
      apiClient.post(API_ENDPOINTS.analyzePronunciation, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
    );
  },

  /**
   * Check pronunciation analysis job status
   * @param {string} jobId - Job ID to check
   * @returns {Promise<Object>} API response
   */
  getPronunciationStatus: async jobId =>
    handleApiCall(() =>
      apiClient.get(`${API_ENDPOINTS.pronunciationStatus}/${jobId}`)
    ),

  /**
   * Synthesize speech for a word or phrase
   * @param {string} text - Text to synthesize
   * @param {string} language - Language code
   * @returns {Promise<Object>} API response with audio blob
   */
  synthesizeSpeech: async (text, language = 'en') => {
    const formData = new FormData();
    formData.append('text', text);
    formData.append('language', language);

    return handleApiCall(() =>
      apiClient.post(API_ENDPOINTS.synthesizeSpeech, formData, {
        responseType: 'blob',
        timeout: DEFAULT_VALUES.audioTimeout,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
    );
  },

  /**
   * Check API health
   * @returns {Promise<Object>} API response
   */
  checkHealth: async () =>
    handleApiCall(() => apiClient.get(API_ENDPOINTS.health)),

  /**
   * Start pronunciation analysis (convenience method)
   * @param {Blob} recordedBlob - Audio blob to analyze
   * @param {string} referenceText - Reference text for comparison
   * @param {string} language - Language code
   * @returns {Promise<string>} Job ID
   */
  startPronunciationAnalysis: async (
    recordedBlob,
    referenceText,
    language = DEFAULT_VALUES.language
  ) => {
    // Create a file from the recorded blob with proper extension
    const fileExtension = recordedBlob.type.includes('webm') ? '.webm' : '.wav';
    const recordedFile = new File([recordedBlob], `recording${fileExtension}`, {
      type: recordedBlob.type,
    });

    const response = await apiService.analyzePronunciation(
      recordedFile,
      referenceText,
      language
    );
    return response.data.job_id;
  },
};

export default apiService;
