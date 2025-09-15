import React from 'react';

function ScoreCard({ title, score, className = '' }) {
  const getScoreColor = score => {
    if (score >= 90) return '#27ae60';
    if (score >= 80) return '#f39c12';
    if (score >= 70) return '#e67e22';
    return '#e74c3c';
  };

  return (
    <div className={`score-card ${className}`}>
      <div className="score-title">{title}</div>
      <div className="score-value" style={{ color: getScoreColor(score) }}>
        {score}%
      </div>
    </div>
  );
}

export default ScoreCard;
