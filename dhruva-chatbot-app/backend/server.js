const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const multer = require('multer');
const fs = require('fs');
const os = require('os');

// Configure ffmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Configure multer for file uploads
const upload = multer({ 
  dest: os.tmpdir(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Store API keys (in production, use a proper database)
const API_KEYS = {
  GEMINI: process.env.GEMINI_API_KEY || 'AIzaSyBZU2IVEEZ62YntKfYTRPXx_6gfvUDPhqw'
};

// Helper function to convert audio
async function convertAudio(inputPath, outputFormat, options = {}) {
  return new Promise((resolve, reject) => {
    const outputPath = `${inputPath}.${outputFormat}`;
    const {
      codec = outputFormat === 'mp3' ? 'libmp3lame' : outputFormat === 'flac' ? 'flac' : 'pcm_s16le',
      sampleRate = 16000,
      channels = 1,
    } = options;
    console.log(`[ffmpeg] Converting ${inputPath} to ${outputPath} as ${codec}, ${sampleRate}Hz, ${channels}ch`);
    ffmpeg(inputPath)
      .audioCodec(codec)
      .audioFrequency(sampleRate)
      .audioChannels(channels)
      .toFormat(outputFormat)
      .on('end', () => {
        const stats = fs.statSync(outputPath);
        console.log(`[ffmpeg] Output file: ${outputPath}, size: ${stats.size} bytes`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('[ffmpeg] Error:', err);
        reject(err);
      })
      .save(outputPath);
  });
}

// Helper function to get supported format
function getSupportedFormat(mimetype) {
  const formatMap = {
    'audio/webm': 'wav',
    'audio/ogg': 'wav',
    'audio/mp4': 'wav',
    'audio/mpeg': 'wav',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/flac': 'wav',
    'audio/x-flac': 'wav',
    'audio/pcm': 'wav',
    'audio/x-pcm': 'wav',
    'audio/flv': 'wav',
    'audio/x-flv': 'wav'
  };
  return formatMap[mimetype] || 'wav';
}

// Helper function to read file as base64
function readFileAsBase64(filePath) {
  return fs.readFileSync(filePath, { encoding: 'base64' });
}

// Helper function to clean up temporary files
function cleanupFiles(filePaths) {
  filePaths.forEach(filePath => {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error('Error cleaning up file:', err);
    }
  });
}

// Routes
app.get('/api/keys', (req, res) => {
  res.json({ hasKeys: !!API_KEYS.GEMINI });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, provider } = req.body;
    const apiKey = API_KEYS[provider];

    if (!apiKey) {
      return res.status(400).json({ error: 'API key not configured' });
    }

    // Forward the request to the appropriate API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: message }] }],
          generationConfig: { temperature: 0.7 }
        }),
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to get response from Gemini');
    }

    res.json(data);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/asr', upload.single('audio'), async (req, res) => {
  const tempFiles = [];
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }
    console.log(`[ASR] Received file: ${req.file.originalname}, mimetype: ${req.file.mimetype}, size: ${req.file.size} bytes`);

    // Save original file to public for comparison
    const ext = req.file.mimetype === 'audio/webm' ? 'webm' : 'wav';
    const publicOriginalPath = path.join(__dirname, '../public/original.' + ext);
    try {
      fs.copyFileSync(req.file.path, publicOriginalPath);
      console.log('Saved original file to public/original.' + ext);
    } catch (err) {
      console.error('Failed to save original file:', err);
    }

    // Parse config from FormData
    let config;
    try {
      config = JSON.parse(req.body.config);
      if (config && config.config) {
        config.config.audioFormat = req.body.format || 'wav';
        config.config.samplingRate = Number(req.body.sampleRate) || 16000;
        config.config.channels = Number(req.body.channels) || 1;
      }
    } catch (err) {
      return res.status(400).json({ error: 'Invalid config format' });
    }

    // Use options from formData
    console.log('[ASR] Raw frontend values:', {
      sampleRate: req.body.sampleRate,
      channels: req.body.channels,
      format: req.body.format
    });
    let sampleRate = Number(req.body.sampleRate);
    if (isNaN(sampleRate) || ![8000,16000,48000].includes(sampleRate)) sampleRate = 16000;
    let channels = Number(req.body.channels);
    if (isNaN(channels) || ![1,2].includes(channels)) channels = 1;
    const format = req.body.format || 'wav';
    console.log(`[ASR] Using for conversion: format=${format}, sampleRate=${sampleRate}, channels=${channels}`);

    // Convert audio
    const audioPath = await convertAudio(req.file.path, format, { sampleRate, channels });
    tempFiles.push(audioPath);

    // Save converted file to public for comparison
    const publicConvertedPath = path.join(__dirname, `../public/converted.${format}`);
    try {
      fs.copyFileSync(audioPath, publicConvertedPath);
      console.log('Saved converted file to public/converted.' + format);
    } catch (err) {
      console.error('Failed to save converted file:', err);
    }

    // Read the audio file as base64
    const audioBase64 = readFileAsBase64(audioPath);

    const asrEndpoint = 'http://13.203.149.17:8000/services/inference/asr';
    const API_KEY = 'Xhf5jWXfkam42bKqEk5PgIusSDsgamh4y0gRL7zs1xUINKQbyI7LX0L02mpMtv09';
    const headers = {
      'accept': 'application/json',
      'x-auth-source': 'API_KEY',
      'Authorization': API_KEY,
      'Content-Type': 'application/json',
    };

    const response = await fetch(asrEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...config,
        audio: [
          {
            audioContent: audioBase64,
            audioUri: "http://localhost/dummy"
          }
        ]
      }),
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
      res.status(response.status).json(data);
    } catch (err) {
      // Not JSON, return as plain text error
      res.status(response.status).json({ error: text });
    }
  } catch (error) {
    console.error('ASR proxy error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    // Clean up temporary files
    cleanupFiles(tempFiles);
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 