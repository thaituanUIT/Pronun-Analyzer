import React from 'react';
import { ttsService } from '../../services';
import { getScoreColor } from '../../utils';
import './PronunciationResults.css';

function PronunciationResults({ analysis, language }) {
  if (!analysis) return null;

  const handleWordClick = (word) => {
    ttsService.playCorrectPronunciation(word, language);
  };

  const renderErrorWords = () => {
    if (!analysis.pronunciation_errors || analysis.pronunciation_errors.length === 0) {
      return (
        <div className="no-errors">
          <h4>Excellent Pronunciation!</h4>
          <p>No significant pronunciation errors detected. Keep up the great work!</p>
        </div>
      );
    }

    return (
      <div className="pronunciation-errors">
        <h4>Areas for Improvement</h4>
        <div className="error-words-container">
          {analysis.pronunciation_errors.map((error, index) => (
            <div 
              key={index} 
              className="error-word-box"
              onClick={() => handleWordClick(error.word)}
              title={`Click to hear correct pronunciation of "${error.word}"`}
            >
              <div className="error-word">
                {error.word} 🔊
              </div>
              <div className="error-type-badge" data-type={error.error_type}>
                {error.error_type}
              </div>
              <div className="error-details">
                <div><strong>Expected:</strong> {error.expected_pronunciation}</div>
                <div><strong>You said:</strong> {error.actual_pronunciation}</div>
                <div className="error-tip">{error.suggestion}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="pronunciation-results">
      <h3>Pronunciation Analysis Results</h3>

      {/* Horizontal Score Overview */}
      <div className="score-overview-horizontal">
        <div className="score-card-horizontal">
          <div className="score-label">Overall Score</div>
          <div 
            className="score-value-large" 
            style={{ color: getScoreColor(analysis.overall_score) }}
          >
            {Math.round(analysis.overall_score || 0)}%
          </div>
        </div>
        <div className="score-card-horizontal">
          <div className="score-label">Accuracy</div>
          <div 
            className="score-value-large" 
            style={{ color: getScoreColor(analysis.accuracy_score) }}
          >
            {Math.round(analysis.accuracy_score || 0)}%
          </div>
        </div>
        <div className="score-card-horizontal">
          <div className="score-label">Fluency</div>
          <div 
            className="score-value-large" 
            style={{ color: getScoreColor(analysis.fluency_score) }}
          >
            {Math.round(analysis.fluency_score || 0)}%
          </div>
        </div>
      </div>

      {/* Analysis Summary */}
      <div className="analysis-summary">
        <div className="summary-item">
          <strong>What you said:</strong> <span className="transcript">"{analysis.transcript}"</span>
        </div>
        <div className="summary-stats">
          <span className="stat-item">{analysis.words_analyzed || 0} words analyzed</span>
          <span className="stat-item">{analysis.total_errors || 0} errors found</span>
        </div>
      </div>

      {/* Error Words */}
      {renderErrorWords()}

      {/* Phonetic Transcript */}
      {analysis.phonetic_transcript && (
        <div className="phonetic-section">
          <h4>Phonetic Transcript</h4>
          <div className="phonetic-transcript">
            {analysis.phonetic_transcript}
          </div>
        </div>
      )}
    </div>
  );
}

export default PronunciationResults;
