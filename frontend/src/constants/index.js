// API Configuration
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://localhost:8000';

export const API_ENDPOINTS = {
  transcribe: '/transcribe',
  status: '/status',
  analyzePronunciation: '/analyze-pronunciation',
  pronunciationStatus: '/pronunciation-status',
  synthesizeSpeech: '/synthesize-speech',
  health: '/health',
};

// Default Values
export const DEFAULT_VALUES = {
  language: 'en',
  audioTimeout: 60000, // 60 seconds
  pollingInterval: 1000, // 1 second
  maxRetries: 30,
  audioVolume: 0.8, // 80% volume for TTS playback
};

// Audio Configuration
export const AUDIO_CONFIG = {
  sampleRate: 44100,
  channelCount: 1,
  audioBitsPerSecond: 128000,
  mimeTypes: [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/wav',
  ],
};

// Supported Audio Types
export const SUPPORTED_AUDIO_TYPES = [
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
];

// Score Color Configuration
export const SCORE_COLORS = {
  EXCELLENT: {
    threshold: 90,
    color: '#10b981', // green-500
    label: 'Excellent',
  },
  GOOD: {
    threshold: 80,
    color: '#3b82f6', // blue-500
    label: 'Good',
  },
  FAIR: {
    threshold: 70,
    color: '#f59e0b', // amber-500
    label: 'Fair',
  },
  NEEDS_IMPROVEMENT: {
    threshold: 60,
    color: '#f97316', // orange-500
    label: 'Needs Improvement',
  },
  POOR: {
    threshold: 0,
    color: '#ef4444', // red-500
    label: 'Poor',
  },
};

// Pronunciation Error Colors
export const PRONUNCIATION_ERROR_COLORS = {
  substitution: '#ef4444', // red-500
  insertion: '#f97316',    // orange-500
  deletion: '#eab308',     // yellow-500
  mispronunciation: '#ec4899', // pink-500
  default: '#6b7280',      // gray-500
};

// Status Types
export const STATUS_TYPES = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  PENDING: 'pending',
};

// Tab Types
export const TAB_TYPES = {
  HOME: 'home',
  RECORD: 'record',
  UPLOAD: 'upload',
  ABOUT: 'about',
};

// Language Options
export const LANGUAGE_OPTIONS = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
];

// Success Messages
export const SUCCESS_MESSAGES = {
  RECORDING_STARTED: 'Recording started successfully',
  RECORDING_STOPPED: 'Recording stopped',
  TRANSCRIPTION_COMPLETE: 'Transcription completed successfully',
  PRONUNCIATION_COMPLETE: 'Pronunciation analysis completed',
  FILE_UPLOADED: 'File uploaded successfully',
  AUDIO_PLAYING: 'Playing audio',
  AUDIO_PAUSED: 'Audio paused',
  TEXT_COPIED: 'Text copied to clipboard',
  DOWNLOAD_STARTED: 'Download started',
};

// Error Messages
export const ERROR_MESSAGES = {
  MIC_ACCESS_DENIED: 'Microphone access denied. Please allow microphone access.',
  MIC_NOT_FOUND: 'No microphone found. Please connect a microphone.',
  RECORDING_FAILED: 'Recording failed. Please try again.',
  TRANSCRIPTION_FAILED: 'Transcription failed. Please try again.',
  PRONUNCIATION_FAILED: 'Pronunciation analysis failed. Please try again.',
  FILE_TOO_LARGE: 'File is too large. Please upload a smaller file.',
  INVALID_FILE_TYPE: 'Invalid file type. Please upload an audio file.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UPLOAD_FAILED: 'File upload failed. Please try again.',
  PLAYBACK_FAILED: 'Audio playback failed.',
  COPY_FAILED: 'Failed to copy text to clipboard.',
  DOWNLOAD_FAILED: 'Download failed. Please try again.',
  GENERIC_ERROR: 'An unexpected error occurred. Please try again.',
};

// File Size Limits
export const FILE_LIMITS = {
  MAX_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_DURATION: 600, // 10 minutes in seconds
};

// UI Constants
export const UI_CONSTANTS = {
  DEBOUNCE_DELAY: 300,
  ANIMATION_DURATION: 200,
  TOAST_DURATION: 3000,
  POLLING_INTERVAL: 1000,
  MAX_RETRIES: 3,
};

// Recording States
export const RECORDING_STATES = {
  INACTIVE: 'inactive',
  RECORDING: 'recording',
  PAUSED: 'paused',
  STOPPED: 'stopped',
};

// Analysis Types
export const ANALYSIS_TYPES = {
  TRANSCRIPTION: 'transcription',
  PRONUNCIATION: 'pronunciation',
};
