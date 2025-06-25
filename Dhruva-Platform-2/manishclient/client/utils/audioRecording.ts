/**
 * Unified Audio Recording Utility for Dhruva Platform
 * 
 * This utility provides a robust, cross-browser audio recording solution
 * with automatic format conversion, error handling, and fallback mechanisms.
 * 
 * Features:
 * - Modern MediaRecorder API with fallbacks
 * - Automatic WebM to WAV conversion
 * - Cross-browser compatibility
 * - Comprehensive error handling
 * - Resource cleanup
 * - Permission management
 */

export interface AudioRecordingConfig {
  sampleRate?: number;
  channelCount?: number;
  maxDuration?: number; // in seconds
  maxFileSize?: number; // in bytes
  preferredFormat?: 'wav' | 'webm' | 'mp4' | 'ogg';
  enableEchoCancellation?: boolean;
  enableNoiseSuppression?: boolean;
  enableAutoGainControl?: boolean;
}

export interface AudioRecordingResult {
  audioFile: File;
  duration: number;
  format: string;
  size: number;
}

export interface AudioRecordingError {
  code: string;
  message: string;
  userMessage: string;
  retryable: boolean;
}

export type AudioRecordingState = 'idle' | 'requesting-permission' | 'recording' | 'processing' | 'error';

export interface AudioRecordingStatus {
  state: AudioRecordingState;
  duration: number;
  error?: AudioRecordingError;
  hasPermission: boolean;
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private recordedChunks: Blob[] = [];
  private startTime: number = 0;
  private config: Required<AudioRecordingConfig>;
  private statusCallback?: (status: AudioRecordingStatus) => void;
  private sessionId: number = 0;
  private isProcessing: boolean = false;

  constructor(config: AudioRecordingConfig = {}) {
    this.config = {
      sampleRate: config.sampleRate || 16000,
      channelCount: config.channelCount || 1,
      maxDuration: config.maxDuration || 120,
      maxFileSize: config.maxFileSize || 10 * 1024 * 1024, // 10MB
      preferredFormat: config.preferredFormat || 'wav',
      enableEchoCancellation: config.enableEchoCancellation !== false,
      enableNoiseSuppression: config.enableNoiseSuppression !== false,
      enableAutoGainControl: config.enableAutoGainControl !== false,
    };
  }

  /**
   * Set callback for status updates
   */
  public onStatusChange(callback: (status: AudioRecordingStatus) => void): void {
    this.statusCallback = callback;
  }

