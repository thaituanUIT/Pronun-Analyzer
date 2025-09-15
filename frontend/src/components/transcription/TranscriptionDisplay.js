import React from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { Button } from '../common';
import { copyToClipboard, downloadTextAsFile } from '../../utils';
import { SUCCESS_MESSAGES } from '../../constants';

/**
 * Transcription display component
 */
function TranscriptionDisplay({
  transcript,
  onCopy,
  onDownload,
  className = '',
  showActions = true,
}) {
  if (!transcript) return null;

  const handleCopy = async () => {
    const success = await copyToClipboard(transcript);
    if (success) {
      toast.success(SUCCESS_MESSAGES.TRANSCRIPT_COPIED);
      if (onCopy) onCopy();
    } else {
      toast.error('Failed to copy transcript');
    }
  };

  const handleDownload = () => {
    downloadTextAsFile(transcript, 'transcript.txt');
    toast.success(SUCCESS_MESSAGES.TRANSCRIPT_DOWNLOADED);
    if (onDownload) onDownload();
  };

  return (
    <div className={`card ${className}`} data-testid="transcription-result">
      <h3>Transcription Result</h3>
      <div className="transcript-area">{transcript}</div>

      {showActions && (
        <div className="transcript-actions">
          <Button onClick={handleCopy} variant="secondary">
            Copy to Clipboard
          </Button>
          <Button onClick={handleDownload} variant="secondary">
            Download Transcript
          </Button>
        </div>
      )}
    </div>
  );
}

TranscriptionDisplay.propTypes = {
  transcript: PropTypes.string,
  onCopy: PropTypes.func,
  onDownload: PropTypes.func,
  className: PropTypes.string,
  showActions: PropTypes.bool,
};

export default TranscriptionDisplay;
