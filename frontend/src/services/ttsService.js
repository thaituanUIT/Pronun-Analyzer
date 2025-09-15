import { apiService } from './apiService';
import { audioService } from './audioService';
import { DEFAULT_VALUES } from '../constants';
import { debugLog } from '../utils';

/**
 * Text-to-Speech service for pronunciation assistance
 */
export const ttsService = {
  /**
   * Play pronunciation for a word or phrase
   * @param {string} text - Text to pronounce
   * @param {string} language - Language code
   * @param {Object} options - Playback options
   * @returns {Promise<boolean>} Success status
   */
  playPronunciation: async (text, language = 'en', options = {}) => {
    try {
      debugLog('Generating pronunciation for:', { text, language });

      // Call the TTS API
      const response = await apiService.synthesizeSpeech(text, language);

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Get the audio blob from response
      const audioBlob = response.data;

      // Play the audio
      await audioService.playAudioBlob(audioBlob, {
        volume: options.volume || DEFAULT_VALUES.audioVolume,
      });

      debugLog('Pronunciation played successfully for:', text);
      return true;
    } catch (error) {
      console.error('TTS Error:', error);
      throw error;
    }
  },

  /**
   * Generate and download pronunciation audio
   * @param {string} text - Text to pronounce
   * @param {string} language - Language code
   * @param {string} filename - Optional filename for download
   * @returns {Promise<boolean>} Success status
   */
  downloadPronunciation: async (text, language = 'en', filename = null) => {
    try {
      debugLog('Downloading pronunciation for:', { text, language });

      const response = await apiService.synthesizeSpeech(text, language);

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Create download link
      const audioBlob = response.data;
      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `pronunciation_${text.replace(/\s+/g, '_')}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      debugLog('Pronunciation downloaded successfully for:', text);
      return true;
    } catch (error) {
      console.error('TTS Download Error:', error);
      throw error;
    }
  },

  /**
   * Cache pronunciation audio for repeated use
   * @param {string} text - Text to cache
   * @param {string} language - Language code
   * @returns {Promise<string>} Audio URL for cached audio
   */
  cachePronunciation: async (text, language = 'en') => {
    const cacheKey = `tts_${language}_${text}`;

    // Check if already cached
    const cached = ttsService._cache.get(cacheKey);
    if (cached) {
      debugLog('Using cached pronunciation for:', text);
      return cached;
    }

    try {
      const response = await apiService.synthesizeSpeech(text, language);

      if (response.error) {
        throw new Error(response.error.message);
      }

      const audioBlob = response.data;
      const audioUrl = URL.createObjectURL(audioBlob);

      // Cache the URL
      ttsService._cache.set(cacheKey, audioUrl);

      // Set up cleanup after 5 minutes
      setTimeout(() => {
        if (ttsService._cache.has(cacheKey)) {
          URL.revokeObjectURL(audioUrl);
          ttsService._cache.delete(cacheKey);
          debugLog('Cleaned up cached pronunciation for:', text);
        }
      }, 5 * 60 * 1000); // 5 minutes

      debugLog('Cached pronunciation for:', text);
      return audioUrl;
    } catch (error) {
      console.error('TTS Cache Error:', error);
      throw error;
    }
  },

  /**
   * Play cached pronunciation
   * @param {string} text - Text to pronounce
   * @param {string} language - Language code
   * @param {Object} options - Playback options
   * @returns {Promise<boolean>} Success status
   */
  playCachedPronunciation: async (text, language = 'en', options = {}) => {
    try {
      const audioUrl = await ttsService.cachePronunciation(text, language);
      const audio = audioService.createAudioElement(audioUrl, {
        volume: options.volume || DEFAULT_VALUES.audioVolume,
      });

      await audio.play();
      return true;
    } catch (error) {
      console.error('Cached TTS Playback Error:', error);
      throw error;
    }
  },

  /**
   * Preload pronunciations for a list of words
   * @param {string[]} words - Array of words to preload
   * @param {string} language - Language code
   * @returns {Promise<Object>} Results of preloading
   */
  preloadPronunciations: async (words, language = 'en') => {
    const results = {
      success: [],
      failed: [],
    };

    for (const word of words) {
      try {
        await ttsService.cachePronunciation(word, language);
        results.success.push(word);
        debugLog('Preloaded pronunciation for:', word);
      } catch (error) {
        console.error(`Failed to preload pronunciation for "${word}":`, error);
        results.failed.push({ word, error: error.message });
      }
    }

    debugLog('Preloading complete:', results);
    return results;
  },

  /**
   * Clear all cached pronunciations
   */
  clearCache: () => {
    ttsService._cache.forEach((url, key) => {
      URL.revokeObjectURL(url);
      debugLog('Cleaned up cached URL for:', key);
    });
    ttsService._cache.clear();
    debugLog('TTS cache cleared');
  },

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats: () => ({
    size: ttsService._cache.size,
    keys: Array.from(ttsService._cache.keys()),
  }),

  /**
   * Check if TTS is available
   * @returns {Promise<boolean>} Availability status
   */
  checkAvailability: async () => {
    try {
      const healthCheck = await apiService.checkHealth();
      return !healthCheck.error;
    } catch (error) {
      console.error('TTS availability check failed:', error);
      return false;
    }
  },

  /**
   * Play correct pronunciation for a word (compatibility method for ErrorCard)
   * @param {string} word - The word to pronounce
   * @param {string} language - Language code
   * @returns {Promise<boolean>} Success status
   */
  playCorrectPronunciation: async (word, language = 'en') => {
    try {
      // First try the main TTS service
      return await ttsService.playPronunciation(word, language);
    } catch (error) {
      console.error('Error playing correct pronunciation:', error);
      
      // Try to use browser's built-in speech synthesis as fallback
      try {
        if ('speechSynthesis' in window) {
          return await ttsService.playWithBrowserTTS(word, language);
        }
      } catch (fallbackError) {
        console.error('Browser TTS fallback also failed:', fallbackError);
      }
      
      // Show user-friendly error message
      if (error.message.includes('permissions') || error.message.includes('blocked')) {
        alert('Please click anywhere on the page first to enable audio playback, then try again.');
      } else {
        console.warn(`Unable to play pronunciation for "${word}". Please check your internet connection.`);
      }
      
      return false;
    }
  },

  /**
   * Fallback TTS using browser's built-in speech synthesis
   * @param {string} text - Text to speak
   * @param {string} language - Language code
   * @returns {Promise<boolean>} Success status
   */
  playWithBrowserTTS: async (text, language = 'en') => {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Browser speech synthesis not supported'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = 0.8;
      utterance.pitch = 1;
      utterance.volume = 0.8;

      utterance.onend = () => {
        debugLog('Browser TTS playback completed for:', text);
        resolve(true);
      };

      utterance.onerror = (event) => {
        console.error('Browser TTS error:', event);
        reject(new Error('Browser TTS playback failed'));
      };

      speechSynthesis.speak(utterance);
      debugLog('Browser TTS playback started for:', text);
    });
  },

  // Private cache storage
  _cache: new Map(),
};

// Cleanup cache on page unload
window.addEventListener('beforeunload', () => {
  ttsService.clearCache();
});

export default ttsService;