  /**
   * Check if audio recording is supported in the current browser
   */
  public static isSupported(): boolean {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      window.MediaRecorder
    );
  }

  /**
   * Check microphone permission status
   */
  public async checkPermission(): Promise<'granted' | 'denied' | 'prompt'> {
    if (!navigator.permissions) {
      // Fallback: try to access microphone to check permission
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        return 'granted';
      } catch (err: any) {
        if (err.name === 'NotAllowedError') return 'denied';
        return 'prompt';
      }
    }

    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return result.state as 'granted' | 'denied' | 'prompt';
    } catch {
      return 'prompt';
    }
  }

  /**
   * Start audio recording
   */
  public async startRecording(): Promise<void> {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      throw this.createError('ALREADY_RECORDING', 'Recording is already in progress');
    }

    this.sessionId++;
    const currentSessionId = this.sessionId;

    try {
      this.updateStatus('requesting-permission');

      // Check browser support
      if (!AudioRecorder.isSupported()) {
        throw this.createError('NOT_SUPPORTED', 'Audio recording is not supported in this browser');
      }

      // Request microphone access with enhanced constraints
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: this.config.enableEchoCancellation,
          noiseSuppression: this.config.enableNoiseSuppression,
          autoGainControl: this.config.enableAutoGainControl,
          sampleRate: this.config.sampleRate,
          channelCount: this.config.channelCount,
        }
      };

      console.log('[AudioRecorder] Requesting microphone access with constraints:', constraints);
      this.audioStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Create MediaRecorder with optimal settings
      const options = this.getOptimalMediaRecorderOptions();
      this.mediaRecorder = new MediaRecorder(this.audioStream, options);
      this.recordedChunks = [];

      console.log(`[AudioRecorder] MediaRecorder created with MIME type: ${this.mediaRecorder.mimeType}`);

      // Set up event handlers
      this.setupMediaRecorderEvents(currentSessionId);

      // Start recording
      this.mediaRecorder.start(500); // Collect data every 500ms
      this.startTime = Date.now();
      this.updateStatus('recording');

      console.log('[AudioRecorder] Recording started successfully');

    } catch (err: any) {
      console.error('[AudioRecorder] Failed to start recording:', err);
      this.cleanup();
      
      // Convert error to user-friendly format
      const audioError = this.handleRecordingError(err);
      this.updateStatus('error', audioError);
      throw audioError;
    }
  }

  /**
   * Stop audio recording and return the processed audio file
   */
  public async stopRecording(): Promise<AudioRecordingResult> {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      throw this.createError('NOT_RECORDING', 'No active recording to stop');
    }

    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(this.createError('NOT_RECORDING', 'No active recording to stop'));
        return;
      }

      // Set up one-time stop handler
      const handleStop = async () => {
        try {
          this.updateStatus('processing');
          const result = await this.processRecordedAudio();
          this.cleanup();
          this.updateStatus('idle');
          resolve(result);
        } catch (err) {
          this.cleanup();
          const audioError = err instanceof Error ? 
            this.createError('PROCESSING_FAILED', err.message) : 
            this.createError('PROCESSING_FAILED', 'Failed to process recorded audio');
          this.updateStatus('error', audioError);
          reject(audioError);
        }
      };

      this.mediaRecorder.addEventListener('stop', handleStop, { once: true });
      this.mediaRecorder.stop();
    });
  }

  /**
   * Cancel current recording
   */
  public cancelRecording(): void {
    console.log('[AudioRecorder] Cancelling recording');
    this.cleanup();
    this.updateStatus('idle');
  }

  /**
   * Get current recording duration in seconds
   */
  public getCurrentDuration(): number {
    if (this.startTime === 0) return 0;
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  /**
   * Check if currently recording
   */
  public isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  /**
   * Get optimal MediaRecorder options based on browser support
   */
  private getOptimalMediaRecorderOptions(): MediaRecorderOptions {
    const options: MediaRecorderOptions = {};

    // Try different MIME types in order of preference for ASR compatibility
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/wav'
    ];

    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        options.mimeType = mimeType;
        console.log(`[AudioRecorder] Using MIME type: ${mimeType}`);
        break;
      }
    }

    // Set audio bit rate for quality (if supported)
    if (options.mimeType && options.mimeType.includes('webm')) {
      options.audioBitsPerSecond = 16000;
    }

    return options;
  }

  /**
   * Set up MediaRecorder event handlers
   */
  private setupMediaRecorderEvents(sessionId: number): void {
    if (!this.mediaRecorder) return;

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0 && sessionId === this.sessionId) {
        this.recordedChunks.push(e.data);
        console.log(`[AudioRecorder] Session ${sessionId} chunk: ${e.data.size} bytes, type: ${e.data.type}`);
      }
    };

    this.mediaRecorder.onerror = (e) => {
      console.error(`[AudioRecorder] Session ${sessionId} MediaRecorder error:`, e);
      const audioError = this.createError('RECORDING_ERROR', 'Recording error occurred');
      this.updateStatus('error', audioError);
    };

    this.mediaRecorder.onstart = () => {
      console.log(`[AudioRecorder] Session ${sessionId} MediaRecorder started successfully`);
    };
  }

  /**
   * Process recorded audio chunks and convert to desired format
   */
  private async processRecordedAudio(): Promise<AudioRecordingResult> {
    if (this.recordedChunks.length === 0) {
      throw new Error('No audio data recorded');
    }

    if (!this.mediaRecorder) {
      throw new Error('MediaRecorder reference is null');
    }

    console.log(`[AudioRecorder] Processing ${this.recordedChunks.length} audio chunks`);

    // Get the actual MIME type from MediaRecorder
    const actualMimeType = this.mediaRecorder.mimeType || 'audio/webm';
    console.log(`[AudioRecorder] MediaRecorder MIME type: ${actualMimeType}`);

    // Create blob from recorded chunks with correct MIME type
    const audioBlob = new Blob(this.recordedChunks, { type: actualMimeType });

    if (audioBlob.size === 0) {
      throw new Error('Recorded audio is empty');
    }

    console.log(`[AudioRecorder] Audio blob created - Type: ${audioBlob.type}, Size: ${audioBlob.size} bytes`);

    // Validate audio blob size
    if (audioBlob.size < 1000) {
      throw new Error('Recorded audio is too small - please record for at least 1 second');
    }

    if (audioBlob.size > this.config.maxFileSize) {
      throw new Error(`Recorded audio is too large - maximum size is ${this.config.maxFileSize / (1024 * 1024)}MB`);
    }

    // Convert to desired format
    let finalFile: File;
    const duration = this.getCurrentDuration();

    try {
      if (this.config.preferredFormat === 'wav' && audioBlob.type !== 'audio/wav') {
        console.log(`[AudioRecorder] Converting from ${audioBlob.type} to WAV...`);
        const wavBlob = await this.convertToWav(audioBlob);
        console.log(`[AudioRecorder] WAV conversion successful, size: ${wavBlob.size} bytes`);
        finalFile = new File([wavBlob], 'recording.wav', { type: 'audio/wav' });
      } else {
        // Use original format
        const extension = this.getFileExtension(audioBlob.type);
        finalFile = new File([audioBlob], `recording.${extension}`, { type: audioBlob.type });
      }
    } catch (conversionErr) {
      console.warn('[AudioRecorder] Format conversion failed, using original:', conversionErr);
      // Fallback to original blob if conversion fails
      const extension = this.getFileExtension(audioBlob.type);
      finalFile = new File([audioBlob], `recording.${extension}`, { type: audioBlob.type });
    }

    return {
      audioFile: finalFile,
      duration,
      format: finalFile.type,
      size: finalFile.size
    };
  }

  /**
   * Convert audio blob to WAV format
   */
  private async convertToWav(audioBlob: Blob): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const fileReader = new FileReader();

      fileReader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

          // Convert to WAV format
          const wavBuffer = this.audioBufferToWav(audioBuffer);
          const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });

          resolve(wavBlob);
        } catch (error) {
          console.error('[AudioRecorder] Error converting to WAV:', error);
          reject(error);
        }
      };

      fileReader.onerror = () => reject(new Error('Failed to read audio file'));
      fileReader.readAsArrayBuffer(audioBlob);
    });
  }

  /**
   * Convert AudioBuffer to WAV format
   */
  private audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);

    // Convert audio data
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return arrayBuffer;
  }

  /**
   * Get file extension based on MIME type
   */
  private getFileExtension(mimeType: string): string {
    if (mimeType.includes('wav')) return 'wav';
    if (mimeType.includes('webm')) return 'webm';
    if (mimeType.includes('mp4')) return 'mp4';
    if (mimeType.includes('ogg')) return 'ogg';
    return 'audio';
  }

  /**
   * Handle recording errors and convert to user-friendly format
   */
  private handleRecordingError(err: any): AudioRecordingError {
    console.error('[AudioRecorder] Recording error:', err);

    let code = 'UNKNOWN_ERROR';
    let message = err.message || 'Unknown error occurred';
    let userMessage = 'Recording failed. Please try again.';
    let retryable = true;

    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      code = 'PERMISSION_DENIED';
      userMessage = 'Microphone permission denied. Please allow microphone access and try again.';
      retryable = false;
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      code = 'NO_MICROPHONE';
      userMessage = 'No microphone found. Please connect a microphone and try again.';
      retryable = false;
    } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      code = 'MICROPHONE_BUSY';
      userMessage = 'Microphone is being used by another application. Please close other apps and try again.';
      retryable = true;
    } else if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
      code = 'CONSTRAINTS_NOT_SUPPORTED';
      userMessage = 'Microphone constraints not supported. Trying with basic settings...';
      retryable = true;
    } else if (err.name === 'NotSupportedError') {
      code = 'NOT_SUPPORTED';
      userMessage = 'Audio recording not supported in this browser.';
      retryable = false;
    } else if (message.includes('network') || message.includes('timeout')) {
      code = 'NETWORK_ERROR';
      userMessage = 'Network connection issue. Please check your internet and try again.';
      retryable = true;
    }

    return { code, message, userMessage, retryable };
  }

  /**
   * Create a standardized error object
   */
  private createError(code: string, message: string, retryable: boolean = true): AudioRecordingError {
    const userMessages: { [key: string]: string } = {
      'ALREADY_RECORDING': 'Recording is already in progress.',
      'NOT_RECORDING': 'No active recording to stop.',
      'NOT_SUPPORTED': 'Audio recording is not supported in this browser.',
      'PROCESSING_FAILED': 'Failed to process recorded audio. Please try again.',
      'RECORDING_ERROR': 'Recording error occurred. Please try again.',
    };

    return {
      code,
      message,
      userMessage: userMessages[code] || message,
      retryable
    };
  }

  /**
   * Update status and notify callback
   */
  private updateStatus(state: AudioRecordingState, error?: AudioRecordingError): void {
    if (this.statusCallback) {
      this.statusCallback({
        state,
        duration: this.getCurrentDuration(),
        error,
        hasPermission: state !== 'error' || error?.code !== 'PERMISSION_DENIED'
      });
    }
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    console.log('[AudioRecorder] Cleaning up resources');

    // Stop MediaRecorder if active
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (err) {
        console.warn('[AudioRecorder] Error stopping MediaRecorder:', err);
      }
    }

    // Stop audio stream
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (err) {
          console.warn('[AudioRecorder] Error stopping audio track:', err);
        }
      });
      this.audioStream = null;
    }

    // Clear references
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.startTime = 0;
    this.isProcessing = false;
  }
}

