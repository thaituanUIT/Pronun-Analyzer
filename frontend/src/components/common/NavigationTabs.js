import React from 'react';
import PropTypes from 'prop-types';
import { TAB_TYPES } from '../../constants';

/**
 * Navigation tabs component
 */
function NavigationTabs({
  activeTab,
  onTabChange,
  tabs = null, // Allow custom tabs to be passed
  disabled = false,
  className = '',
}) {
  // Use custom tabs if provided, otherwise use default tabs
  const defaultTabs = [
    {
      id: TAB_TYPES.RECORDER,
      label: 'Microphone Recording & Pronunciation',
    },
    {
      id: TAB_TYPES.UPLOAD,
      label: 'File Upload & Transcription',
    },
  ];

  const tabsToRender = tabs || defaultTabs;

  return (
    <div className={`navigation-bar ${className}`}>
      {tabsToRender.map(tab => (
        <button
          key={tab.id}
          className={`nav-button ${activeTab === tab.id ? 'nav-active' : ''}`}
          onClick={() => onTabChange(tab.id)}
          disabled={disabled || tab.disabled}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

NavigationTabs.propTypes = {
  activeTab: PropTypes.string.isRequired,
  onTabChange: PropTypes.func.isRequired,
  tabs: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      disabled: PropTypes.bool,
    })
  ),
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default NavigationTabs;
