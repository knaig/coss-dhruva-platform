import React, { useState, useRef, useCallback } from 'react';
import { AudioRecorder, AudioRecordingResult, AudioRecordingStatus, processAudioFile, SAMPLING_RATE_OPTIONS } from '../utils/audioUtils';
import { performASR, extractTranscription, getAvailableLanguages, getAvailableServices } from '../utils/asrApi';
import { StreamingASRClient, StreamingStatus, StreamingResult, createStreamingASRClient } from '../utils/streamingAsrApi';
import './ASRTester.css';

interface ASRTesterProps {}

const ASRTester: React.FC<ASRTesterProps> = () => {
  // State management
  const [selectedLanguage, setSelectedLanguage] = useState('hi');
  const [selectedService, setSelectedService] = useState('ai4bharat/indictasr');
  const [apiKey, setApiKey] = useState('Xhf5jWXfkam42bKqEk5PgIusSDsgamh4y0gRL7zs1xUINKQbyI7LX0L02mpMtv09');
  const [selectedSamplingRate, setSelectedSamplingRate] = useState(16000);
  
  // Recording state
  const [recordingStatus, setRecordingStatus] = useState<AudioRecordingStatus>({
    state: 'idle',
    duration: 0,
    hasPermission: false
  });
  const [recordingResult, setRecordingResult] = useState<AudioRecordingResult | null>(null);
  
  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProcessing, setUploadProcessing] = useState(false);
  
  // ASR results
  const [transcriptionResult, setTranscriptionResult] = useState<string>('');
  const [asrProcessing, setAsrProcessing] = useState(false);
  const [asrError, setAsrError] = useState<string>('');

  // Streaming state
  const [streamingStatus, setStreamingStatus] = useState<StreamingStatus>({ state: 'disconnected' });
  const [streamingTranscript, setStreamingTranscript] = useState<string>('');
  const [partialTranscript, setPartialTranscript] = useState<string>('');
  const [streamingResults, setStreamingResults] = useState<StreamingResult[]>([]);

  // Logs
  const [logs, setLogs] = useState<string[]>([]);
  
  // Refs
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamingClientRef = useRef<StreamingASRClient | null>(null);

  // Available options
  const languages = getAvailableLanguages();
  const services = getAvailableServices();

  // Logging utility
  const addLog = useCallback((message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    setLogs(prev => [...prev, logMessage]);
    console.log(logMessage);
  }, []);

  // Initialize audio recorder
  const initializeRecorder = useCallback(() => {
    if (!audioRecorderRef.current) {
      audioRecorderRef.current = new AudioRecorder(
        {
          sampleRate: selectedSamplingRate,
          channelCount: 1,
          maxDuration: 300, // 5 minutes
          enableEchoCancellation: true,
          enableNoiseSuppression: true,
          enableAutoGainControl: true,
        },
        (status) => {
          setRecordingStatus(status);
          if (status.error) {
            addLog(`Recording error: ${status.error}`, 'error');
          }
        }
      );
    }
  }, [addLog, selectedSamplingRate]);

  // Initialize streaming client
  const initializeStreamingClient = useCallback(() => {
    if (!streamingClientRef.current) {
      streamingClientRef.current = createStreamingASRClient(
        (status) => {
          setStreamingStatus(status);
          if (status.error) {
            addLog(`Streaming error: ${status.error}`, 'error');
          } else if (status.message) {
            addLog(`Streaming: ${status.message}`);
          }
        },
        (result) => {
          setStreamingResults(prev => [...prev, result]);
          if (result.isFinal) {
            setStreamingTranscript(prev => prev + ' ' + result.transcript);
            setPartialTranscript('');
            addLog(`Final transcript: "${result.transcript}"`, 'success');
          } else {
            setPartialTranscript(result.transcript);
            addLog(`Partial transcript: "${result.transcript}"`);
          }
        }
      );
    }
  }, [addLog]);

  // Check microphone permission
  const checkPermission = async () => {
    initializeRecorder();
    if (audioRecorderRef.current) {
      const permission = await audioRecorderRef.current.checkPermission();
      addLog(`Microphone permission: ${permission}`);
      return permission === 'granted';
    }
    return false;
  };

  // Start recording
  const startRecording = async () => {
    try {
      initializeRecorder();
      if (!audioRecorderRef.current) {
        throw new Error('Audio recorder not initialized');
      }

      addLog('Starting microphone recording...');
      setRecordingResult(null);
      setTranscriptionResult('');
      setAsrError('');
      
      await audioRecorderRef.current.startRecording();
      addLog('Recording started successfully');
    } catch (error: any) {
      addLog(`Failed to start recording: ${error.message}`, 'error');
      setAsrError(error.message);
    }
  };

  // Stop recording
  const stopRecording = async () => {
    try {
      if (!audioRecorderRef.current) {
        throw new Error('No active recording');
      }

      addLog('Stopping recording...');
      const result = await audioRecorderRef.current.stopRecording();
      setRecordingResult(result);
      addLog(`Recording completed: ${result.duration.toFixed(2)}s, ${result.size} bytes`, 'success');
      
      // Automatically process the recording
      await processRecording(result);
    } catch (error: any) {
      addLog(`Failed to stop recording: ${error.message}`, 'error');
      setAsrError(error.message);
    }
  };

  // Cancel recording
  const cancelRecording = () => {
    if (audioRecorderRef.current) {
      audioRecorderRef.current.cancelRecording();
      addLog('Recording cancelled');
      setRecordingResult(null);
    }
  };

  // Streaming functions
  const connectStreaming = async () => {
    try {
      initializeStreamingClient();
      if (!streamingClientRef.current) {
        throw new Error('Failed to initialize streaming client');
      }

      addLog('Connecting to streaming server...');
      setStreamingTranscript('');
      setPartialTranscript('');
      setStreamingResults([]);
      setAsrError('');

      await streamingClientRef.current.connect({
        serviceId: selectedService,
        language: selectedLanguage,
        samplingRate: selectedSamplingRate,
        audioFormat: 'wav',
        encoding: 'base64',
        apiKey: apiKey,
        responseFrequencyMs: 2000,
        bufferSize: 4096
      });

      addLog('Connected to streaming server successfully', 'success');
    } catch (error: any) {
      addLog(`Failed to connect to streaming server: ${error.message}`, 'error');
      setAsrError(error.message);
    }
  };

  const startStreaming = async () => {
    try {
      if (!streamingClientRef.current) {
        await connectStreaming();
      }

      if (!streamingClientRef.current) {
        throw new Error('Streaming client not available');
      }

      addLog('Starting streaming ASR...');
      await streamingClientRef.current.startStreaming();

      // Start capturing audio from microphone
      await startStreamingAudio();

      addLog('Streaming ASR started successfully', 'success');
    } catch (error: any) {
      addLog(`Failed to start streaming: ${error.message}`, 'error');
      setAsrError(error.message);
    }
  };

  const stopStreaming = () => {
    try {
      if (streamingClientRef.current) {
        addLog('Stopping streaming ASR...');
        streamingClientRef.current.stopStreaming();
        addLog('Streaming ASR stopped', 'success');
      }

      // Stop audio capture
      stopStreamingAudio();
    } catch (error: any) {
      addLog(`Error stopping streaming: ${error.message}`, 'error');
    }
  };

  const disconnectStreaming = () => {
    try {
      if (streamingClientRef.current) {
        addLog('Disconnecting from streaming server...');
        streamingClientRef.current.disconnect();
        streamingClientRef.current = null;
        addLog('Disconnected from streaming server', 'success');
      }

      stopStreamingAudio();
      setStreamingStatus({ state: 'disconnected' });
    } catch (error: any) {
      addLog(`Error disconnecting: ${error.message}`, 'error');
    }
  };

  // Streaming audio capture (simplified - using existing recorder for now)
  const startStreamingAudio = async () => {
    // For now, we'll use a simplified approach
    // In a full implementation, you'd want continuous audio streaming
    addLog('Starting continuous audio capture for streaming...');
  };

  const stopStreamingAudio = () => {
    addLog('Stopping continuous audio capture...');
  };

  // Handle file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadProcessing(true);
      setSelectedFile(null);
      setTranscriptionResult('');
      setAsrError('');
      
      addLog(`Processing uploaded file: ${file.name} (${file.type}, ${file.size} bytes)`);

      const processedFile = await processAudioFile(file, selectedSamplingRate);
      setSelectedFile(processedFile);
      addLog(`File processed successfully: ${processedFile.size} bytes`, 'success');
      
      // Automatically process the file
      await processUploadedFile(processedFile);
    } catch (error: any) {
      addLog(`File processing failed: ${error.message}`, 'error');
      setAsrError(error.message);
    } finally {
      setUploadProcessing(false);
    }
  };

  // Process recorded audio
  const processRecording = async (result: AudioRecordingResult) => {
    try {
      setAsrProcessing(true);
      setAsrError('');
      
      addLog('Sending recorded audio to ASR...');
      
      const response = await performASR(result.base64, {
        serviceId: selectedService,
        language: selectedLanguage,
        audioFormat: 'wav',
        encoding: 'base64',
        samplingRate: selectedSamplingRate,
      }, apiKey);
      
      const transcription = extractTranscription(response);
      setTranscriptionResult(transcription);
      
      if (transcription) {
        addLog(`ASR completed successfully: "${transcription}"`, 'success');
      } else {
        addLog('ASR completed but no transcription was generated', 'error');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'ASR processing failed';
      addLog(`ASR failed: ${errorMessage}`, 'error');
      setAsrError(errorMessage);
    } finally {
      setAsrProcessing(false);
    }
  };

  // Process uploaded file
  const processUploadedFile = async (file: File) => {
    try {
      setAsrProcessing(true);
      setAsrError('');
      
      addLog('Converting file to base64...');
      const base64 = await fileToBase64(file);
      
      addLog('Sending uploaded file to ASR...');
      
      const response = await performASR(base64, {
        serviceId: selectedService,
        language: selectedLanguage,
        audioFormat: 'wav',
        encoding: 'base64',
        samplingRate: selectedSamplingRate,
      }, apiKey);
      
      const transcription = extractTranscription(response);
      setTranscriptionResult(transcription);
      
      if (transcription) {
        addLog(`ASR completed successfully: "${transcription}"`, 'success');
      } else {
        addLog('ASR completed but no transcription was generated', 'error');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'ASR processing failed';
      addLog(`ASR failed: ${errorMessage}`, 'error');
      setAsrError(errorMessage);
    } finally {
      setAsrProcessing(false);
    }
  };

  // Utility function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:audio/wav;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
  };

  // Check if browser supports required features
  const isSupported = AudioRecorder.isSupported();

  return (
    <div className="asr-tester">
      <header className="asr-header">
        <h1>🎤 Dhruva Platform ASR Tester</h1>
        <p>Test Automatic Speech Recognition functionality with microphone recording and file upload</p>
      </header>

      {!isSupported && (
        <div className="error-banner">
          ⚠️ Your browser doesn't support the required audio features. Please use a modern browser like Chrome, Firefox, or Safari.
        </div>
      )}

      <div className="asr-content">
        {/* Configuration Panel */}
        <div className="config-panel">
          <h2>Configuration</h2>
          
          <div className="config-group">
            <label htmlFor="language-select">Language:</label>
            <select 
              id="language-select"
              value={selectedLanguage} 
              onChange={(e) => setSelectedLanguage(e.target.value)}
              disabled={recordingStatus.state === 'recording' || asrProcessing}
            >
              {languages.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
          </div>

          <div className="config-group">
            <label htmlFor="service-select">Service:</label>
            <select 
              id="service-select"
              value={selectedService} 
              onChange={(e) => setSelectedService(e.target.value)}
              disabled={recordingStatus.state === 'recording' || asrProcessing}
            >
              {services.map(service => (
                <option key={service.id} value={service.id}>{service.name}</option>
              ))}
            </select>
          </div>

          <div className="config-group">
            <label htmlFor="sampling-rate-select">Sampling Rate:</label>
            <select
              id="sampling-rate-select"
              value={selectedSamplingRate}
              onChange={(e) => setSelectedSamplingRate(parseInt(e.target.value))}
              disabled={recordingStatus.state === 'recording' || asrProcessing || streamingStatus.state === 'streaming'}
            >
              {SAMPLING_RATE_OPTIONS.map(option => (
                <option key={option.value} value={option.value} title={option.description}>
                  {option.label} - {option.description}
                </option>
              ))}
            </select>
          </div>

          <div className="config-group">
            <label htmlFor="api-key-input">API Key:</label>
            <input
              id="api-key-input"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={recordingStatus.state === 'recording' || asrProcessing || streamingStatus.state === 'streaming'}
              placeholder="Enter your API key"
            />
          </div>
        </div>

        {/* Microphone Testing Panel */}
        <div className="microphone-panel">
          <h2>🎤 Microphone Recording</h2>

          <div className="recording-controls">
            <button
              onClick={checkPermission}
              disabled={recordingStatus.state === 'recording' || asrProcessing}
              className="btn btn-secondary"
            >
              Check Permission
            </button>

            <button
              onClick={startRecording}
              disabled={!isSupported || recordingStatus.state === 'recording' || asrProcessing}
              className="btn btn-primary"
            >
              Start Recording
            </button>

            <button
              onClick={stopRecording}
              disabled={recordingStatus.state !== 'recording'}
              className="btn btn-success"
            >
              Stop Recording
            </button>

            <button
              onClick={cancelRecording}
              disabled={recordingStatus.state !== 'recording'}
              className="btn btn-danger"
            >
              Cancel
            </button>
          </div>

          <div className="recording-status">
            <div className={`status-indicator ${recordingStatus.state}`}>
              Status: {recordingStatus.state.toUpperCase()}
            </div>

            {recordingStatus.state === 'recording' && (
              <div className="recording-timer">
                Duration: {recordingStatus.duration.toFixed(1)}s
              </div>
            )}

            <div className={`permission-status ${recordingStatus.hasPermission ? 'granted' : 'denied'}`}>
              Microphone: {recordingStatus.hasPermission ? '✅ Granted' : '❌ Not Granted'}
            </div>
          </div>

          {recordingResult && (
            <div className="recording-result">
              <h3>Recording Result</h3>
              <div className="result-details">
                <p><strong>Duration:</strong> {recordingResult.duration.toFixed(2)} seconds</p>
                <p><strong>Size:</strong> {recordingResult.size} bytes</p>
                <p><strong>Format:</strong> {recordingResult.format}</p>
              </div>
            </div>
          )}
        </div>

        {/* File Upload Panel */}
        <div className="upload-panel">
          <h2>📁 File Upload</h2>

          <div className="upload-controls">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileSelect}
              disabled={uploadProcessing || asrProcessing}
              className="file-input"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadProcessing || asrProcessing}
              className="btn btn-primary"
            >
              {uploadProcessing ? 'Processing...' : 'Select Audio File'}
            </button>
          </div>

          {selectedFile && (
            <div className="file-info">
              <h3>Selected File</h3>
              <div className="file-details">
                <p><strong>Name:</strong> {selectedFile.name}</p>
                <p><strong>Type:</strong> {selectedFile.type}</p>
                <p><strong>Size:</strong> {selectedFile.size} bytes</p>
              </div>
            </div>
          )}
        </div>

        {/* Streaming ASR Panel */}
        <div className="streaming-panel">
          <h2>🌊 Streaming ASR</h2>

          <div className="streaming-controls">
            <button
              onClick={connectStreaming}
              disabled={streamingStatus.state === 'connected' || streamingStatus.state === 'streaming' || asrProcessing}
              className="btn btn-secondary"
            >
              Connect
            </button>

            <button
              onClick={startStreaming}
              disabled={streamingStatus.state !== 'connected' || asrProcessing}
              className="btn btn-primary"
            >
              Start Streaming
            </button>

            <button
              onClick={stopStreaming}
              disabled={streamingStatus.state !== 'streaming'}
              className="btn btn-success"
            >
              Stop Streaming
            </button>

            <button
              onClick={disconnectStreaming}
              disabled={streamingStatus.state === 'disconnected'}
              className="btn btn-danger"
            >
              Disconnect
            </button>
          </div>

          <div className="streaming-status">
            <div className={`status-indicator ${streamingStatus.state}`}>
              Status: {streamingStatus.state.toUpperCase()}
            </div>

            {streamingStatus.message && (
              <div className="status-message">
                Message: {streamingStatus.message}
              </div>
            )}

            {streamingStatus.duration !== undefined && streamingStatus.duration > 0 && (
              <div className="streaming-timer">
                Duration: {streamingStatus.duration.toFixed(1)}s
              </div>
            )}
          </div>

          {(streamingTranscript || partialTranscript) && (
            <div className="streaming-transcription">
              <h3>Live Transcription</h3>
              <div className="transcription-display">
                <div className="final-transcript">
                  {streamingTranscript}
                </div>
                {partialTranscript && (
                  <div className="partial-transcript">
                    <em>{partialTranscript}</em>
                  </div>
                )}
              </div>
              <div className="transcription-stats">
                <p><strong>Results received:</strong> {streamingResults.length}</p>
                <p><strong>Final transcripts:</strong> {streamingResults.filter(r => r.isFinal).length}</p>
              </div>
            </div>
          )}
        </div>

        {/* Results Panel */}
        <div className="results-panel">
          <h2>📝 ASR Results</h2>

          {asrProcessing && (
            <div className="processing-indicator">
              <div className="spinner"></div>
              <span>Processing audio with ASR...</span>
            </div>
          )}

          {asrError && (
            <div className="error-message">
              <strong>Error:</strong> {asrError}
            </div>
          )}

          {transcriptionResult && (
            <div className="transcription-result">
              <h3>Transcription</h3>
              <div className="transcription-text">
                {transcriptionResult}
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(transcriptionResult)}
                className="btn btn-secondary btn-small"
              >
                Copy to Clipboard
              </button>
            </div>
          )}
        </div>

        {/* Debug Logs Panel */}
        <div className="logs-panel">
          <div className="logs-header">
            <h2>🔍 Debug Logs</h2>
            <button onClick={clearLogs} className="btn btn-secondary btn-small">
              Clear Logs
            </button>
          </div>

          <div className="logs-container">
            {logs.length === 0 ? (
              <p className="no-logs">No logs yet. Start recording or upload a file to see debug information.</p>
            ) : (
              <pre className="logs-content">
                {logs.join('\n')}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ASRTester;
