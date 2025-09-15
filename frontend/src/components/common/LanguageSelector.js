import React from 'react';
import PropTypes from 'prop-types';
import { LANGUAGE_OPTIONS } from '../../constants';
import './LanguageSelector.css';

/**
 * Language selector component
 */
function LanguageSelector({
  value,
  onChange,
  disabled = false,
  id = 'language-selector',
  label = 'Language:',
  testId = 'language-select',
  className = '',
  inline = false,
}) {
  const containerClass = inline ? 'language-selector-inline' : 'language-selector';
  const selectClass = inline ? 'compact-select' : '';
  
  return (
    <div className={`${containerClass} ${className}`}>
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        data-testid={testId}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className={selectClass}
      >
        {LANGUAGE_OPTIONS.map(option => (
          <option key={option.code} value={option.code}>
            {option.flag} {option.name}
          </option>
        ))}
      </select>
    </div>
  );
}

LanguageSelector.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  id: PropTypes.string,
  label: PropTypes.string,
  testId: PropTypes.string,
  className: PropTypes.string,
  inline: PropTypes.bool,
};

export default LanguageSelector;
