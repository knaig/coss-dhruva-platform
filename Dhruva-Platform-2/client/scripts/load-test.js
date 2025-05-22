const axios = require('axios');
const fs = require('fs');
const path = require('path');

// API endpoints
const TRANSLATION_ENDPOINT = "http://13.203.149.17:8000/services/inference/translation";
const TTS_ENDPOINT = "http://13.203.149.17:8000/services/inference/tts";
const ASR_ENDPOINT = "http://13.203.149.17:8000/services/inference/asr";

// Auth token
const AUTH_TOKEN = "Xhf5jWXfkam42bKqEk5PgIusSDsgamh4y0gRL7zs1xUINKQbyI7LX0L02mpMtv09";

// Sample Hindi text for testing
const HINDI_TEXTS = [
  "नमस्ते, मैं एक कृत्रिम बुद्धिमत्ता सहायक हूं",
  "मैं आपकी कैसे मदद कर सकता हूं?",
  "क्या आप मुझे कुछ जानकारी दे सकते हैं?",
  "मुझे आपकी बात समझ में आ रही है",
  "क्या आप इसे दोबारा समझा सकते हैं?",
  "मैं आपकी बात सुन रहा हूं",
  "कृपया थोड़ा धीरे बोलें",
  "मैं आपकी मदद करने के लिए तैयार हूं",
  "क्या आप इस विषय पर और जानकारी दे सकते हैं?",
  "मुझे आपकी बात समझने में कुछ समय लगेगा",
  "क्या आप इसे एक उदाहरण के साथ समझा सकते हैं?",
  "मैं आपकी सहायता के लिए हमेशा उपलब्ध हूं",
  "क्या आप इस समस्या का समाधान बता सकते हैं?",
  "मुझे आपकी प्रतिक्रिया का इंतज़ार है",
  "क्या आप इस विषय पर अपना विचार साझा कर सकते हैं?"
];

// Headers for API requests
const headers = {
  accept: "application/json",
  "x-auth-source": "API_KEY",
  Authorization: AUTH_TOKEN,
  "Content-Type": "application/json"
};

// Function to log results with enhanced details
function logResult(service, success, response, error) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    service,
    success,
    requestId: Math.random().toString(36).substring(7),
    responseTime: response?.responseTime || null,
    response: success ? {
      status: response?.status,
      data: response?.data,
      headers: response?.headers
    } : null,
    error: error ? {
      message: error.message,
      code: error.code,
      stack: error.stack
    } : null
  };
  
  const logFile = path.join(__dirname, 'load-test-logs.json');
  let logs = [];
  
  try {
    if (fs.existsSync(logFile)) {
      logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading log file:', err);
  }
  
  logs.push(logEntry);
  fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
  
  // Enhanced console output
  console.log(`[${timestamp}] ${service.toUpperCase()}:`);
  console.log(`  Status: ${success ? '✅ Success' : '❌ Failed'}`);
  if (success) {
    console.log(`  Response Time: ${response?.responseTime || 'N/A'}ms`);
    console.log(`  Request ID: ${logEntry.requestId}`);
  } else {
    console.log(`  Error: ${error.message}`);
  }
  console.log('----------------------------------------');
}

// Translation test with timing
async function testTranslation() {
  const text = HINDI_TEXTS[Math.floor(Math.random() * HINDI_TEXTS.length)];
  const startTime = Date.now();
  try {
    const response = await axios.post(TRANSLATION_ENDPOINT, {
      controlConfig: { dataTracking: true },
      config: {
        serviceId: "ai4bharat/indictrans--gpu-t4",
        language: {
          sourceLanguage: "hi",
          sourceScriptCode: "Deva",
          targetLanguage: "en",
          targetScriptCode: "Latn"
        }
      },
      input: [{ source: text }]
    }, { headers });
    
    response.responseTime = Date.now() - startTime;
    logResult('translation', true, response);
  } catch (error) {
    logResult('translation', false, null, error);
  }
}

// TTS test with timing
async function testTTS() {
  const text = HINDI_TEXTS[Math.floor(Math.random() * HINDI_TEXTS.length)];
  const startTime = Date.now();
  try {
    const response = await axios.post(TTS_ENDPOINT, {
      input: [{ source: text }],
      config: {
        serviceId: "ai4bharat/indictts--gpu-t4",
        gender: "male",
        samplingRate: 22050,
        audioFormat: "wav",
        language: {
          sourceLanguage: "hi"
        }
      },
      controlConfig: { dataTracking: true }
    }, { headers });
    
    response.responseTime = Date.now() - startTime;
    logResult('tts', true, response);
  } catch (error) {
    logResult('tts', false, null, error);
  }
}

// ASR test with timing
async function testASR() {
  const startTime = Date.now();
  try {
    const audioFile = path.join(__dirname, 'sample-hindi.wav');
    const audioData = fs.readFileSync(audioFile);
    const base64Audio = audioData.toString('base64');

    const response = await axios.post(ASR_ENDPOINT, {
      audio: [{ audioContent: base64Audio }],
      config: {
        language: { sourceLanguage: "hi" },
        serviceId: "ai4bharat/indictasr",
        audioFormat: "wav",
        encoding: "base64",
        samplingRate: 16000
      },
      controlConfig: { dataTracking: true }
    }, { headers });
    
    response.responseTime = Date.now() - startTime;
    logResult('asr', true, response);
  } catch (error) {
    logResult('asr', false, null, error);
  }
}

// Run all tests with error handling
async function runTests() {
  console.log('\n=== Starting New Test Cycle ===');
  console.log(`Time: ${new Date().toLocaleString()}`);
  console.log('----------------------------------------');
  
  try {
    await Promise.all([
      testTranslation(),
      testTTS(),
      testASR()
    ]);
  } catch (error) {
    console.error('Error in test cycle:', error);
  }
}

// Schedule tests to run every 15 seconds (4 per minute)
const interval = setInterval(runTests, 15000);

// Run initial test
runTests();

// Handle process termination
process.on('SIGINT', () => {
  clearInterval(interval);
  console.log('\n=== Load Testing Stopped ===');
  console.log(`Final Time: ${new Date().toLocaleString()}`);
  process.exit();
}); 