# 🎤 Enhanced Dhruva Platform ASR Tester

A comprehensive standalone React application for testing the Automatic Speech Recognition (ASR) functionality of the Dhruva Platform. This enhanced version includes streaming ASR capabilities and configurable sampling rates for thorough ASR testing.

## 🚀 Enhanced Features

### Core Functionality
- **🎤 Live Microphone Recording**: Real-time audio recording with ASR processing
- **📁 File Upload Testing**: Upload audio files for ASR processing
- **🌊 Streaming ASR**: Real-time streaming ASR with live transcription using Socket.IO
- **🔄 Audio Format Conversion**: Automatic conversion to configurable sample rates (8kHz, 16kHz, 48kHz)
- **🌐 Multi-language Support**: Support for 12+ Indian languages plus English
- **📊 Comprehensive Logging**: Detailed debug logs for troubleshooting
- **⚙️ Configurable Sampling Rates**: Choose between 8kHz, 16kHz, and 48kHz for all ASR methods

### Technical Features
- **Cross-browser Compatibility**: Works with modern browsers (Chrome, Firefox, Safari)
- **Robust Error Handling**: Comprehensive error handling with user-friendly messages
- **Permission Management**: Microphone permission checking and handling
- **Audio Processing**: Advanced audio processing using AudioContext and OfflineAudioContext
- **API Integration**: Direct integration with Dhruva Platform ASR endpoints
- **Socket.IO Streaming**: Real-time streaming ASR with WebSocket connectivity

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Modern web browser with microphone support
- Access to Dhruva Platform backend (local or remote)

### Quick Start

1. **Navigate to the application directory:**
   ```bash
   cd Dhruva-Platform-2/asr-test-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

4. **Open in browser:**
   The application will automatically open at `http://localhost:3001` (or the next available port)

## 🔧 Configuration

### Backend Endpoints
The application automatically tests these endpoints in order of preference:

**Batch ASR Endpoints:**
1. `http://13.203.149.17:8000` (Primary)
2. `http://localhost:8000` (Local development)
3. `https://13.203.149.17:8000` (HTTPS fallback)

**Streaming ASR Endpoints:**
1. `ws://localhost:8000/socket.io` (Primary streaming)
2. `ws://localhost:8000/socket_asr.io` (Legacy streaming)
3. `ws://13.203.149.17:8000/socket.io` (Remote streaming)
4. `ws://13.203.149.17:8000/socket_asr.io` (Remote legacy)

### API Configuration
- **Default API Key**: Pre-configured with a default key
- **Service ID**: `ai4bharat/indictasr` (default)
- **Audio Formats**: WAV, 8kHz/16kHz/48kHz, mono
- **Supported Languages**: Hindi, English, Bengali, Gujarati, Kannada, Malayalam, Marathi, Odia, Punjabi, Tamil, Telugu, Urdu

### Sampling Rate Options
- **8kHz**: Telephone quality (8000 Hz) - Suitable for basic speech recognition
- **16kHz**: Standard ASR quality (16000 Hz) - Recommended for most use cases
- **48kHz**: High quality audio (48000 Hz) - Best quality for detailed analysis

## 📱 Usage Guide

### Configuration Panel
1. **Language Selection**: Choose from 12+ supported languages
2. **Service Selection**: Select ASR service (AI4Bharat IndicASR, Conformer, etc.)
3. **Sampling Rate**: Choose audio quality (8kHz, 16kHz, or 48kHz)
4. **API Key**: Enter your custom API key if needed

### Microphone Testing
1. **Check Permissions**: Click "Check Permission" to verify microphone access
2. **Start Recording**: Click "Start Recording" to begin audio capture
3. **Stop Recording**: Click "Stop Recording" to end capture and process audio
4. **View Results**: Transcription results will appear in the results panel

### File Upload Testing
1. **Select File**: Click "Select Audio File" to choose an audio file
2. **Automatic Processing**: The file will be automatically processed and converted
3. **ASR Processing**: The converted audio will be sent to the ASR service
4. **View Results**: Transcription results will appear in the results panel

