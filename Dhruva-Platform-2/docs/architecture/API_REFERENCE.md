# Dhruva Platform Server - API Reference Guide

## 📋 Overview

This document provides comprehensive API reference documentation for the Dhruva Platform server, including all endpoints, request/response schemas, authentication methods, and usage examples.

## 🔐 Authentication

### API Key Authentication

All inference and administrative endpoints require API key authentication.

```http
Authorization: <your_api_key>
```

### JWT Token Authentication

User-specific endpoints require JWT token authentication.

```http
Authorization: Bearer <jwt_token>
```

## 🚀 Inference APIs

### Translation Service

Translate text between supported language pairs using neural machine translation models.

#### Endpoint
```http
POST /services/inference/translation
```

#### Request Schema
```json
{
  "input": [
    {
      "source": "string"
    }
  ],
  "config": {
    "language": {
      "sourceLanguage": "string",
      "targetLanguage": "string"
    },
    "serviceId": "string",
    "domain": "string (optional)",
    "postProcessors": ["string (optional)"]
  },
  "controlConfig": {
    "dataTracking": "boolean (optional, default: true)"
  }
}
```

#### Response Schema
```json
{
  "output": [
    {
      "source": "string",
      "target": "string"
    }
  ],
  "config": {
    "language": {
      "sourceLanguage": "string",
      "targetLanguage": "string"
    },
    "serviceId": "string"
  }
}
```

#### Example Request
```bash
curl -X POST "https://api.dhruva.ai/services/inference/translation?serviceId=ai4bharat/indictrans-v2-all-gpu" \
  -H "Authorization: dhruva_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "input": [
      {
        "source": "Hello, how are you today?"
      }
    ],
    "config": {
      "language": {
        "sourceLanguage": "en",
        "targetLanguage": "hi"
      },
      "serviceId": "ai4bharat/indictrans-v2-all-gpu"
    }
  }'
```

#### Example Response
```json
{
  "output": [
    {
      "source": "Hello, how are you today?",
      "target": "नमस्ते, आज आप कैसे हैं?"
    }
  ],
  "config": {
    "language": {
      "sourceLanguage": "en",
      "targetLanguage": "hi"
    },
    "serviceId": "ai4bharat/indictrans-v2-all-gpu"
  }
}
```

### ASR (Automatic Speech Recognition)

Convert speech audio to text using automatic speech recognition models.

#### Endpoint
```http
POST /services/inference/asr
```

#### Request Schema
```json
{
  "audio": [
    {
      "audioContent": "string (base64 encoded)",
      "audioUri": "string (optional, alternative to audioContent)"
    }
  ],
  "config": {
    "language": {
      "sourceLanguage": "string"
    },
    "serviceId": "string",
    "audioFormat": "string (wav, mp3, flac)",
    "samplingRate": "integer (8000, 16000, 44100, 48000)",
    "encoding": "string (optional)",
    "postProcessors": ["string (optional)"]
  },
  "controlConfig": {
    "dataTracking": "boolean (optional, default: true)"
  }
}
```

#### Response Schema
```json
{
  "output": [
    {
      "source": "string (transcribed text)"
    }
  ],
  "config": {
    "language": {
      "sourceLanguage": "string"
    },
    "serviceId": "string"
  }
}
```

#### Example Request
```bash
curl -X POST "https://api.dhruva.ai/services/inference/asr?serviceId=ai4bharat/conformer-hi-gpu" \
  -H "Authorization: dhruva_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "audio": [
      {
        "audioContent": "UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA="
      }
    ],
    "config": {
      "language": {
        "sourceLanguage": "hi"
      },
      "serviceId": "ai4bharat/conformer-hi-gpu",
      "audioFormat": "wav",
      "samplingRate": 16000
    }
  }'
```

### TTS (Text-to-Speech)

Convert text to speech audio using text-to-speech synthesis models.

#### Endpoint
```http
POST /services/inference/tts
```

