import axios from "axios";
import minimist from "minimist";
import fs from "fs/promises";
import { createWriteStream } from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CLI args
const args = minimist(process.argv.slice(2));
const rps = parseInt(args.rps || "10");         // Requests per second
const duration = parseInt(args.duration || "20"); // Duration in seconds
const delayMs = 1000 / rps;                      // Time between requests

// Service URLs
const TRANSLATION_ENDPOINT = args.translateUrl || "http://13.203.149.17:8000/services/inference/translation";
const TTS_ENDPOINT = args.ttsUrl || "http://13.203.149.17:8000/services/inference/tts";
const ASR_ENDPOINT = args.asrUrl || "http://13.203.149.17:8000/services/inference/asr";

// Headers for API requests
const headers = {
  accept: "application/json",
  "x-auth-source": "API_KEY",
  Authorization: process.env.API_KEY,
  "Content-Type": "application/json"
};

// Debug print for API key
console.log('API_KEY from env:', process.env.API_KEY);

// Auth token
// const AUTH_TOKEN = "Xhf5jWXfkam42bKqEk5PgIusSDsgamh4y0gRL7zs1xUINKQbyI7LX0L02mpMtv09";

// Translation test cases with ground truth
const TRANSLATION_TESTS = [
  {
    input: "नमस्ते, मैं एक कृत्रिम बुद्धिमत्ता सहायक हूं",
    expected: "Hello, I am an artificial intelligence assistant"
  },
  {
    input: "मैं आपकी कैसे मदद कर सकता हूं?",
    expected: "How can I help you?"
  },
  {
    input: "क्या आप मुझे कुछ जानकारी दे सकते हैं?",
    expected: "Can you give me some information?"
  },
  {
    input: "मुझे आपकी बात समझ में आ रही है",
    expected: "I understand what you are saying"
  },
  {
    input: "क्या आप इसे दोबारा समझा सकते हैं?",
    expected: "Can you explain this again?"
  },
  {
    input: "मैं आपकी बात सुन रहा हूं",
    expected: "I am listening to you"
  },
  {
    input: "कृपया थोड़ा धीरे बोलें",
    expected: "Please speak a little slower"
  },
  {
    input: "मैं आपकी मदद करने के लिए तैयार हूं",
    expected: "I am ready to help you"
  },
  {
    input: "क्या आप इस विषय पर और जानकारी दे सकते हैं?",
    expected: "Can you provide more information on this topic?"
  },
  {
    input: "मुझे आपकी बात समझने में कुछ समय लगेगा",
    expected: "It will take me some time to understand what you are saying"
  },
  {
    input: "क्या आप इसे एक उदाहरण के साथ समझा सकते हैं?",
    expected: "Can you explain this with an example?"
  },
  {
    input: "मैं आपकी सहायता के लिए हमेशा उपलब्ध हूं",
    expected: "I am always available to assist you"
  },
  {
    input: "क्या आप इस समस्या का समाधान बता सकते हैं?",
    expected: "Can you provide a solution to this problem?"
  },
  {
    input: "मुझे आपकी प्रतिक्रिया का इंतज़ार है",
    expected: "I am waiting for your feedback"
  },
  {
    input: "क्या आप इस विषय पर अपना विचार साझा कर सकते हैं?",
    expected: "Can you share your thoughts on this topic?"
  }
];

// TTS test cases with ground truth (audio presence check)
const TTS_TESTS = TRANSLATION_TESTS.map(tc => ({
  input: tc.input,
  expected: "audio"
}));

