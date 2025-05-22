const axios = require('axios');
const fs = require('fs');
const path = require('path');

const TTS_ENDPOINT = "http://13.203.149.17:8000/services/inference/tts";
const AUTH_TOKEN = "Xhf5jWXfkam42bKqEk5PgIusSDsgamh4y0gRL7zs1xUINKQbyI7LX0L02mpMtv09";

const headers = {
  accept: "application/json",
  "x-auth-source": "API_KEY",
  Authorization: AUTH_TOKEN,
  "Content-Type": "application/json"
};

async function generateSampleAudio() {
  try {
    console.log('Generating sample Hindi audio...');
    
    const response = await axios.post(TTS_ENDPOINT, {
      input: [{ source: "नमस्ते, मैं एक कृत्रिम बुद्धिमत्ता सहायक हूं" }],
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

    if (response.data && response.data.audio && response.data.audio[0] && response.data.audio[0].audioContent) {
      const audioContent = response.data.audio[0].audioContent;
      const audioBuffer = Buffer.from(audioContent, 'base64');
      const outputPath = path.join(__dirname, 'sample-hindi.wav');
      
      fs.writeFileSync(outputPath, audioBuffer);
      console.log('✅ Sample audio file generated successfully at:', outputPath);
    } else {
      throw new Error('Invalid response format from TTS API');
    }
  } catch (error) {
    console.error('❌ Error generating sample audio:', error.message);
    process.exit(1);
  }
}

generateSampleAudio(); 