#### Request Schema
```json
{
  "input": [
    {
      "source": "string"
    }
  ],
  "config": {
    "language": {
      "sourceLanguage": "string"
    },
    "serviceId": "string",
    "gender": "string (male, female, optional)",
    "audioFormat": "string (wav, mp3, optional)",
    "samplingRate": "integer (optional)"
  },
  "controlConfig": {
    "dataTracking": "boolean (optional, default: true)"
  }
}
```

#### Response Schema
```json
{
  "audio": [
    {
      "audioContent": "string (base64 encoded audio)",
      "audioUri": "string (optional)"
    }
  ],
  "config": {
    "language": {
      "sourceLanguage": "string"
    },
    "serviceId": "string"
  }
}
```

### Transliteration Service

Convert text from one script to another while preserving pronunciation.

#### Endpoint
```http
POST /services/inference/transliteration
```

#### Request Schema
```json
{
  "input": [
    {
      "source": "string"
    }
  ],
  "config": {
    "language": {
      "sourceLanguage": "string",
      "targetLanguage": "string"
    },
    "serviceId": "string"
  },
  "controlConfig": {
    "dataTracking": "boolean (optional, default: true)"
  }
}
```

#### Response Schema
```json
{
  "output": [
    {
      "source": "string",
      "target": "string"
    }
  ],
  "config": {
    "language": {
      "sourceLanguage": "string",
      "targetLanguage": "string"
    },
    "serviceId": "string"
  }
}
```

### NER (Named Entity Recognition)

Extract named entities from text using named entity recognition models.

#### Endpoint
```http
POST /services/inference/ner
```

#### Request Schema
```json
{
  "input": [
    {
      "source": "string"
    }
  ],
  "config": {
    "language": {
      "sourceLanguage": "string"
    },
    "serviceId": "string"
  },
  "controlConfig": {
    "dataTracking": "boolean (optional, default: true)"
  }
}
```

#### Response Schema
```json
{
  "output": [
    {
      "source": "string",
      "entities": [
        {
          "entity": "string",
          "label": "string",
          "start": "integer",
          "end": "integer",
          "confidence": "float"
        }
      ]
    }
  ],
  "config": {
    "language": {
      "sourceLanguage": "string"
    },
    "serviceId": "string"
  }
}
```

## 🔧 Administrative APIs

### Service Management

#### List Services
```http
GET /services/details/list_services
Authorization: <admin_api_key>
```

**Response:**
```json
[
  {
    "serviceId": "string",
    "name": "string",
    "serviceDescription": "string",
    "task": {
      "type": "string"
    },
    "languages": [
      {
        "sourceLanguage": "string",
        "targetLanguage": "string"
      }
    ],
    "healthStatus": {
      "status": "string",
      "lastUpdated": "string"
    }
  }
]
```

#### Get Service Details
```http
GET /services/details/service/{serviceId}
Authorization: <admin_api_key>
```

#### Create Service
```http
POST /services/admin/service
Authorization: <admin_api_key>
Content-Type: application/json

{
  "serviceId": "string",
  "name": "string",
  "serviceDescription": "string",
  "hardwareDescription": "string",
  "modelId": "string",
  "endpoint": "string",
  "api_key": "string"
}
```

#### Update Service
```http
PUT /services/admin/service
Authorization: <admin_api_key>
Content-Type: application/json

{
  "serviceId": "string",
  "name": "string (optional)",
  "serviceDescription": "string (optional)",
  "endpoint": "string (optional)",
  "api_key": "string (optional)"
}
```

#### Delete Service
```http
DELETE /services/admin/service/{serviceId}
Authorization: <admin_api_key>
```

### Model Management

#### List Models
```http
GET /services/details/list_models
Authorization: <admin_api_key>
```

#### Get Model Details
```http
GET /services/details/model/{modelId}
Authorization: <admin_api_key>
```

