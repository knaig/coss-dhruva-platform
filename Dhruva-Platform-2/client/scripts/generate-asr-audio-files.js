require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const TTS_ENDPOINT = "http://13.203.149.17:8000/services/inference/tts";

// Try to get API key from multiple sources
const API_KEY = process.env.API_KEY || 
                process.env.DHRUVA_API_KEY || 
                "Xhf5jWXfkam42bKqEk5PgIusSDsgamh4y0gRL7zs1xUINKQbyI7LX0L02mpMtv09"; // Fallback to hardcoded key

console.log('Environment variables:', {
  API_KEY: process.env.API_KEY ? '***' : 'not set',
  DHRUVA_API_KEY: process.env.DHRUVA_API_KEY ? '***' : 'not set',
  NODE_ENV: process.env.NODE_ENV
});

const headers = {
  accept: "application/json",
  "x-auth-source": "API_KEY",
  "Authorization": API_KEY,
  "Content-Type": "application/json"
};

// Log headers for debugging
console.log('Using headers:', {
  ...headers,
  Authorization: headers.Authorization ? '***' : 'missing'
});

const HINDI_INPUTS = [
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

async function generateAllAudio() {
  for (let i = 0; i < HINDI_INPUTS.length; i++) {
    const text = HINDI_INPUTS[i];
    const outputPath = path.join(__dirname, `sample-hindi-${i + 1}.wav`);
    try {
      console.log(`Generating audio for: "${text}"`);
      const response = await axios.post(TTS_ENDPOINT, {
        input: [{ source: text }],
        config: {
          serviceId: "ai4bharat/indictts--gpu-t4",
          gender: "male",
          samplingRate: 22050,
          audioFormat: "wav",
          language: { sourceLanguage: "hi" }
        },
        controlConfig: { dataTracking: true }
      }, { 
        headers,
        validateStatus: function (status) {
          return status < 500; // Accept any status less than 500
        }
      });

      if (response.status === 403) {
        console.error(`❌ Authentication failed. Please check your API key.`);
        console.error(`Response:`, response.data);
        process.exit(1);
      }

      if (response.data && response.data.audio && response.data.audio[0] && response.data.audio[0].audioContent) {
        const audioContent = response.data.audio[0].audioContent;
        const audioBuffer = Buffer.from(audioContent, 'base64');
        fs.writeFileSync(outputPath, audioBuffer);
        console.log(`✅ Audio file generated: ${outputPath}`);
      } else {
        throw new Error('Invalid response format from TTS API');
      }
    } catch (error) {
      if (error.response) {
        console.error(`❌ Error generating audio for "${text}":`, {
          status: error.response.status,
          data: error.response.data
        });
      } else {
        console.error(`❌ Error generating audio for "${text}":`, error.message);
      }
    }
  }
}

generateAllAudio(); 