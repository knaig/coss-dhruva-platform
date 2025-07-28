declare module '@project-sunbird/open-speech-streaming-client' {
  export enum SocketStatus {
    CONNECTED = 'connected',
    TERMINATED = 'terminated',
    ERROR = 'error'
  }

  export class StreamingClient {
    constructor();
    connect(
      endpoint: string,
      serviceId: string,
      apiKey: string,
      language: string,
      sampleRate: number,
      additionalParams: any[],
      callback: (action: any, id: any) => void
    ): void;
    startStreaming(transcriptCallback: (transcript: string) => void): void;
    stopStreaming(): void;
    disconnect(): void;
  }
}
