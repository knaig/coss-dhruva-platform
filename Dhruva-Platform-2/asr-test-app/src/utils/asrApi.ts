/**
 * ASR API Utilities for Dhruva Platform
 * Based on the existing client implementation
 */

import axios from 'axios';

// Backend endpoints in order of preference
const BACKEND_ENDPOINTS = [
  'http://13.203.149.17:8000',
  'http://localhost:8000',
  'https://13.203.149.17:8000'
];

// Default API key (from existing implementation)
const DEFAULT_API_KEY = 'Xhf5jWXfkam42bKqEk5PgIusSDsgamh4y0gRL7zs1xUINKQbyI7LX0L02mpMtv09';

export interface ASRConfig {
  serviceId: string;
  language: string;
  audioFormat: string;
  encoding: string;
  samplingRate: number;
  transcriptionFormat?: {
    value: string;
  };
  bestTokenCount?: number;
  preProcessors?: any[];
  postProcessors?: any[];
}

export interface ASRRequest {
  controlConfig: {
    dataTracking: boolean;
  };
  config: ASRConfig;
  audio: Array<{
    audioContent: string;
  }>;
}

export interface ASRResponse {
  output: Array<{
    source: string;
  }>;
  config?: any;
  status?: string;
}

export interface ASRError {
  message: string;
  status?: number;
  details?: any;
}

/**
 * Get language script code for the given language
 */
function getLanguageScriptCode(language: string): string {
  const scriptCodes: { [key: string]: string } = {
    'hi': 'Deva', // Hindi - Devanagari
    'en': 'Latn', // English - Latin
    'bn': 'Beng', // Bengali - Bengali
    'gu': 'Gujr', // Gujarati - Gujarati
    'kn': 'Knda', // Kannada - Kannada
    'ml': 'Mlym', // Malayalam - Malayalam
    'mr': 'Deva', // Marathi - Devanagari
    'or': 'Orya', // Odia - Odia
    'pa': 'Guru', // Punjabi - Gurmukhi
    'ta': 'Taml', // Tamil - Tamil
    'te': 'Telu', // Telugu - Telugu
    'ur': 'Arab', // Urdu - Arabic
  };
  return scriptCodes[language] || 'Latn';
}

/**
 * Test backend endpoint connectivity
 */
export async function testEndpoint(endpoint: string): Promise<boolean> {
  try {
    console.log(`[ASR API] Testing endpoint: ${endpoint}`);
    await axios.get(`${endpoint}/services/details/list_services`, {
      timeout: 5000,
      headers: {
        'Accept': 'application/json',
        'Authorization': DEFAULT_API_KEY,
      }
    });
    console.log(`[ASR API] Endpoint ${endpoint} is accessible`);
    return true;
  } catch (error: any) {
    if (error.response?.status === 401 || error.response?.data?.detail === "Not authenticated") {
      console.log(`[ASR API] Endpoint ${endpoint} is accessible but requires authentication`);
      return true; // Endpoint is working, just needs auth
    }
    console.log(`[ASR API] Endpoint ${endpoint} is not accessible:`, error.message);
    return false;
  }
}

/**
 * Find the first working backend endpoint
 */
export async function findWorkingEndpoint(): Promise<string> {
  console.log('[ASR API] Finding working backend endpoint...');
  
  for (const endpoint of BACKEND_ENDPOINTS) {
    if (await testEndpoint(endpoint)) {
      console.log(`[ASR API] Using endpoint: ${endpoint}`);
      return endpoint;
    }
  }
  
  throw new Error('No working backend endpoint found. Please check if the Dhruva Platform server is running.');
}

/**
 * Perform ASR inference with the given audio data
 */
