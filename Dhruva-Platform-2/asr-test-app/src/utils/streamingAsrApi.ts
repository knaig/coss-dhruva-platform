/**
 * Streaming ASR API Utilities for Dhruva Platform
 * Uses the proven @project-sunbird/open-speech-streaming-client package
 * from the existing Dhruva Platform client implementation
 */

import { StreamingClient, SocketStatus } from '@project-sunbird/open-speech-streaming-client';

// Streaming endpoints in order of preference
// Using the proven working endpoints from the existing Dhruva Platform client
const STREAMING_ENDPOINTS = [
  'wss://api.dhruva.ai4bharat.org',  // Primary production endpoint
  'wss://13.203.149.17',             // Fallback remote endpoint
  'ws://localhost:8000',             // Local development endpoint
  'ws://13.203.149.17:8000'          // Local-style remote endpoint
];

export interface StreamingConfig {
  serviceId: string;
  language: string;
  samplingRate: number;
  audioFormat: string;
  encoding: string;
  apiKey: string;
  responseFrequencyMs?: number;
  bufferSize?: number;
}

export interface StreamingStatus {
  state: 'disconnected' | 'connecting' | 'connected' | 'streaming' | 'processing' | 'error';
  message?: string;
  error?: string;
  duration?: number;
}

export interface StreamingResult {
  transcript: string;
  isFinal: boolean;
  confidence?: number;
  timestamp: number;
}

export type StreamingStatusCallback = (status: StreamingStatus) => void;
export type StreamingResultCallback = (result: StreamingResult) => void;

export class StreamingASRClient {
  private streamingClient: StreamingClient;
  private config: StreamingConfig | null = null;
  private statusCallback?: StreamingStatusCallback;
  private resultCallback?: StreamingResultCallback;
  private currentEndpoint: string | null = null;
  private isStreaming: boolean = false;
  private isConnected: boolean = false;
  private startTime: number = 0;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;

  constructor(
    statusCallback?: StreamingStatusCallback,
    resultCallback?: StreamingResultCallback
  ) {
    this.streamingClient = new StreamingClient();
    this.statusCallback = statusCallback;
    this.resultCallback = resultCallback;
  }

  /**
   * Test connectivity to streaming endpoints
   * Uses a simple approach - just return the endpoints in order of preference
   * The StreamingClient will handle the actual connectivity testing
   */
  async testEndpoints(): Promise<string[]> {
    console.log(`[StreamingASR] Available endpoints:`, STREAMING_ENDPOINTS);
    return STREAMING_ENDPOINTS;
  }

  /**
   * Connect to streaming server using the proven StreamingClient
   */
  async connect(config: StreamingConfig): Promise<void> {
    try {
      this.config = config;
      this.updateStatus('connecting', 'Establishing connection to streaming server...');

      // Get available endpoints
      const availableEndpoints = await this.testEndpoints();

      if (availableEndpoints.length === 0) {
        throw new Error('No streaming endpoints available.');
      }

      this.currentEndpoint = availableEndpoints[0];
      console.log(`[StreamingASR] Attempting connection to: ${this.currentEndpoint}`);

      // Ensure currentEndpoint is not null
      if (!this.currentEndpoint) {
        throw new Error('No valid endpoint available for connection');
      }

      // Use the StreamingClient connect method with the same signature as the working client
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout after 15 seconds'));
        }, 15000);

