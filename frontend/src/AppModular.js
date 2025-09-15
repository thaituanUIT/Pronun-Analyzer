import React, { useState, useEffect } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ThemeProvider, SettingsProvider, useSettings } from './contexts';
import { TopNavigation } from './components/navigation';
import { Home, RecordingPage, UploadPage, AboutPage, SettingsPage } from './pages';
import './styles/globals.css';
import './styles/components.css';
import './styles/App.css';

// Main App component wrapped in contexts
const AppContent = () => {
  const [activeTab, setActiveTab] = useState('home');
  const { language, updateSetting } = useSettings();

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleLanguageChange = (newLanguage) => {
    updateSetting('language', newLanguage);
  };

  const renderCurrentPage = () => {
    switch (activeTab) {
      case 'home':
        return <Home onNavigate={handleTabChange} />;
      case 'recorder':
        return (
          <RecordingPage 
            language={language} 
            onLanguageChange={handleLanguageChange} 
          />
        );
      case 'upload':
        return (
          <UploadPage 
            language={language} 
            onLanguageChange={handleLanguageChange} 
          />
        );
      case 'settings':
        return (
          <SettingsPage 
            onLanguageChange={handleLanguageChange} 
          />
        );
      case 'about':
        return <AboutPage />;
      default:
        return <Home onNavigate={handleTabChange} />;
    }
  };

  return (
    <div className="App">
      <TopNavigation 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
      />
      
      <main className="main-content">
        {renderCurrentPage()}
      </main>
      
      <ToastContainer 
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
};

// App wrapper with providers
const App = () => {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <AppContent />
      </SettingsProvider>
    </ThemeProvider>
  );
};

export default App;