// ASR test cases with ground truth (assuming you have audio files for each)
const ASR_TESTS = [
  {
    audioFile: "sample-hindi-1.wav",
    expected: "नमस्ते, मैं एक कृत्रिम बुद्धिमत्ता सहायक हूं"
  },
  {
    audioFile: "sample-hindi-2.wav",
    expected: "मैं आपकी कैसे मदद कर सकता हूं?"
  },
  {
    audioFile: "sample-hindi-3.wav",
    expected: "क्या आप मुझे कुछ जानकारी दे सकते हैं?"
  },
  {
    audioFile: "sample-hindi-4.wav",
    expected: "मुझे आपकी बात समझ में आ रही है"
  },
  {
    audioFile: "sample-hindi-5.wav",
    expected: "क्या आप इसे दोबारा समझा सकते हैं?"
  },
  {
    audioFile: "sample-hindi-6.wav",
    expected: "मैं आपकी बात सुन रहा हूं"
  },
  {
    audioFile: "sample-hindi-7.wav",
    expected: "कृपया थोड़ा धीरे बोलें"
  },
  {
    audioFile: "sample-hindi-8.wav",
    expected: "मैं आपकी मदद करने के लिए तैयार हूं"
  },
  {
    audioFile: "sample-hindi-9.wav",
    expected: "क्या आप इस विषय पर और जानकारी दे सकते हैं?"
  },
  {
    audioFile: "sample-hindi-10.wav",
    expected: "मुझे आपकी बात समझने में कुछ समय लगेगा"
  },
  {
    audioFile: "sample-hindi-11.wav",
    expected: "क्या आप इसे एक उदाहरण के साथ समझा सकते हैं?"
  },
  {
    audioFile: "sample-hindi-12.wav",
    expected: "मैं आपकी सहायता के लिए हमेशा उपलब्ध हूं"
  },
  {
    audioFile: "sample-hindi-13.wav",
    expected: "क्या आप इस समस्या का समाधान बता सकते हैं?"
  },
  {
    audioFile: "sample-hindi-14.wav",
    expected: "मुझे आपकी प्रतिक्रिया का इंतज़ार है"
  },
  {
    audioFile: "sample-hindi-15.wav",
    expected: "क्या आप इस विषय पर अपना विचार साझा कर सकते हैं?"
  }
];

// Statistics tracking
const stats = {
  translation: {
    success: 0,
    failed: 0,
    latencies: [],
    errors: new Map()
  },
  tts: {
    success: 0,
    failed: 0,
    latencies: [],
    errors: new Map()
  },
  asr: {
    success: 0,
    failed: 0,
    latencies: [],
    errors: new Map()
  },
  overall: {
    startTime: null,
    endTime: null,
    totalRequests: 0,
    completedRequests: 0
  }
};

// Logging setup
const logFile = path.join(__dirname, 'load-test-logs.jsonl');
const logStream = createWriteStream(logFile, { flags: 'a' });

function formatLatency(latency) {
  if (latency < 1000) return `${latency.toFixed(2)}ms`;
  return `${(latency/1000).toFixed(2)}s`;
}

function logRequest(service, input, output, error, latency) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    service,
    input,
    output: error ? null : (service === 'tts' ? '[AUDIO_CONTENT]' : output),
    error: error ? {
      message: error.message,
      code: error.code,
      status: error.response?.status
    } : null,
    latency: formatLatency(latency)
  };
  
  // Console output for real-time monitoring
  const status = error ? '❌' : '✅';
  console.log(`${status} [${service.toUpperCase()}] ${formatLatency(latency)} - ${error ? error.message : 'Success'}`);
  
  logStream.write(JSON.stringify(logEntry) + '\n');
}