#### Create Model
```http
POST /services/admin/model
Authorization: <admin_api_key>
Content-Type: application/json

{
  "modelId": "string",
  "name": "string",
  "description": "string",
  "task": {
    "type": "string"
  },
  "languages": [
    {
      "sourceLanguage": "string",
      "targetLanguage": "string"
    }
  ],
  "inferenceEndPoint": {
    "callbackUrl": "string",
    "schema": {
      "request": {},
      "response": {}
    }
  }
}
```

### Health Monitoring

#### Update Service Health
```http
PATCH /services/admin/health
Authorization: <admin_api_key>
Content-Type: application/json

{
  "serviceId": "string",
  "status": "string (healthy, unhealthy, unknown)"
}
```

#### Get Service Health
```http
GET /services/admin/health/{serviceId}
Authorization: <admin_api_key>
```

## 👤 Authentication APIs

### User Authentication

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "access_token": "string",
  "token_type": "bearer",
  "expires_in": "integer"
}
```

#### Register
```http
POST /auth/register
Content-Type: application/json

{
  "name": "string",
  "email": "string",
  "password": "string"
}
```

#### Refresh Token
```http
POST /auth/refresh
Authorization: Bearer <jwt_token>
```

### API Key Management

#### Create API Key
```http
POST /auth/api-keys
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "string",
  "type": "string (INFERENCE, PLATFORM)",
  "services": ["string"],
  "data_tracking": "boolean"
}
```

**Response:**
```json
{
  "api_key": "string",
  "masked_key": "string",
  "name": "string",
  "type": "string",
  "created_at": "string"
}
```

#### List API Keys
```http
GET /auth/api-keys
Authorization: Bearer <jwt_token>
```

#### Revoke API Key
```http
DELETE /auth/api-keys/{api_key_id}
Authorization: Bearer <jwt_token>
```

#### Update API Key
```http
PUT /auth/api-keys/{api_key_id}
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "string (optional)",
  "data_tracking": "boolean (optional)",
  "services": ["string (optional)"]
}
```

## 📊 Analytics & Monitoring APIs

### Usage Analytics

#### Get API Key Usage
```http
GET /services/admin/usage?api_key_id={api_key_id}&start_date={start_date}&end_date={end_date}
Authorization: <admin_api_key>
```

**Query Parameters:**
- `api_key_id`: API key identifier
- `start_date`: Start date (YYYY-MM-DD format)
- `end_date`: End date (YYYY-MM-DD format)
- `service_id`: Filter by service ID (optional)
- `task_type`: Filter by task type (optional)

**Response:**
```json
{
  "total_requests": "integer",
  "total_usage_units": "integer",
  "breakdown_by_service": {
    "service_id": {
      "requests": "integer",
      "usage_units": "integer"
    }
  },
  "breakdown_by_task": {
    "task_type": {
      "requests": "integer",
      "usage_units": "integer"
    }
  },
  "daily_usage": [
    {
      "date": "string",
      "requests": "integer",
      "usage_units": "integer"
    }
  ]
}
```

#### Get Service Metrics
```http
GET /services/admin/metrics/{serviceId}?start_date={start_date}&end_date={end_date}
Authorization: <admin_api_key>
```

**Response:**
```json
{
  "service_id": "string",
  "metrics": {
    "total_requests": "integer",
    "average_response_time": "float",
    "error_rate": "float",
    "throughput": "float"
  },
  "time_series": [
    {
      "timestamp": "string",
      "requests": "integer",
      "response_time": "float",
      "errors": "integer"
    }
  ]
}
```

### System Health

#### Application Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "string (healthy, unhealthy)",
  "timestamp": "string",
  "version": "string",
  "components": {
    "database": "string (healthy, unhealthy)",
    "cache": "string (healthy, unhealthy)",
    "queue": "string (healthy, unhealthy)"
  },
  "metrics": {
    "uptime": "integer (seconds)",
    "memory_usage": "float (percentage)",
    "cpu_usage": "float (percentage)"
  }
}
```

