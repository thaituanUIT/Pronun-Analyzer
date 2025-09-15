import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { toast } from 'react-toastify';
import App from '../App';

// Mock react-toastify
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn(),
  },
  ToastContainer: () => <div data-testid="toast-container" />,
}));

// Mock axios
jest.mock('axios', () => ({
  post: jest.fn(),
  get: jest.fn(),
}));

// Mock MediaRecorder
const mockMediaRecorder = {
  start: jest.fn(),
  stop: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  state: 'inactive',
};

Object.defineProperty(window, 'MediaRecorder', {
  writable: true,
  value: jest.fn().mockImplementation(() => mockMediaRecorder),
});

// Mock getUserMedia
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }],
    }),
  },
});

// Mock URL.createObjectURL
Object.defineProperty(window.URL, 'createObjectURL', {
  writable: true,
  value: jest.fn(() => 'mock-url'),
});

Object.defineProperty(window.URL, 'revokeObjectURL', {
  writable: true,
  value: jest.fn(),
});

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders main heading', () => {
    render(<App />);
    expect(screen.getByText('Speech to Text')).toBeInTheDocument();
  });

  test('renders navigation tabs', () => {
    render(<App />);
    expect(
      screen.getByText('Microphone Recording & Pronunciation')
    ).toBeInTheDocument();
    expect(screen.getByText('File Upload & Transcription')).toBeInTheDocument();
  });

  test('switches between tabs', () => {
    render(<App />);

    const uploadTab = screen.getByText('File Upload & Transcription');
    fireEvent.click(uploadTab);

    expect(screen.getByText('Upload Audio File')).toBeInTheDocument();
  });

  test('language selector works', () => {
    render(<App />);

    const languageSelect = screen.getByDisplayValue('German');
    fireEvent.change(languageSelect, { target: { value: 'en' } });

    expect(languageSelect.value).toBe('en');
  });

  test('start recording button works', async () => {
    render(<App />);

    const recordButton = screen.getByText('Start Recording');
    fireEvent.click(recordButton);

    await waitFor(() => {
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
    });
  });

  test('file upload area is displayed', () => {
    render(<App />);

    const uploadTab = screen.getByText('File Upload & Transcription');
    fireEvent.click(uploadTab);

    expect(
      screen.getByText(/Drag & drop an audio file here/i)
    ).toBeInTheDocument();
  });

  test('shows supported formats', () => {
    render(<App />);

    const uploadTab = screen.getByText('File Upload & Transcription');
    fireEvent.click(uploadTab);

    expect(
      screen.getByText(/Supported formats: MP3, WAV, M4A, FLAC, OGG, WebM/i)
    ).toBeInTheDocument();
  });

  test('reset button clears state', () => {
    render(<App />);

    const resetButton = screen.getByText('Reset');
    fireEvent.click(resetButton);

    // Should not show any error toasts
    expect(toast.error).not.toHaveBeenCalled();
  });

  test('pronunciation analysis section is visible', () => {
    render(<App />);

    expect(screen.getByText('Pronunciation Analysis')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(
        /Enter the text you want to practice pronouncing/i
      )
    ).toBeInTheDocument();
  });

  test('analyze pronunciation button is disabled without input', () => {
    render(<App />);

    const analyzeButton = screen.getByText('Analyze Pronunciation');
    expect(analyzeButton).toBeDisabled();
  });

  test('shows API configuration in console', () => {
    const consoleSpy = jest.spyOn(console, 'log');
    render(<App />);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('API Configuration Debug')
    );
  });
});
