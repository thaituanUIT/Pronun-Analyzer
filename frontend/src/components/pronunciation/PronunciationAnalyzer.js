import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { apiService } from '../../services';
import { Button } from '../common';

function PronunciationAnalyzer({
  recordedBlob,
  language,
  isProcessing,
  isRecording,
  onAnalysisComplete,
}) {
  const [referenceText, setReferenceText] = useState('');
  const [pronunciationJobId, setPronunciationJobId] = useState(null);
  const [pronunciationStatus, setPronunciationStatus] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const startPronunciationAnalysis = async () => {
    if (!recordedBlob) {
      toast.error('Please record audio from microphone first');
      return;
    }

    if (!referenceText.trim()) {
      toast.error('Please enter reference text for pronunciation analysis');
      return;
    }

    setIsAnalyzing(true);

    try {
      const response = await apiService.startPronunciationAnalysis(
        recordedBlob,
        referenceText,
        language
      );
      setPronunciationJobId(response);
      toast.success('Pronunciation analysis started!');

      // Start polling for status
      pollPronunciationStatus(response);
    } catch (error) {
      console.error('Pronunciation analysis error:', error);
      const errorMessage = error.response?.data?.detail || error.message;
      toast.error(`Failed to start pronunciation analysis: ${errorMessage}`);
      setIsAnalyzing(false);
    }
  };

  const pollPronunciationStatus = async currentJobId => {
    try {
      const response = await apiService.getPronunciationStatus(currentJobId);

      if (response.error) {
        throw new Error(response.error.message);
      }

      const jobStatus = response.data;
      setPronunciationStatus(jobStatus.status);

      if (jobStatus.analysis) {
        onAnalysisComplete(jobStatus.analysis);
      }

      if (jobStatus.status === 'completed') {
        setIsAnalyzing(false);
        toast.success('Pronunciation analysis completed!');
      } else if (jobStatus.status === 'failed') {
        setIsAnalyzing(false);
        toast.error(
          `Pronunciation analysis failed: ${jobStatus.error || 'Unknown error'}`
        );
      } else if (
        jobStatus.status === 'processing' ||
        jobStatus.status === 'queued'
      ) {
        // Continue polling
        setTimeout(() => pollPronunciationStatus(currentJobId), 2000);
      }
    } catch (error) {
      console.error('Pronunciation status check error:', error);
      setIsAnalyzing(false);
      toast.error('Failed to check pronunciation analysis status');
    }
  };

  const resetAnalysis = () => {
    setPronunciationJobId(null);
    setPronunciationStatus(null);
    setIsAnalyzing(false);
    setReferenceText('');
  };

  return (
    <div className="pronunciation-section">
      <h3>Pronunciation Analysis</h3>
      <p>
        Enter the text you want to practice pronouncing, then analyze your
        recording:
      </p>

      <div className="reference-text-input">
        <textarea
          id="referenceText"
          value={referenceText}
          onChange={e => setReferenceText(e.target.value)}
          placeholder="Enter the text you want to practice pronouncing..."
          rows={4}
          disabled={isAnalyzing || isProcessing}
        />
      </div>

      <Button
        className="analyze-button"
        onClick={startPronunciationAnalysis}
        disabled={
          !referenceText.trim() ||
          !recordedBlob ||
          isAnalyzing ||
          isRecording ||
          isProcessing
        }
      >
        {isAnalyzing ? 'Analyzing...' : 'Analyze Pronunciation'}
      </Button>

      {pronunciationStatus && (
        <div className="analysis-status">
          {pronunciationStatus === 'processing' && (
            <div>
              <div className="spinner" />
              <p>Analyzing pronunciation patterns...</p>
            </div>
          )}
        </div>
      )}

      <Button
        onClick={resetAnalysis}
        disabled={isAnalyzing}
        variant="secondary"
      >
        Reset Analysis
      </Button>
    </div>
  );
}

export default PronunciationAnalyzer;