#### Prometheus Metrics
```http
GET /metrics
```

Returns Prometheus-formatted metrics for monitoring and alerting.

## 🔌 WebSocket APIs

### Real-time ASR Streaming

#### Connection Endpoint
```
ws://localhost:8000/socket.io/
```

#### Events

**Connect Event:**
```javascript
socket.emit('connect', {
  'language': 'hi',
  'sampling_rate': 16000,
  'service_id': 'ai4bharat/conformer-hi-gpu',
  'api_key': 'your_api_key_here'
});
```

**Audio Data Event:**
```javascript
socket.emit('audio_chunk', {
  'audio_data': 'base64_encoded_audio_chunk'
});
```

**Transcription Response:**
```javascript
socket.on('transcription', function(data) {
  console.log('Transcription:', data.text);
  console.log('Is Final:', data.is_final);
});
```

**Error Event:**
```javascript
socket.on('error', function(error) {
  console.log('Error:', error.message);
});
```

### Task Sequence Streaming

#### Connection Endpoint
```
ws://localhost:8000/socket.io/
```

#### Events

**Start Sequence:**
```javascript
socket.emit('start_sequence', {
  'task_sequence': ['asr', 'translation', 'tts'],
  'config': {
    'asr': {
      'language': 'hi',
      'service_id': 'ai4bharat/conformer-hi-gpu'
    },
    'translation': {
      'source_language': 'hi',
      'target_language': 'en',
      'service_id': 'ai4bharat/indictrans-v2-all-gpu'
    },
    'tts': {
      'language': 'en',
      'service_id': 'ai4bharat/indic-tts-en'
    }
  }
});
```

**Audio Input:**
```javascript
socket.emit('audio_input', {
  'audio_data': 'base64_encoded_audio'
});
```

**Sequence Response:**
```javascript
socket.on('sequence_result', function(data) {
  console.log('ASR Result:', data.asr_text);
  console.log('Translation:', data.translation);
  console.log('TTS Audio:', data.tts_audio);
});
```

## 🚨 Error Handling

### HTTP Status Codes

| Status Code | Description | Common Causes |
|-------------|-------------|---------------|
| `200` | Success | Request processed successfully |
| `400` | Bad Request | Invalid request format or parameters |
| `401` | Unauthorized | Missing or invalid API key/token |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource not found |
| `422` | Unprocessable Entity | Validation errors |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server-side error |
| `502` | Bad Gateway | External service error |
| `503` | Service Unavailable | Service temporarily unavailable |

### Error Response Format

```json
{
  "detail": {
    "kind": "string (error type)",
    "message": "string (human-readable message)",
    "code": "string (error code)",
    "timestamp": "string (ISO 8601 timestamp)"
  },
  "request_id": "string (for tracking)"
}
```

### Common Error Examples

#### Authentication Error
```json
{
  "detail": {
    "kind": "AUTHENTICATION_ERROR",
    "message": "Invalid API key provided",
    "code": "AUTH_001"
  }
}
```

#### Validation Error
```json
{
  "detail": {
    "kind": "VALIDATION_ERROR",
    "message": "Invalid language code 'xyz'",
    "code": "VAL_001",
    "field": "config.language.sourceLanguage"
  }
}
```

#### Service Error
```json
{
  "detail": {
    "kind": "SERVICE_ERROR",
    "message": "External inference service unavailable",
    "code": "SVC_001",
    "service_id": "ai4bharat/indictrans-v2-all-gpu"
  }
}
```

## 📝 Rate Limiting

### Default Limits

| API Type | Rate Limit | Window |
|----------|------------|--------|
| **Inference APIs** | 60 requests/minute | Per API key |
| **Administrative APIs** | 100 requests/minute | Per API key |
| **Authentication APIs** | 10 requests/minute | Per IP address |

