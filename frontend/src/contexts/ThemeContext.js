import React, { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';

// Theme configurations
export const THEMES = {
  dark: {
    name: 'Dark',
    type: 'dark',
    colors: {
      // Background colors
      background: '#0a0a0a',
      cardBackground: '#1a1a1a',
      navBackground: '#1a1a1a',
      
      // Text colors
      textPrimary: '#ffffff',
      textSecondary: '#cccccc',
      textMuted: '#999999',
      
      // Accent colors
      accent: '#00ff41',
      accentHover: '#00cc33',
      
      // Border colors
      border: '#333333',
      borderHover: '#555555',
      
      // Button colors
      buttonPrimary: '#00ff41',
      buttonPrimaryHover: '#00cc33',
      buttonSecondary: '#2a2a2a',
      buttonSecondaryHover: '#3a3a3a',
      
      // Status colors
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      
      // Form elements
      inputBackground: '#2a2a2a',
      inputBorder: '#555555',
      inputText: '#ffffff',
      
      // Shadow
      shadow: 'rgba(0,0,0,0.5)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    }
  },
  light: {
    name: 'Light',
    type: 'light',
    colors: {
      // Background colors
      background: '#ffffff',
      cardBackground: '#f8fafc',
      navBackground: '#ffffff',
      
      // Text colors
      textPrimary: '#1e293b',
      textSecondary: '#475569',
      textMuted: '#64748b',
      
      // Accent colors
      accent: '#2563eb',
      accentHover: '#1d4ed8',
      
      // Border colors
      border: '#e2e8f0',
      borderHover: '#cbd5e1',
      
      // Button colors
      buttonPrimary: '#2563eb',
      buttonPrimaryHover: '#1d4ed8',
      buttonSecondary: '#f1f5f9',
      buttonSecondaryHover: '#e2e8f0',
      
      // Status colors
      success: '#059669',
      warning: '#d97706',
      error: '#dc2626',
      info: '#0284c7',
      
      // Form elements
      inputBackground: '#ffffff',
      inputBorder: '#d1d5db',
      inputText: '#1e293b',
      
      // Shadow
      shadow: 'rgba(0,0,0,0.1)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    }
  }
};

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('dark');

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('app-theme');
    if (savedTheme && THEMES[savedTheme]) {
      setCurrentTheme(savedTheme);
    }
  }, []);

  // Apply CSS variables when theme changes
  useEffect(() => {
    const theme = THEMES[currentTheme];
    const root = document.documentElement;
    
    // Set CSS custom properties
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
    
    // Set theme attribute for CSS targeting
    root.setAttribute('data-theme', currentTheme);
    
    // Save to localStorage
    localStorage.setItem('app-theme', currentTheme);
  }, [currentTheme]);

  const toggleTheme = () => {
    setCurrentTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const setTheme = (themeName) => {
    if (THEMES[themeName]) {
      setCurrentTheme(themeName);
    }
  };

  const value = {
    currentTheme,
    theme: THEMES[currentTheme],
    themes: THEMES,
    toggleTheme,
    setTheme,
    isDark: currentTheme === 'dark',
    isLight: currentTheme === 'light',
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ThemeContext;