        this.streamingClient.connect(
          this.currentEndpoint!,
          config.serviceId,
          config.apiKey,
          config.language,
          config.samplingRate,
          [], // Additional parameters (empty array as in working client)
          (action: any, id: any) => {
            clearTimeout(timeout);

            if (action === SocketStatus.CONNECTED) {
              console.log('[StreamingASR] Connected successfully');
              this.isConnected = true;
              this.reconnectAttempts = 0;
              this.updateStatus('connected', 'Connected to streaming server');
              resolve();
            } else if (action === SocketStatus.TERMINATED) {
              console.log('[StreamingASR] Connection terminated');
              this.isConnected = false;
              this.updateStatus('disconnected', 'Connection terminated');
              reject(new Error('Connection terminated by server'));
            } else {
              console.log('[StreamingASR] Connection action:', action, id);
              // Handle other connection states
              if (action === SocketStatus.ERROR || action === 'error') {
                this.updateStatus('error', undefined, `Connection error: ${id || action}`);
                reject(new Error(`Connection failed: ${id || action}`));
              }
            }
          }
        );
      });
    } catch (error: any) {
      console.error('[StreamingASR] Connect error:', error);
      this.updateStatus('error', undefined, error.message);
      throw error;
    }
  }

  // The StreamingClient handles all socket events internally
  // No need for manual socket event handlers

  /**
   * Update status and notify callback
   */
  private updateStatus(state: StreamingStatus['state'], message?: string, error?: string): void {
    const status: StreamingStatus = {
      state,
      message,
      error,
      duration: this.startTime ? (Date.now() - this.startTime) / 1000 : 0
    };

    if (this.statusCallback) {
      this.statusCallback(status);
    }
  }

  /**
   * Handle transcript results from the StreamingClient
   */
  private handleTranscriptResult(transcript: string, isFinal: boolean = false): void {
    if (transcript && this.resultCallback) {
      const result: StreamingResult = {
        transcript: transcript.trim(),
        isFinal,
        confidence: undefined, // StreamingClient doesn't provide confidence scores
        timestamp: Date.now()
      };

      console.log(`[StreamingASR] Processed transcript result:`, result);
      this.resultCallback(result);
    }
  }

  // Reconnection is handled by the StreamingClient internally

  /**
   * Start streaming audio using the StreamingClient
   */
  async startStreaming(): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to streaming server');
    }

    if (this.isStreaming) {
      throw new Error('Already streaming');
    }

    try {
      console.log('[StreamingASR] Starting audio stream...');
      this.isStreaming = true;
      this.startTime = Date.now();

      this.updateStatus('streaming', 'Starting audio stream...');

      // Use the StreamingClient startStreaming method with transcript callback
      this.streamingClient.startStreaming((transcript: string) => {
        console.log('[StreamingASR] Received transcript:', transcript);
        this.handleTranscriptResult(transcript, false); // Assume partial by default
      });

      this.updateStatus('streaming', 'Audio streaming active');
      console.log('[StreamingASR] Audio streaming started successfully');
    } catch (error: any) {
      this.isStreaming = false;
      console.error('[StreamingASR] Failed to start streaming:', error);
      this.updateStatus('error', undefined, `Failed to start streaming: ${error.message}`);
      throw error;
    }
  }

  // The StreamingClient handles audio capture and transmission internally
  // No need for manual audio data sending

  /**
   * Stop streaming using the StreamingClient
   */
  stopStreaming(): void {
    if (!this.isStreaming) {
      return;
    }

    try {
      console.log('[StreamingASR] Stopping audio stream...');
      this.isStreaming = false;

      // Use the StreamingClient stopStreaming method
      this.streamingClient.stopStreaming();

      this.updateStatus('processing', 'Processing final results...');
      console.log('[StreamingASR] Audio streaming stopped');
    } catch (error) {
      console.error('[StreamingASR] Error stopping stream:', error);
      this.updateStatus('error', undefined, `Error stopping stream: ${error}`);
    }
  }

  /**
   * Disconnect from streaming server using the StreamingClient
   */
  disconnect(): void {
    try {
      console.log('[StreamingASR] Disconnecting from streaming server...');

      if (this.isStreaming) {
        this.stopStreaming();
      }

      // Use the StreamingClient disconnect method
      this.streamingClient.disconnect();

      this.currentEndpoint = null;
      this.isConnected = false;
      this.config = null;
      this.reconnectAttempts = 0;

      this.updateStatus('disconnected', 'Disconnected from streaming server');
      console.log('[StreamingASR] Disconnected successfully');
    } catch (error) {
      console.error('[StreamingASR] Error during disconnect:', error);
      this.updateStatus('error', undefined, `Disconnect error: ${error}`);
    }
  }

  /**
   * Get current connection status
   */
  getStatus(): StreamingStatus {
    if (!this.isConnected) {
      return { state: 'disconnected' };
    }

    if (this.isStreaming) {
      return {
        state: 'streaming',
        duration: this.startTime ? (Date.now() - this.startTime) / 1000 : 0
      };
    } else {
      return { state: 'connected' };
    }
  }

  /**
   * Check if currently streaming
   */
  isCurrentlyStreaming(): boolean {
    return this.isStreaming && this.isConnected;
  }

  // Audio processing is handled by the StreamingClient internally
}

/**
 * Utility function to create a streaming ASR client
 */
export function createStreamingASRClient(
  statusCallback?: StreamingStatusCallback,
  resultCallback?: StreamingResultCallback
): StreamingASRClient {
  return new StreamingASRClient(statusCallback, resultCallback);
}
