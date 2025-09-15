import React from 'react';
import { ttsService } from '../../services';

function ErrorCard({ error, language }) {
  const getErrorTypeColor = errorType => {
    const colors = {
      substitution: '#e74c3c',
      deletion: '#e67e22',
      insertion: '#f39c12',
      errors: '#8e44ad',
      stress: '#9b59b6',
    };
    return colors[errorType] || '#95a5a6';
  };

  const handlePlayPronunciation = () => {
    ttsService.playCorrectPronunciation(error.word, language);
  };

  return (
    <div className="error-card">
      <div className="error-header">
        <span
          className="error-word clickable-word"
          onClick={handlePlayPronunciation}
          title="Click to hear correct pronunciation"
        >
          {error.word} 🔊
        </span>
        <span
          className="error-type"
          style={{ backgroundColor: getErrorTypeColor(error.error_type) }}
        >
          {error.error_type}
        </span>
        <span className="error-confidence">
          {Math.round(error.confidence * 100)}% confidence
        </span>
      </div>
      <div className="error-details">
        <p>
          <strong>Expected:</strong> {error.expected_pronunciation}
        </p>
        <p>
          <strong>You said:</strong> {error.actual_pronunciation}
        </p>
        <p>
          <strong>Tip:</strong> {error.suggestion}
        </p>
      </div>
    </div>
  );
}

export default ErrorCard;
