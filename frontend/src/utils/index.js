import { SCORE_COLORS, PRONUNCIATION_ERROR_COLORS } from '../constants';

/**
 * Format time from seconds to MM:SS format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
export const formatTime = seconds => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}`;
};

/**
 * Get color based on pronunciation score
 * @param {number} score - Score from 0-100
 * @returns {string} Color hex code
 */
export const getScoreColor = score => {
  // Ensure score is a number and handle edge cases
  const numericScore = typeof score === 'string' ? parseFloat(score) : score;
  
  if (isNaN(numericScore) || numericScore < 0) {
    return SCORE_COLORS.POOR.color;
  }
  
  // Cap score at 100
  const cappedScore = Math.min(numericScore, 100);
  
  const scoreThresholds = Object.values(SCORE_COLORS).sort(
    (a, b) => b.threshold - a.threshold
  );

  for (const threshold of scoreThresholds) {
    if (cappedScore >= threshold.threshold) {
      return threshold.color;
    }
  }

  return SCORE_COLORS.POOR.color;
};

/**
 * Get color for pronunciation error type
 * @param {string} errorType - Type of pronunciation error
 * @returns {string} Color hex code
 */
export const getErrorTypeColor = errorType =>
  PRONUNCIATION_ERROR_COLORS[errorType] || '#95a5a6';

/**
 * Create file from blob with proper extension
 * @param {Blob} blob - The blob to convert
 * @param {string} baseName - Base name for the file
 * @returns {File} File object with proper extension
 */
export const createFileFromBlob = (blob, baseName = 'recording') => {
  let fileExtension = '.wav'; // Default fallback
  let mimeType = blob.type || 'audio/wav';
  
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
  
  const fileName = `${baseName}${fileExtension}`;
  return new File([blob], fileName, {
    type: mimeType,
  });
};

/**
 * Format file size in human readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string
 */
export const formatFileSize = bytes => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
};

/**
 * Download text as file
 * @param {string} text - Text content to download
 * @param {string} filename - Name of the file
 * @param {string} mimeType - MIME type of the file
 */
export const downloadTextAsFile = (
  text,
  filename = 'download.txt',
  mimeType = 'text/plain'
) => {
  const element = document.createElement('a');
  const file = new Blob([text], { type: mimeType });
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export const copyToClipboard = async text => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

/**
 * Check if MediaRecorder supports a MIME type
 * @param {string[]} mimeTypes - Array of MIME types to check
 * @returns {string} First supported MIME type or fallback
 */
export const getSupportedMimeType = (mimeTypes, fallback = 'audio/webm') => {
  for (const type of mimeTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  console.warn('No preferred MIME type supported, using fallback:', fallback);
  return fallback;
};

/**
 * Debounce function to limit function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Validate audio file type
 * @param {File} file - File to validate
 * @param {string[]} allowedTypes - Array of allowed MIME types
 * @returns {boolean} Whether file is valid
 */
export const isValidAudioFile = (file, allowedTypes = []) => {
  if (!file) return false;

  const audioTypes = [
    'audio/mp3',
    'audio/mpeg',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/m4a',
    'audio/mp4',
    'audio/flac',
    'audio/ogg',
    'audio/webm',
    ...allowedTypes,
  ];

  return audioTypes.some(type => file.type.includes(type.split('/')[1]));
};

/**
 * Generate unique ID
 * @returns {string} Unique identifier
 */
export const generateId = () =>
  Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

/**
 * Safely parse JSON
 * @param {string} jsonString - JSON string to parse
 * @param {*} fallback - Fallback value if parsing fails
 * @returns {*} Parsed object or fallback
 */
export const safeJsonParse = (jsonString, fallback = null) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    return fallback;
  }
};

/**
 * Check if running in development mode
 * @returns {boolean} Whether in development mode
 */
export const isDevelopment = () => process.env.NODE_ENV === 'development';

/**
 * Log debug information (only in development)
 * @param {string} message - Debug message
 * @param {*} data - Additional data to log
 */
export const debugLog = (message, data = null) => {
  if (isDevelopment()) {
    console.log(`[DEBUG] ${message}`, data || '');
  }
};

/**
 * Detect if user is on mobile device
 * @returns {boolean} True if mobile device
 */
export const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

/**
 * Get user agent information for debugging
 * @returns {Object} User agent details
 */
export const getUserAgentInfo = () => {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    isMobile: isMobileDevice(),
    hasMediaDevices: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    isHTTPS: window.location.protocol === 'https:',
  };
};