### Rate Limit Headers

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1640995200
```

### Rate Limit Exceeded Response

```json
{
  "detail": {
    "kind": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 60 seconds.",
    "code": "RATE_001",
    "retry_after": 60
  }
}
```

## 🔧 SDK Examples

### Python SDK Example

```python
import requests
import base64

class DhruvaClient:
    def __init__(self, api_key, base_url="https://api.dhruva.ai"):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            "Authorization": api_key,
            "Content-Type": "application/json"
        }

    def translate(self, text, source_lang, target_lang, service_id):
        url = f"{self.base_url}/services/inference/translation"
        payload = {
            "input": [{"source": text}],
            "config": {
                "language": {
                    "sourceLanguage": source_lang,
                    "targetLanguage": target_lang
                },
                "serviceId": service_id
            }
        }

        response = requests.post(url, json=payload, headers=self.headers)
        response.raise_for_status()
        return response.json()["output"][0]["target"]

    def transcribe(self, audio_file_path, language, service_id):
        with open(audio_file_path, "rb") as audio_file:
            audio_content = base64.b64encode(audio_file.read()).decode()

        url = f"{self.base_url}/services/inference/asr"
        payload = {
            "audio": [{"audioContent": audio_content}],
            "config": {
                "language": {"sourceLanguage": language},
                "serviceId": service_id,
                "audioFormat": "wav",
                "samplingRate": 16000
            }
        }

        response = requests.post(url, json=payload, headers=self.headers)
        response.raise_for_status()
        return response.json()["output"][0]["source"]

# Usage example
client = DhruvaClient("dhruva_your_api_key_here")

# Translation
translation = client.translate(
    text="Hello, how are you?",
    source_lang="en",
    target_lang="hi",
    service_id="ai4bharat/indictrans-v2-all-gpu"
)
print(f"Translation: {translation}")

# ASR
transcription = client.transcribe(
    audio_file_path="audio.wav",
    language="hi",
    service_id="ai4bharat/conformer-hi-gpu"
)
print(f"Transcription: {transcription}")
```

### JavaScript SDK Example

```javascript
class DhruvaClient {
    constructor(apiKey, baseUrl = "https://api.dhruva.ai") {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.headers = {
            "Authorization": apiKey,
            "Content-Type": "application/json"
        };
    }

    async translate(text, sourceLang, targetLang, serviceId) {
        const url = `${this.baseUrl}/services/inference/translation`;
        const payload = {
            input: [{ source: text }],
            config: {
                language: {
                    sourceLanguage: sourceLang,
                    targetLanguage: targetLang
                },
                serviceId: serviceId
            }
        };

        const response = await fetch(url, {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result.output[0].target;
    }

    async transcribe(audioBlob, language, serviceId) {
        const audioContent = await this.blobToBase64(audioBlob);

        const url = `${this.baseUrl}/services/inference/asr`;
        const payload = {
            audio: [{ audioContent: audioContent }],
            config: {
                language: { sourceLanguage: language },
                serviceId: serviceId,
                audioFormat: "wav",
                samplingRate: 16000
            }
        };

        const response = await fetch(url, {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result.output[0].source;
    }

    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
}

// Usage example
const client = new DhruvaClient("dhruva_your_api_key_here");

// Translation
client.translate(
    "Hello, how are you?",
    "en",
    "hi",
    "ai4bharat/indictrans-v2-all-gpu"
).then(translation => {
    console.log(`Translation: ${translation}`);
});

// ASR with file input
const fileInput = document.getElementById('audio-file');
fileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file) {
        try {
            const transcription = await client.transcribe(
                file,
                "hi",
                "ai4bharat/conformer-hi-gpu"
            );
            console.log(`Transcription: ${transcription}`);
        } catch (error) {
            console.error('Error:', error);
        }
    }
});
```

---

*This API reference provides comprehensive documentation for integrating with the Dhruva Platform server. For additional examples and advanced usage patterns, refer to the SDK documentation and developer guides.*
