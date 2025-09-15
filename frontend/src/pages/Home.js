import React from 'react';
import PropTypes from 'prop-types';
import './Home.css';
import MicIcon from '@mui/icons-material/Mic';
import DescriptionIcon from '@mui/icons-material/Description';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import LanguageIcon from '@mui/icons-material/Language';

const Home = ({ onNavigate }) => {
  const features = [
    {
      icon: <MicIcon fontSize="large" />,
      title: 'Real-time Recording',
      description: 'Record speech directly from your microphone with high-quality audio processing'
    },
    {
      icon: <DescriptionIcon fontSize="large" />,
      title: 'Accurate Transcription',
      description: 'Convert speech to text with industry-leading accuracy across multiple languages'
    },
    {
      icon: <RecordVoiceOverIcon fontSize="large" />,
      title: 'Pronunciation Analysis',
      description: 'Get detailed feedback on pronunciation with actionable improvement suggestions'
    },
    {
      icon: <LanguageIcon fontSize="large" />,
      title: 'Multi-language Support',
      description: 'Support for 10+ languages including German, English, Spanish, and more'
    }
  ];

  return (
    <div className="home-page">
      <div className="hero-section">
        <h1 className="hero-title">Speech to Text Analytics</h1>
        <p className="hero-subtitle">
          Advanced speech recognition and pronunciation analysis powered by OpenAI Whisper
        </p>
        
        <div className="feature-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="cta-section">
          <button 
            type="button"
            className="cta-button"
            onClick={() => onNavigate('recorder')}
          >
            Start Recording
          </button>
          <button 
            type="button"
            className="cta-button secondary"
            onClick={() => onNavigate('upload')}
          >
            Upload File
          </button>
        </div>
      </div>
    </div>
  );
};

Home.propTypes = {
  onNavigate: PropTypes.func.isRequired
};

export default Home;
