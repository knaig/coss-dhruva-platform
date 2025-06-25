# Dhruva API Load Testing Script

This script performs load testing on the Dhruva APIs (Translation, TTS, and ASR) by sending 2 requests per minute to each service.

## Features

- Tests Translation (Hindi to English)
- Tests Text-to-Speech (Hindi)
- Tests Speech-to-Text (Hindi)
- Detailed logging with response times
- Error handling and reporting
- JSON log file generation

## Prerequisites

- Node.js (v14 or higher)
- npm

## Setup

1. Install dependencies:
```bash
npm install
```

2. Place a sample Hindi audio file named `sample-hindi.wav` in the scripts directory for ASR testing.

## Running the Tests

Start the load test:
```bash
npm start
```

The script will:
- Send 2 requests per minute to each API
- Log results to console and `load-test-logs.json`
- Continue running until stopped with Ctrl+C

## Logging

Results are logged in two ways:
1. Console output with real-time status
2. JSON file (`load-test-logs.json`) with detailed information including:
   - Timestamp
   - Service name
   - Success/failure status
   - Response time
   - Request ID
   - Full response data or error details

## Stopping the Tests

Press Ctrl+C to stop the tests. The script will:
- Clear the test interval
- Log the final timestamp
- Exit gracefully 