export async function performASR(
  base64Audio: string,
  config: Partial<ASRConfig> = {},
  apiKey: string = DEFAULT_API_KEY,
  retryCount: number = 0,
  maxRetries: number = 3
): Promise<ASRResponse> {
  try {
    console.log(`[ASR API] Starting transcription attempt ${retryCount + 1}/${maxRetries + 1}`);
    console.log(`[ASR API] Base64 audio length: ${base64Audio.length} characters`);

    // Find working endpoint
    const baseEndpoint = await findWorkingEndpoint();
    const endpoint = `${baseEndpoint}/services/inference/asr?serviceId=${config.serviceId || 'ai4bharat/indictasr'}`;

    // Prepare the request payload based on the existing implementation
    const payload: ASRRequest = {
      controlConfig: {
        dataTracking: true,
      },
      config: {
        audioFormat: 'wav',
        language: config.language || 'hi',
        serviceId: config.serviceId || 'ai4bharat/indictasr',
        encoding: 'base64',
        samplingRate: config.samplingRate || 16000,
        preProcessors: config.preProcessors || [],
        postProcessors: config.postProcessors || [],
        transcriptionFormat: {
          value: 'transcript'
        },
        bestTokenCount: 0,
        ...config
      },
      audio: [
        {
          audioContent: base64Audio,
        },
      ],
    };

    // Add script code for the language
    if (payload.config.language) {
      (payload.config as any).language = {
        sourceLanguage: payload.config.language,
        sourceScriptCode: getLanguageScriptCode(payload.config.language),
      };
    }

    console.log(`[ASR API] Sending request to: ${endpoint}`);
    console.log(`[ASR API] Payload structure:`, {
      controlConfig: payload.controlConfig,
      config: {
        ...payload.config,
        language: (payload.config as any).language
      },
      audioLength: payload.audio[0].audioContent.length
    });

    const response = await axios.post(endpoint, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': apiKey,
      },
      timeout: 30000, // 30 second timeout
    });

    console.log(`[ASR API] Response status: ${response.status} ${response.statusText}`);
    console.log('[ASR API] Response data:', response.data);

    if (!response.data || !response.data.output || !Array.isArray(response.data.output)) {
      throw new Error('Invalid response format from ASR API');
    }

    return response.data;
  } catch (error: any) {
    console.error(`[ASR API] Error on attempt ${retryCount + 1}:`, error);

    // Retry logic for certain types of errors
    if (retryCount < maxRetries) {
      const shouldRetry = 
        error.code === 'ECONNABORTED' || // Timeout
        error.code === 'ENOTFOUND' ||    // DNS resolution failed
        error.code === 'ECONNREFUSED' || // Connection refused
        (error.response && error.response.status >= 500); // Server errors

      if (shouldRetry) {
        console.log(`[ASR API] Retrying in ${(retryCount + 1) * 1000}ms...`);
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
        return performASR(base64Audio, config, apiKey, retryCount + 1, maxRetries);
      }
    }

    // Format error for user display
    const asrError: ASRError = {
      message: 'ASR processing failed',
      status: error.response?.status,
      details: error.response?.data || error.message
    };

    if (error.response?.status === 401) {
      asrError.message = 'Authentication failed. Please check your API key.';
    } else if (error.response?.status === 400) {
      asrError.message = 'Invalid request. Please check your audio format and configuration.';
    } else if (error.response?.status >= 500) {
      asrError.message = 'Server error. Please try again later.';
    } else if (error.code === 'ECONNABORTED') {
      asrError.message = 'Request timeout. The audio file might be too large or the server is busy.';
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      asrError.message = 'Cannot connect to the ASR server. Please check if the server is running.';
    }

    throw asrError;
  }
}

/**
 * Extract transcription text from ASR response
 */
export function extractTranscription(response: ASRResponse): string {
  if (!response.output || !Array.isArray(response.output) || response.output.length === 0) {
    return '';
  }

  return response.output
    .map(item => item.source || '')
    .filter(text => text.trim().length > 0)
    .join(' ')
    .trim();
}

/**
 * Get available languages for ASR
 */
export function getAvailableLanguages(): Array<{ code: string; name: string }> {
  return [
    { code: 'hi', name: 'Hindi (हिंदी)' },
    { code: 'en', name: 'English' },
    { code: 'bn', name: 'Bengali (বাংলা)' },
    { code: 'gu', name: 'Gujarati (ગુજરાતી)' },
    { code: 'kn', name: 'Kannada (ಕನ್ನಡ)' },
    { code: 'ml', name: 'Malayalam (മലയാളം)' },
    { code: 'mr', name: 'Marathi (मराठी)' },
    { code: 'or', name: 'Odia (ଓଡ଼ିଆ)' },
    { code: 'pa', name: 'Punjabi (ਪੰਜਾਬੀ)' },
    { code: 'ta', name: 'Tamil (தமிழ்)' },
    { code: 'te', name: 'Telugu (తెలుగు)' },
    { code: 'ur', name: 'Urdu (اردو)' },
  ];
}

/**
 * Get available service IDs for ASR
 */
export function getAvailableServices(): Array<{ id: string; name: string }> {
  return [
    { id: 'ai4bharat/indictasr', name: 'AI4Bharat IndicASR' },
    { id: 'ai4bharat/conformer--gpu-t4', name: 'AI4Bharat Conformer (GPU T4)' },
  ];
}
