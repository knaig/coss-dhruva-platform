/**
 * Audio Utilities for ASR Testing
 * Based on the Dhruva Platform audio processing implementation
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

export interface SamplingRateOption {
  value: number;
  label: string;
  description: string;
}

// Available sampling rate options
export const SAMPLING_RATE_OPTIONS: SamplingRateOption[] = [
  { value: 8000, label: '8kHz', description: 'Telephone quality (8000 Hz)' },
  { value: 16000, label: '16kHz', description: 'Standard ASR quality (16000 Hz)' },
  { value: 48000, label: '48kHz', description: 'High quality audio (48000 Hz)' }
];

export interface AudioRecordingResult {
  blob: Blob;
  duration: number;
  size: number;
  format: string;
  base64: string;
}

export interface AudioRecordingStatus {
  state: 'idle' | 'recording' | 'processing' | 'completed' | 'error';
  duration: number;
  hasPermission: boolean;
  error?: string;
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private recordedChunks: Blob[] = [];
  private startTime: number = 0;
  private config: AudioRecordingConfig;
  private statusCallback?: (status: AudioRecordingStatus) => void;

  constructor(config: AudioRecordingConfig = {}, statusCallback?: (status: AudioRecordingStatus) => void) {
    this.config = {
      sampleRate: config.sampleRate || 16000, // Default to 16kHz but allow override
      channelCount: 1,
      maxDuration: 300, // 5 minutes
      maxFileSize: 50 * 1024 * 1024, // 50MB
      preferredFormat: 'wav',
      enableEchoCancellation: true,
      enableNoiseSuppression: true,
      enableAutoGainControl: true,
      ...config
    };
    this.statusCallback = statusCallback;
  }

  static isSupported(): boolean {
    return !!(navigator.mediaDevices &&
              typeof navigator.mediaDevices.getUserMedia === 'function' &&
              window.MediaRecorder &&
              (window.AudioContext || (window as any).webkitAudioContext));
  }

  async checkPermission(): Promise<'granted' | 'denied' | 'prompt'> {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return result.state;
    } catch (error) {
      console.warn('[AudioRecorder] Permission API not supported, checking via getUserMedia');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        return 'granted';
      } catch (err) {
        return 'denied';
      }
    }
  }

  private updateStatus(state: AudioRecordingStatus['state'], error?: string) {
    if (this.statusCallback) {
      this.statusCallback({
        state,
        duration: this.startTime ? (Date.now() - this.startTime) / 1000 : 0,
        hasPermission: !!this.audioStream,
        error
      });
    }
  }

  private getOptimalMediaRecorderOptions(): MediaRecorderOptions {
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/wav'
    ];

    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        console.log(`[AudioRecorder] Using MIME type: ${mimeType}`);
        return { mimeType };
      }
    }

    console.warn('[AudioRecorder] No optimal MIME type found, using default');
    return {};
  }

  async startRecording(): Promise<void> {
    try {
      this.updateStatus('recording');
      
      // Request microphone access
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: this.config.enableEchoCancellation,
          noiseSuppression: this.config.enableNoiseSuppression,
          autoGainControl: this.config.enableAutoGainControl,
          sampleRate: this.config.sampleRate,
          channelCount: this.config.channelCount
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
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
          console.log(`[AudioRecorder] Data chunk received: ${event.data.size} bytes`);
        }
      };

      this.mediaRecorder.onstop = () => {
        console.log('[AudioRecorder] Recording stopped');
        this.updateStatus('processing');
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('[AudioRecorder] MediaRecorder error:', event);
        this.updateStatus('error', 'Recording failed');
      };

      // Start recording
      this.mediaRecorder.start(500); // Collect data every 500ms
      this.startTime = Date.now();

      console.log('[AudioRecorder] Recording started successfully');
    } catch (error) {
      console.error('[AudioRecorder] Failed to start recording:', error);
      this.updateStatus('error', `Failed to start recording: ${error}`);
      throw error;
    }
  }

  async stopRecording(): Promise<AudioRecordingResult> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        reject(new Error('No active recording to stop'));
        return;
      }

      this.mediaRecorder.onstop = async () => {
        try {
          console.log('[AudioRecorder] Processing recorded audio...');
          
          if (this.recordedChunks.length === 0) {
            throw new Error('No audio data recorded');
          }

          // Create blob from recorded chunks
          const audioBlob = new Blob(this.recordedChunks, { 
            type: this.mediaRecorder?.mimeType || 'audio/webm' 
          });

          console.log(`[AudioRecorder] Raw audio blob: ${audioBlob.size} bytes, type: ${audioBlob.type}`);

          // Convert to WAV format for ASR compatibility
          const wavBlob = await this.convertToWav(audioBlob);
          const base64 = await this.blobToBase64(wavBlob);

          const result: AudioRecordingResult = {
            blob: wavBlob,
            duration: (Date.now() - this.startTime) / 1000,
            size: wavBlob.size,
            format: 'wav',
            base64: base64.split(',')[1] // Remove data:audio/wav;base64, prefix
          };

          console.log(`[AudioRecorder] Final result: ${result.size} bytes, ${result.duration.toFixed(2)}s`);
          
          this.cleanup();
          this.updateStatus('completed');
          resolve(result);
        } catch (error) {
          console.error('[AudioRecorder] Error processing recording:', error);
          this.updateStatus('error', `Processing failed: ${error}`);
          reject(error);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  cancelRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.cleanup();
    this.updateStatus('idle');
  }

  private cleanup(): void {
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.startTime = 0;
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Convert audio blob to WAV format with 16kHz resampling for optimal ASR compatibility
   */
  private async convertToWav(audioBlob: Blob): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        // Convert to target sample rate mono for optimal ASR compatibility
        this.convertToTargetSampleRate(audioBlob, this.config.sampleRate).then(resolve).catch(reject);
      } catch (error) {
        console.error('[AudioRecorder] Error converting to WAV:', error);
        reject(error);
      }
    });
  }

  /**
   * Convert audio blob to specified sample rate mono WAV format using AudioContext and OfflineAudioContext
   * This provides the highest quality conversion for ASR compatibility
   */
  private async convertToTargetSampleRate(blob: Blob, targetSampleRate: number = 16000): Promise<Blob> {
    return new Promise((resolve, reject) => {
      // Check browser support
      if (!window.AudioContext && !(window as any).webkitAudioContext) {
        reject(new Error('AudioContext not supported in this browser. Please use a modern browser.'));
        return;
      }

      if (!window.OfflineAudioContext) {
        reject(new Error('OfflineAudioContext not supported in this browser. Audio conversion may not work properly.'));
        return;
      }

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const reader = new FileReader();

      reader.onload = async () => {
        try {
          const arrayBuffer = reader.result as ArrayBuffer;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

          if (!audioBuffer || audioBuffer.length === 0) {
            throw new Error('Invalid audio data - no audio buffer generated');
          }

          console.log(`[convertToTargetSampleRate] Original: ${audioBuffer.sampleRate}Hz, ${audioBuffer.numberOfChannels}ch, ${audioBuffer.duration.toFixed(2)}s`);

          // Create offline context for target sample rate mono conversion
          const targetChannels = 1;
          const duration = audioBuffer.duration;

          if (duration > 300) { // 5 minutes
            console.warn('[convertTo16kHzMono] Audio file is very long, conversion may take time...');
          }

          const offlineContext = new OfflineAudioContext(
            targetChannels,
            duration * targetSampleRate,
            targetSampleRate
          );

          // Create buffer source
          const source = offlineContext.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(offlineContext.destination);
          source.start(0);

          console.log(`[convertToTargetSampleRate] Rendering audio at ${targetSampleRate}Hz mono...`);

          // Render the audio at target sample rate
          const renderedBuffer = await offlineContext.startRendering();

          if (!renderedBuffer || renderedBuffer.length === 0) {
            throw new Error('Audio rendering failed - no output generated');
          }

          console.log(`[convertToTargetSampleRate] Encoding to WAV format...`);

          // Encode the rendered buffer to WAV format
          const wavBuffer = this.audioBufferToWav(renderedBuffer);
          const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });

          if (wavBlob.size === 0) {
            throw new Error('WAV encoding failed - no output generated');
          }

          console.log(`[convertToTargetSampleRate] Converted to ${targetSampleRate}Hz mono WAV: ${wavBlob.size} bytes`);
          resolve(wavBlob);
        } catch (error) {
          console.error('[convertToTargetSampleRate] Conversion error:', error);
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read audio blob'));
      reader.readAsArrayBuffer(blob);
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

    const floatTo16BitPCM = (output: DataView, offset: number, input: Float32Array) => {
      for (let i = 0; i < input.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, input[i]));
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
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

    let offset = 44;
    for (let i = 0; i < numberOfChannels; i++) {
      floatTo16BitPCM(view, offset, buffer.getChannelData(i));
      offset += length * 2;
    }

    return arrayBuffer;
  }
}

/**
 * Standalone utility function to convert any audio blob to specified sample rate mono WAV format
 * This function can be used across all components for consistent audio processing
 */
export async function convertToTargetSampleRate(blob: Blob, targetSampleRate: number = 16000): Promise<Blob> {
  const recorder = new AudioRecorder({ sampleRate: targetSampleRate });
  return (recorder as any).convertToTargetSampleRate(blob, targetSampleRate);
}

/**
 * Legacy function for backward compatibility
 */
export async function convertTo16kHzMono(blob: Blob): Promise<Blob> {
  return convertToTargetSampleRate(blob, 16000);
}

/**
 * Utility function to process uploaded audio files for ASR compatibility
 */
export async function processAudioFile(file: File, targetSampleRate: number = 16000): Promise<File> {
  console.log('[AudioRecorder] Processing uploaded file:', file.name, file.type, file.size, 'bytes');

  // Validate file
  if (!file.type.startsWith('audio/')) {
    throw new Error('Please select a valid audio file');
  }

  if (file.size > 50 * 1024 * 1024) { // 50MB limit
    throw new Error('File size too large. Please select a file smaller than 50MB');
  }

  // Convert to target sample rate WAV for optimal ASR compatibility
  try {
    console.log(`[AudioRecorder] Converting uploaded file to ${targetSampleRate}Hz WAV format...`);
    const convertedBlob = await convertToTargetSampleRate(file, targetSampleRate);
    console.log(`[AudioRecorder] File converted to ${targetSampleRate}Hz WAV, new size:`, convertedBlob.size, 'bytes');
    return new File([convertedBlob], 'converted.wav', { type: 'audio/wav' });
  } catch (conversionErr) {
    console.log('[AudioRecorder] File conversion failed, using original file:', conversionErr);
    return file; // Use original file if conversion fails
  }
}
