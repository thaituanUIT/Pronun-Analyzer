import React from 'react';
import PropTypes from 'prop-types';
import './TopNavigation.css';

const TopNavigation = ({ activeTab, onTabChange }) => {
  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'recorder', label: 'Recording' },
    { id: 'upload', label: 'Upload' },
    { id: 'settings', label: 'Settings' },
    { id: 'about', label: 'About' }
  ];

  return (
    <nav className="top-nav">
      <div className="nav-container">
        <div className="nav-brand">
          <h2>Speech Analytics</h2>
        </div>
        <div className="nav-links">
          {navItems.map(item => (
            <button
              key={item.id}
              type="button"
              className={`nav-link ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => onTabChange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};

TopNavigation.propTypes = {
  activeTab: PropTypes.string.isRequired,
  onTabChange: PropTypes.func.isRequired
};

export default TopNavigation;
