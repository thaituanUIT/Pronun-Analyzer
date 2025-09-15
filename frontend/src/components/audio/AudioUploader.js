import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import { Button } from '../common';
import { SUPPORTED_AUDIO_TYPES } from '../../constants';
import { formatFileSize, isValidAudioFile } from '../../utils';

/**
 * Audio file uploader component with drag & drop functionality
 */
function AudioUploader({
  onFileSelect,
  onFileRemove,
  selectedFile,
  disabled = false,
  className = '',
  accept = SUPPORTED_AUDIO_TYPES,
  maxSize = 100 * 1024 * 1024, // 100MB
}) {
  const onDrop = useCallback(
    (acceptedFiles, rejectedFiles) => {
      // Handle rejected files
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        const errors = rejection.errors.map(error => error.message).join(', ');
        toast.error(`File rejected: ${errors}`);
        return;
      }

      const uploadedFile = acceptedFiles[0];
      if (uploadedFile) {
        // Validate file
        if (!isValidAudioFile(uploadedFile)) {
          toast.error('Please select a valid audio file');
          return;
        }

        if (uploadedFile.size > maxSize) {
          toast.error(
            `File is too large. Maximum size is ${formatFileSize(maxSize)}`
          );
          return;
        }

        if (onFileSelect) {
          onFileSelect(uploadedFile);
        }
      }
    },
    [onFileSelect, maxSize]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple: false,
    disabled,
    maxSize,
  });

  const handleRemoveFile = () => {
    if (onFileRemove) {
      onFileRemove();
    }
  };

  const formatSupportedFormats = () => {
    const extensions = Object.values(accept).flat();
    const uniqueExtensions = [...new Set(extensions)];
    return uniqueExtensions.join(', ').toUpperCase();
  };

  return (
    <div className={`audio-uploader ${className}`}>
      <div
        {...getRootProps()}
        className={`upload-area ${isDragActive ? 'drag-over' : ''} ${
          disabled ? 'disabled' : ''
        }`}
        data-testid="upload-area"
      >
        <input {...getInputProps()} />

        {selectedFile ? (
          <div className="file-selected">
            <div className="file-info">
              <h4>Selected File</h4>
              <p>
                <strong>Name:</strong> {selectedFile.name}
              </p>
              <p>
                <strong>Size:</strong> {formatFileSize(selectedFile.size)}
              </p>
              <p>
                <strong>Type:</strong> {selectedFile.type}
              </p>
            </div>

            {!disabled && (
              <Button
                onClick={handleRemoveFile}
                variant="secondary"
                size="small"
                className="remove-file-button"
              >
                Remove File
              </Button>
            )}
          </div>
        ) : (
          <div className="upload-prompt">
            {isDragActive ? (
              <p>Drop the audio file here...</p>
            ) : (
              <>
                <p>Drag & drop an audio file here, or click to select</p>
                <p className="supported-formats">
                  Supported formats: {formatSupportedFormats()}
                </p>
                <p className="max-size">
                  Maximum file size: {formatFileSize(maxSize)}
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {selectedFile && (
        <div className="file-details">
          <small>
            File ready for upload: {selectedFile.name} (
            {formatFileSize(selectedFile.size)})
          </small>
        </div>
      )}
    </div>
  );
}

AudioUploader.propTypes = {
  onFileSelect: PropTypes.func,
  onFileRemove: PropTypes.func,
  selectedFile: PropTypes.object,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  accept: PropTypes.object,
  maxSize: PropTypes.number,
};

export default AudioUploader;
