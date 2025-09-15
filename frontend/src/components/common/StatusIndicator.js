import React from 'react';
import PropTypes from 'prop-types';
import { STATUS_TYPES } from '../../constants';

/**
 * Status indicator component for showing processing status
 */
function StatusIndicator({
  status,
  progress = 0,
  className = '',
  showProgress = true,
}) {
  if (!status) return null;

  const getStatusText = () => {
    switch (status) {
      case STATUS_TYPES.QUEUED:
        return 'QUEUED';
      case STATUS_TYPES.PROCESSING:
        return 'PROCESSING';
      case STATUS_TYPES.COMPLETED:
        return 'COMPLETED';
      case STATUS_TYPES.FAILED:
        return 'FAILED';
      default:
        return status.toUpperCase();
    }
  };

  const isProcessing = status === STATUS_TYPES.PROCESSING;

  return (
    <div className={`card ${className}`}>
      <h3>Status</h3>
      <div className={`status-badge status-${status}`}>{getStatusText()}</div>

      {isProcessing && showProgress && (
        <div>
          <div className="spinner" />
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-text">
            {progress > 0 && `${Math.round(progress)}%`}
          </div>
        </div>
      )}
    </div>
  );
}

StatusIndicator.propTypes = {
  status: PropTypes.oneOf(Object.values(STATUS_TYPES)),
  progress: PropTypes.number,
  className: PropTypes.string,
  showProgress: PropTypes.bool,
};

export default StatusIndicator;