/**
 * Utility function to convert uploaded audio files to optimal format
 */
export async function processUploadedAudioFile(
  file: File,
  preferredFormat: 'wav' | 'original' = 'wav'
): Promise<File> {
  console.log('[AudioRecorder] Processing uploaded audio file:', file.name, file.size, 'bytes');

  // Validate file type
  const allowedTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/webm', 'audio/m4a'];
  if (!file.type.startsWith('audio/') && !allowedTypes.some(type => file.type === type)) {
    throw new Error('Please upload a valid audio file (WAV, MP3, OGG, WebM, M4A)');
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error('Audio file too large. Please upload a file smaller than 10MB.');
  }

  // Validate file is not empty
  if (file.size < 1000) { // Less than 1KB is likely empty
    throw new Error('Audio file appears to be empty or corrupted.');
  }

  // Return original file if no conversion needed
  if (preferredFormat === 'original' || file.type === 'audio/wav') {
    return file;
  }

  // Convert to WAV if needed
  try {
    console.log('[AudioRecorder] Converting uploaded file to WAV format...');
    const arrayBuffer = await file.arrayBuffer();
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Use the same WAV conversion logic
    const recorder = new AudioRecorder();
    const wavBuffer = (recorder as any).audioBufferToWav(audioBuffer);
    const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });

    console.log('[AudioRecorder] File converted to WAV, new size:', wavBlob.size, 'bytes');
    return new File([wavBlob], 'converted.wav', { type: 'audio/wav' });
  } catch (conversionErr) {
    console.log('[AudioRecorder] File conversion failed, using original file:', conversionErr);
    return file; // Use original file if conversion fails
  }
}