async function sendRequest() {
  const apiType = ["translation", "tts", "asr"][Math.floor(Math.random() * 3)];
  const start = Date.now();
  let input, output, error;

  try {
    switch (apiType) {
      case "translation": {
        const testCase = TRANSLATION_TESTS[Math.floor(Math.random() * TRANSLATION_TESTS.length)];
        input = testCase.input;
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
          input: [{ source: input }]
        }, { headers });
        output = response.data;
        stats.translation.success++;
        stats.translation.latencies.push(Date.now() - start);
        break;
      }
      case "tts": {
        const testCase = TTS_TESTS[Math.floor(Math.random() * TTS_TESTS.length)];
        input = testCase.input;
        const response = await axios.post(TTS_ENDPOINT, {
          input: [{ source: input }],
          config: {
            serviceId: "ai4bharat/indictts--gpu-t4",
            gender: "male",
            samplingRate: 22050,
            audioFormat: "wav",
            language: { sourceLanguage: "hi" }
          },
          controlConfig: { dataTracking: true }
        }, { headers });
        output = response.data;
        stats.tts.success++;
        stats.tts.latencies.push(Date.now() - start);
        break;
      }
      case "asr": {
        const testCase = ASR_TESTS[Math.floor(Math.random() * ASR_TESTS.length)];
        const audioPath = path.join(__dirname, testCase.audioFile);
        const audioData = await fs.readFile(audioPath);
        input = testCase.audioFile;
        const response = await axios.post(ASR_ENDPOINT, {
          audio: [{ audioContent: audioData.toString('base64') }],
          config: {
            language: { sourceLanguage: "hi" },
            serviceId: "ai4bharat/indictasr",
            audioFormat: "wav",
            encoding: "base64",
            samplingRate: 16000
          },
          controlConfig: { dataTracking: true }
        }, { headers });
        output = response.data;
        stats.asr.success++;
        stats.asr.latencies.push(Date.now() - start);
        break;
      }
    }
  } catch (err) {
    error = err;
    stats[apiType].failed++;
    const errorKey = err.response?.status || err.message;
    stats[apiType].errors.set(errorKey, (stats[apiType].errors.get(errorKey) || 0) + 1);
  }

  stats.overall.completedRequests++;
  logRequest(apiType, input, output, error, Date.now() - start);
}

function calculatePercentile(latencies, percentile) {
  const sorted = [...latencies].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index];
}

function printServiceStats(service) {
  const serviceStats = stats[service];
  const latencies = serviceStats.latencies;
  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length || 0;
  const p95 = calculatePercentile(latencies, 95);
  const p99 = calculatePercentile(latencies, 99);
  
  console.log(`\n📊 ${service.toUpperCase()} Service Stats:`);
  console.log(`✅ Success: ${serviceStats.success}`);
  console.log(`❌ Failed: ${serviceStats.failed}`);
  console.log(`⌛ Latency:`);
  console.log(`   - Average: ${formatLatency(avgLatency)}`);
  console.log(`   - P95: ${formatLatency(p95)}`);
  console.log(`   - P99: ${formatLatency(p99)}`);
  
  if (serviceStats.errors.size > 0) {
    console.log('\nError Distribution:');
    for (const [error, count] of serviceStats.errors) {
      console.log(`  - ${error}: ${count} times`);
    }
  }
}

async function runLoadTest() {
  const totalRequests = rps * duration;
  let sent = 0;

  stats.overall.startTime = Date.now();
  stats.overall.totalRequests = totalRequests;

  console.log(`🚀 Starting load test: ${rps} RPS for ${duration} seconds (${totalRequests} requests)`);
  console.log('----------------------------------------');

  const sendWithDelay = async () => {
    while (sent < totalRequests) {
      sendRequest();
      sent++;
      await new Promise((res) => setTimeout(res, delayMs));
    }
  };

  await sendWithDelay();

  // Wait for all requests to complete
  await new Promise((res) => setTimeout(res, 5000));
  stats.overall.endTime = Date.now();

  // Print overall summary
  console.log('\n📈 Overall Load Test Summary:');
  console.log('----------------------------------------');
  const totalSuccess = Object.values(stats).reduce((sum, s) => sum + (s.success || 0), 0);
  const totalFailed = Object.values(stats).reduce((sum, s) => sum + (s.failed || 0), 0);
  const totalTime = (stats.overall.endTime - stats.overall.startTime) / 1000;
  
  console.log(`⏱️  Test Duration: ${totalTime.toFixed(2)}s`);
  console.log(`📊 Total Requests: ${stats.overall.totalRequests}`);
  console.log(`✅ Total Success: ${totalSuccess}`);
  console.log(`❌ Total Failed: ${totalFailed}`);
  console.log(`🎯 Actual RPS: ${(totalSuccess / totalTime).toFixed(2)}`);
  
  // Print service-specific stats
  printServiceStats('translation');
  printServiceStats('tts');
  printServiceStats('asr');

  // Close log stream
  logStream.end();
}

runLoadTest().catch(console.error);

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n=== Load Testing Stopped ===');
  console.log(`Final Time: ${new Date().toLocaleString()}`);
  process.exit();
}); 