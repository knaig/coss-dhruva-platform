require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// API endpoints
const TRANSLATION_ENDPOINT = "http://13.203.149.17:8000/services/inference/translation";
const TTS_ENDPOINT = "http://13.203.149.17:8000/services/inference/tts";
const ASR_ENDPOINT = "http://13.203.149.17:8000/services/inference/asr";

// Get API key with fallback
const API_KEY = process.env.API_KEY || 
                process.env.DHRUVA_API_KEY || 
                "Xhf5jWXfkam42bKqEk5PgIusSDsgamh4y0gRL7zs1xUINKQbyI7LX0L02mpMtv09";

const headers = {
  accept: "application/json",
  "x-auth-source": "API_KEY",
  "Authorization": API_KEY,
  "Content-Type": "application/json"
};

// Test cases
const TRANSLATION_TESTS = [
  {
    input: "नमस्ते, मैं एक कृत्रिम बुद्धिमत्ता सहायक हूं",
    expected: "Hello, I am an artificial intelligence assistant"
  },
  {
    input: "मैं आपकी कैसे मदद कर सकता हूं?",
    expected: "How can I help you?"
  }
];

const TTS_TESTS = [
  {
    input: "नमस्ते, मैं एक कृत्रिम बुद्धिमत्ता सहायक हूं",
    expected: "audio"
  },
  {
    input: "मैं आपकी कैसे मदद कर सकता हूं?",
    expected: "audio"
  }
];

const ASR_TESTS = [
  {
    audioFile: "sample-hindi-1.wav",
    expected: "नमस्ते, मैं एक कृत्रिम बुद्धिमत्ता सहायक हूं"
  },
  {
    audioFile: "sample-hindi-2.wav",
    expected: "मैं आपकी कैसे मदद कर सकता हूं?"
  }
];

// Helper function to compare strings (case-insensitive, trimmed)
function compareStrings(actual, expected) {
  return actual.toLowerCase().trim() === expected.toLowerCase().trim();
}

// Test translation
async function testTranslation() {
  console.log('\n=== Testing Translation Service ===');
  let passed = 0;
  let failed = 0;

  for (const test of TRANSLATION_TESTS) {
    try {
      console.log(`\nTesting: "${test.input}"`);
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
        input: [{ source: test.input }]
      }, { headers });

      const actual = response.data.output[0].target;
      const isMatch = compareStrings(actual, test.expected);
      
      if (isMatch) {
        console.log('✅ PASSED');
        passed++;
      } else {
        console.log('❌ FAILED');
        console.log('Expected:', test.expected);
        console.log('Actual:', actual);
        failed++;
      }
    } catch (error) {
      console.log('❌ ERROR');
      console.error(error.response?.data || error.message);
      failed++;
    }
  }

  return { passed, failed };
}

// Test TTS
async function testTTS() {
  console.log('\n=== Testing TTS Service ===');
  let passed = 0;
  let failed = 0;

  for (const test of TTS_TESTS) {
    try {
      console.log(`\nTesting: "${test.input}"`);
      const response = await axios.post(TTS_ENDPOINT, {
        input: [{ source: test.input }],
        config: {
          serviceId: "ai4bharat/indictts--gpu-t4",
          gender: "male",
          samplingRate: 22050,
          audioFormat: "wav",
          language: { sourceLanguage: "hi" }
        },
        controlConfig: { dataTracking: true }
      }, { headers });

      const hasAudio = response.data.audio && 
                      response.data.audio[0] && 
                      response.data.audio[0].audioContent;
      
      if (hasAudio) {
        console.log('✅ PASSED');
        passed++;
      } else {
        console.log('❌ FAILED');
        console.log('No audio content in response');
        failed++;
      }
    } catch (error) {
      console.log('❌ ERROR');
      console.error(error.response?.data || error.message);
      failed++;
    }
  }

  return { passed, failed };
}

// Test ASR
async function testASR() {
  console.log('\n=== Testing ASR Service ===');
  let passed = 0;
  let failed = 0;

  for (const test of ASR_TESTS) {
    try {
      console.log(`\nTesting: "${test.audioFile}"`);
      const audioPath = path.join(__dirname, test.audioFile);
      const audioData = fs.readFileSync(audioPath);
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

      const actual = response.data.output[0].transcript || response.data.output[0].source;
      const isMatch = compareStrings(actual, test.expected);
      
      if (isMatch) {
        console.log('✅ PASSED');
        passed++;
      } else {
        console.log('❌ FAILED');
        console.log('Expected:', test.expected);
        console.log('Actual:', actual);
        failed++;
      }
    } catch (error) {
      console.log('❌ ERROR');
      console.error(error.response?.data || error.message);
      failed++;
    }
  }

  return { passed, failed };
}

// Run all tests
async function runAllTests() {
  console.log('Starting service verification tests...');
  
  const translationResults = await testTranslation();
  const ttsResults = await testTTS();
  const asrResults = await testASR();

  // Print summary
  console.log('\n=== Test Summary ===');
  console.log('Translation:', `${translationResults.passed}/${translationResults.passed + translationResults.failed} passed`);
  console.log('TTS:', `${ttsResults.passed}/${ttsResults.passed + ttsResults.failed} passed`);
  console.log('ASR:', `${asrResults.passed}/${asrResults.passed + asrResults.failed} passed`);
  
  const totalPassed = translationResults.passed + ttsResults.passed + asrResults.passed;
  const totalTests = (translationResults.passed + translationResults.failed) +
                    (ttsResults.passed + ttsResults.failed) +
                    (asrResults.passed + asrResults.failed);
  
  console.log('\nOverall:', `${totalPassed}/${totalTests} tests passed`);
}

runAllTests().catch(console.error); 