import React from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '../../contexts';
import './ThemeToggle.css';

const ThemeToggle = ({ 
  compact = false, 
  showLabel = true, 
  className = '',
  size = 'medium' 
}) => {
  const { currentTheme, toggleTheme, isDark } = useTheme();

  const toggleClass = `theme-toggle ${compact ? 'compact' : ''} ${size} ${className}`;

  return (
    <div className={toggleClass}>
      {showLabel && !compact && (
        <span className="theme-toggle-label">
          Theme:
        </span>
      )}
      
      <button
        type="button"
        className={`theme-toggle-button ${currentTheme}`}
        onClick={toggleTheme}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
        title={`Current: ${currentTheme} theme`}
      >
        <div className="theme-toggle-track">
          <div className="theme-toggle-thumb">
            <span className="theme-icon">
              {isDark ? '🌙' : '☀️'}
            </span>
          </div>
        </div>
        
        {showLabel && compact && (
          <span className="theme-toggle-text">
            {isDark ? 'Dark' : 'Light'}
          </span>
        )}
      </button>
      
      {showLabel && !compact && (
        <span className="theme-toggle-current">
          {isDark ? 'Dark Mode' : 'Light Mode'}
        </span>
      )}
    </div>
  );
};

ThemeToggle.propTypes = {
  compact: PropTypes.bool,
  showLabel: PropTypes.bool,
  className: PropTypes.string,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
};

export default ThemeToggle;
