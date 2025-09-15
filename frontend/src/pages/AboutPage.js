import React from 'react';
import './AboutPage.css';

const AboutPage = () => {
  return (
    <div className="about-page">
      <div className="compact-card">
        <h2>About Speech Analytics</h2>
        <p>
          This application provides advanced speech-to-text transcription and pronunciation 
          analysis using state-of-the-art AI technology. Built with React and powered by 
          OpenAI Whisper for accurate speech recognition.
        </p>
        <div className="tech-stack">
          <h3>Technology Stack</h3>
          <ul>
            <li>React.js - Frontend framework</li>
            <li>OpenAI Whisper - Speech recognition</li>
            <li>Node.js - Backend services</li>
            <li>Web Audio API - Real-time recording</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
