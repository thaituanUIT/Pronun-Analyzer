import React from 'react';
import PropTypes from 'prop-types';
import { useSettings } from '../../contexts';
import { LANGUAGE_OPTIONS } from '../../constants';
import './LanguageSettings.css';

const LanguageSettings = ({ 
  compact = false, 
  showLabel = true, 
  className = '',
  onChange 
}) => {
  const { language, updateSetting } = useSettings();

  const handleLanguageChange = (newLanguage) => {
    updateSetting('language', newLanguage);
    if (onChange) {
      onChange(newLanguage);
    }
  };

  const containerClass = `language-settings ${compact ? 'compact' : ''} ${className}`;

  return (
    <div className={containerClass}>
      {showLabel && (
        <label htmlFor="settings-language-select" className="language-settings-label">
          Interface Language:
        </label>
      )}
      
      <div className="language-settings-control">
        <select
          id="settings-language-select"
          value={language}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className="language-settings-select"
          aria-label="Select interface language"
        >
          {LANGUAGE_OPTIONS.map(option => (
            <option key={option.code} value={option.code}>
              {option.flag} {option.name}
            </option>
          ))}
        </select>
        
        <div className="language-settings-icon">
          🌐
        </div>
      </div>
      
    </div>
  );
};

LanguageSettings.propTypes = {
  compact: PropTypes.bool,
  showLabel: PropTypes.bool,
  className: PropTypes.string,
  onChange: PropTypes.func,
};

export default LanguageSettings;
