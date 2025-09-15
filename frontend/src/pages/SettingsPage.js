import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useSettings } from '../contexts';
import { ThemeToggle, LanguageSettings } from '../components/settings';
import './SettingsPage.css';

const SettingsPage = ({ onLanguageChange }) => {
  const { 
    settings, 
    updateSetting, 
    resetSettings, 
    audioVolume, 
    autoSave, 
    showNotifications,
    compactMode 
  } = useSettings();
  
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleLanguageChange = (newLanguage) => {
    if (onLanguageChange) {
      onLanguageChange(newLanguage);
    }
  };

  const handleVolumeChange = (e) => {
    const volume = parseFloat(e.target.value);
    updateSetting('audioVolume', volume);
  };

  const handleToggleSetting = (key) => {
    updateSetting(key, !settings[key]);
  };

  const handleResetSettings = () => {
    if (showResetConfirm) {
      resetSettings();
      setShowResetConfirm(false);
    } else {
      setShowResetConfirm(true);
      // Auto-hide confirmation after 5 seconds
      setTimeout(() => setShowResetConfirm(false), 5000);
    }
  };

  return (
    <div className="settings-page">
      <div className="container">
        <div className="settings-header">
          <h1>Settings</h1>
          <p>Customize your speech analytics experience</p>
        </div>

        <div className="settings-sections">
          {/* Appearance Section */}
          <section className="settings-section">
            <div className="section-header">
              <h2>Appearance</h2>
              <p>Customize the look and feel of the application</p>
            </div>
            
            <div className="settings-grid">
              <div className="setting-item">
                <div className="setting-info">
                  <h3>Theme</h3>
                  <p>Switch between dark and light modes</p>
                </div>
                <ThemeToggle showLabel={false} />
              </div>
              
              {/* <div className="setting-item">
                <div className="setting-info">
                  <h3>Compact Mode</h3>
                  <p>Use a more compact interface layout</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={compactMode}
                    onChange={() => handleToggleSetting('compactMode')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div> */}
            </div>
          </section>

          {/* Language Section */}
          <section className="settings-section">
            <div className="section-header">
              <h2>Language & Region</h2>
            </div>
            
            <div className="settings-grid">
              <div className="setting-item full-width">
                <LanguageSettings 
                  onChange={handleLanguageChange}
                  showLabel={true}
                />
              </div>
            </div>
          </section>

          {/* Audio Section */}
          <section className="settings-section">
            <div className="section-header">
              <h2>Audio</h2>
            </div>
            
            <div className="settings-grid">
              <div className="setting-item">
                <div className="setting-info">
                  <h3>Audio Volume</h3>
                  <p>Default volume for TTS playback ({Math.round(audioVolume * 100)}%)</p>
                </div>
                <div className="volume-control">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={audioVolume}
                    onChange={handleVolumeChange}
                    className="volume-slider"
                  />
                  <span className="volume-display">
                    {Math.round(audioVolume * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Preferences Section */}
          <section className="settings-section">
            <div className="section-header">
              <h2>Preferences</h2>
              <p>General application preferences</p>
            </div>
            
            <div className="settings-grid">
              <div className="setting-item">
                <div className="setting-info">
                  <h3>Auto-save</h3>
                  <p>Automatically save your recordings and results</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={autoSave}
                    onChange={() => handleToggleSetting('autoSave')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              
              <div className="setting-item">
                <div className="setting-info">
                  <h3>Notifications</h3>
                  <p>Show notifications for completed analyses</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={showNotifications}
                    onChange={() => handleToggleSetting('showNotifications')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </section>

          {/* Advanced Section */}
          <section className="settings-section">
            <div className="section-header">
              <h2>Advanced</h2>
              <p>Advanced options and data management</p>
            </div>
            
            <div className="settings-grid">
              <div className="setting-item full-width">
                <div className="setting-info">
                  <h3>Reset Settings</h3>
                  <p>Reset all settings to their default values</p>
                </div>
                <button
                  type="button"
                  className={`reset-button ${showResetConfirm ? 'confirm' : ''}`}
                  onClick={handleResetSettings}
                >
                  {showResetConfirm ? 'Click again to confirm' : 'Reset to Defaults'}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

SettingsPage.propTypes = {
  onLanguageChange: PropTypes.func,
};

export default SettingsPage;