### Streaming ASR Testing
1. **Connect**: Click "Connect" to establish connection to streaming server
2. **Start Streaming**: Click "Start Streaming" to begin real-time ASR
3. **Live Transcription**: View partial and final transcripts in real-time
4. **Stop Streaming**: Click "Stop Streaming" to end the session
5. **Disconnect**: Click "Disconnect" to close the connection

## 🔍 Debugging & Troubleshooting

### Debug Logs
The application provides comprehensive logging in the "Debug Logs" panel:
- Audio recording events
- File processing steps
- API requests and responses
- Streaming connection events
- Error messages and stack traces

### Common Issues

#### Microphone Not Working
- Check browser permissions for microphone access
- Ensure you're using HTTPS or localhost
- Try refreshing the page and granting permissions again

#### ASR Processing Fails
- Verify the backend endpoint is accessible
- Check the API key is valid
- Ensure the audio file is in a supported format
- Check the debug logs for detailed error information

#### Streaming Connection Issues
- Ensure the Dhruva Platform server is running
- Check if streaming endpoints are accessible
- Verify WebSocket support in your browser
- Check firewall settings for WebSocket connections

#### Audio Conversion Issues
- Ensure your browser supports AudioContext
- Try using a different audio file format
- Check if the file size is within limits (50MB max)
- Try different sampling rates

### Browser Compatibility
- **Chrome**: Full support ✅
- **Firefox**: Full support ✅
- **Safari**: Full support ✅
- **Edge**: Full support ✅
- **Mobile browsers**: Limited support ⚠️

## 🏗️ Architecture

### Component Structure
```
src/
├── components/
│   ├── ASRTester.tsx          # Main testing component
│   └── ASRTester.css          # Component styles
├── utils/
│   ├── audioUtils.ts          # Audio recording and processing
│   ├── asrApi.ts             # Batch ASR API integration
│   └── streamingAsrApi.ts    # Streaming ASR API integration
└── App.tsx                   # Main application
```

### Key Technologies
- **React 18** with TypeScript
- **Socket.IO Client** for streaming ASR
- **AudioContext API** for audio processing
- **MediaRecorder API** for audio recording
- **Axios** for HTTP requests
- **CSS Grid & Flexbox** for responsive layout

## 🧪 Testing Features

### Microphone Diagnostics
- Permission status checking
- Recording state monitoring
- Audio quality validation
- Format conversion verification
- Real-time streaming capability

### File Processing Validation
- File type validation
- Size limit enforcement
- Format conversion testing
- Base64 encoding verification
- Multi-sampling rate support

### Streaming ASR Testing
- WebSocket connection testing
- Real-time transcription validation
- Partial vs final transcript handling
- Connection resilience testing
- Multi-endpoint failover

### API Integration Testing
- Endpoint connectivity testing
- Authentication validation
- Request/response logging
- Error handling verification
- Retry mechanism testing

## 📊 Performance Considerations

### Audio Processing
- Efficient sample rate conversion using OfflineAudioContext
- Chunked data collection during recording
- Memory management for large files
- Automatic cleanup of audio resources
- Optimized streaming buffer management

### Network Optimization
- Retry logic for failed requests
- Timeout handling for slow connections
- Compressed audio transmission
- Connection pooling for multiple requests
- WebSocket connection management

## 🔒 Security & Privacy

### Data Handling
- Audio data is processed locally in the browser
- No audio data is stored permanently
- API keys are handled securely
- HTTPS support for secure transmission
- WebSocket security for streaming

### Privacy Features
- Microphone access is explicitly requested
- Users can cancel recording at any time
- Audio data is cleared after processing
- No tracking or analytics
- Streaming connections are properly closed

## 🚀 Deployment

### Development Build
```bash
npm start
```

### Production Build
```bash
npm run build
npm install -g serve
serve -s build
```

### Docker Deployment
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🆘 Support

For issues related to:
- **ASR functionality**: Check Dhruva Platform documentation
- **Audio recording**: Verify browser compatibility and permissions
- **Streaming connectivity**: Ensure backend services are running
- **API connectivity**: Ensure backend services are running
- **General bugs**: Check the debug logs for detailed error information

---

**Built with ❤️ for comprehensive ASR testing on the Dhruva Platform ecosystem**
