/**
 * React Hook for Audio Recording
 * 
 * This hook provides a simple interface for audio recording in React components
 * using the unified AudioRecorder utility.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  AudioRecorder, 
  AudioRecordingConfig, 
  AudioRecordingResult, 
  AudioRecordingStatus,
  AudioRecordingError 
} from '../utils/audioRecording';

export interface UseAudioRecordingOptions extends AudioRecordingConfig {
  onRecordingComplete?: (result: AudioRecordingResult) => void;
  onError?: (error: AudioRecordingError) => void;
  autoStop?: boolean; // Auto-stop when max duration is reached
}

export interface UseAudioRecordingReturn {
  // State
  isRecording: boolean;
  isProcessing: boolean;
  duration: number;
  error: AudioRecordingError | null;
  hasPermission: boolean;
  isSupported: boolean;

  // Actions
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<AudioRecordingResult | null>;
  cancelRecording: () => void;
  clearError: () => void;
  checkPermission: () => Promise<'granted' | 'denied' | 'prompt'>;

  // Status
  status: AudioRecordingStatus | null;
}

export function useAudioRecording(options: UseAudioRecordingOptions = {}): UseAudioRecordingReturn {
  const [status, setStatus] = useState<AudioRecordingStatus | null>(null);
  const [error, setError] = useState<AudioRecordingError | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const autoStopTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize recorder
  useEffect(() => {
    recorderRef.current = new AudioRecorder(options);
    
    // Set up status callback
    recorderRef.current.onStatusChange((newStatus) => {
      setStatus(newStatus);
      
      if (newStatus.error) {
        setError(newStatus.error);
        options.onError?.(newStatus.error);
      } else {
        setError(null);
      }
    });

    return () => {
      if (recorderRef.current) {
        recorderRef.current.cancelRecording();
      }
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
      }
    };
  }, []);

  // Auto-stop timer
  useEffect(() => {
    if (options.autoStop && status?.state === 'recording' && options.maxDuration) {
      autoStopTimerRef.current = setTimeout(() => {
        stopRecording();
      }, options.maxDuration * 1000);
    }

    return () => {
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
        autoStopTimerRef.current = null;
      }
    };
  }, [status?.state, options.autoStop, options.maxDuration]);

  const startRecording = useCallback(async () => {
    if (!recorderRef.current) return;
    
    try {
      setError(null);
      await recorderRef.current.startRecording();
    } catch (err) {
      // Error is already handled by the status callback
      console.error('[useAudioRecording] Start recording failed:', err);
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<AudioRecordingResult | null> => {
    if (!recorderRef.current) return null;

    try {
      const result = await recorderRef.current.stopRecording();
      options.onRecordingComplete?.(result);
      return result;
    } catch (err) {
      // Error is already handled by the status callback
      console.error('[useAudioRecording] Stop recording failed:', err);
      return null;
    }
  }, [options.onRecordingComplete]);

  const cancelRecording = useCallback(() => {
    if (!recorderRef.current) return;
    
    recorderRef.current.cancelRecording();
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const checkPermission = useCallback(async (): Promise<'granted' | 'denied' | 'prompt'> => {
    if (!recorderRef.current) return 'denied';
    
    return await recorderRef.current.checkPermission();
  }, []);

  return {
    // State
    isRecording: status?.state === 'recording',
    isProcessing: status?.state === 'processing',
    duration: status?.duration || 0,
    error,
    hasPermission: status?.hasPermission || false,
    isSupported: AudioRecorder.isSupported(),

    // Actions
    startRecording,
    stopRecording,
    cancelRecording,
    clearError,
    checkPermission,

    // Status
    status,
  };
}

/**
 * Hook for handling audio file uploads with processing
 */
export function useAudioFileUpload() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback(async (
    file: File,
    preferredFormat: 'wav' | 'original' = 'wav'
  ): Promise<File | null> => {
    setIsProcessing(true);
    setError(null);

    try {
      const { processUploadedAudioFile } = await import('../utils/audioRecording');
      const processedFile = await processUploadedAudioFile(file, preferredFormat);
      return processedFile;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process audio file';
      setError(errorMessage);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    processFile,
    isProcessing,
    error,
    clearError,
  };
}

/**
 * Utility hook for audio playback
 */
export function useAudioPlayback() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback((audioFile: File | Blob | string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio();
    audioRef.current = audio;

    if (typeof audioFile === 'string') {
      audio.src = audioFile;
    } else {
      audio.src = URL.createObjectURL(audioFile);
    }

    audio.onloadedmetadata = () => {
      setDuration(audio.duration);
    };

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.onplay = () => {
      setIsPlaying(true);
    };

    audio.onpause = () => {
      setIsPlaying(false);
    };

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.onerror = (err) => {
      console.error('Audio playback error:', err);
      setIsPlaying(false);
    };

    audio.play().catch(err => {
      console.error('Failed to play audio:', err);
      setIsPlaying(false);
    });
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setCurrentTime(0);
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        if (audioRef.current.src.startsWith('blob:')) {
          URL.revokeObjectURL(audioRef.current.src);
        }
      }
    };
  }, []);

  return {
    play,
    pause,
    stop,
    isPlaying,
    duration,
    currentTime,
  };
}
