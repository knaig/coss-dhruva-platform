# Dhruva Platform LLM Integration Feasibility Analysis

## Executive Summary

The Dhruva Platform demonstrates **strong architectural foundation** for supporting Large Language Model (LLM) inference requests. The platform's modular design, comprehensive monitoring/metering infrastructure, and extensible task type system provide an excellent foundation for LLM integration. However, several key components need to be implemented to enable full LLM support.

**Key Finding**: The platform can support LLM workloads with moderate development effort, primarily requiring new task type definitions, request/response schemas, and endpoint implementations.

---

## Current Architecture Assessment

### ✅ **Strengths - Ready for LLM Integration**

#### 1. **Robust Infrastructure Foundation**
- **Docker Compose Architecture**: 4-layer deployment (database, application, metering, monitoring)
- **Scalable Database Systems**: 
  - MongoDB (app/log data) 
  - Redis (caching)
  - TimescaleDB (time-series metrics)
- **Message Queue System**: RabbitMQ with Celery workers for async processing
- **Monitoring Stack**: Prometheus + Grafana with custom metrics collection

#### 2. **Extensible Task Type System**
```python
# Current task types in _ULCATaskType enum
class _ULCATaskType(str, Enum):
    ASR = "asr"
    TRANSLATION = "translation" 
    TTS = "tts"
    TRANSLITERATION = "transliteration"
    NER = "ner"
    VAD = "vad"
    # ✅ Ready to add: LLM = "llm"
```

#### 3. **Comprehensive Metering System**
- **Usage Calculation**: Task-specific metering functions
- **Data Pipeline**: Request → RabbitMQ → Celery → TimescaleDB
- **Monitoring Integration**: Prometheus metrics with custom labels
- **API Key Management**: Usage tracking and rate limiting

#### 4. **Service Management Framework**
- **Model Registry**: MongoDB-based model/service registration
- **Service Discovery**: Cached service lookup with validation
- **Health Monitoring**: Service heartbeat and status tracking
- **Inference Gateway**: Unified request routing to external services

#### 5. **Authentication & Authorization**
- **API Key System**: INFERENCE and PLATFORM key types
- **Request Validation**: Middleware-based auth with caching
- **User Management**: Role-based access control

### ⚠️ **Current Limitations for LLM Support**

#### 1. **Missing LLM Task Type**
- No "llm" task type in `_ULCATaskType` enum
- No LLM-specific request/response schemas
- No LLM inference endpoint implementation

#### 2. **Limited Pipeline Support**
- Current pipeline validation only supports specific task chains
- No LLM integration in pipeline workflows
- Missing LLM → other task type transitions

#### 3. **Metering Gaps**
- No LLM-specific usage calculation functions
- Missing token-based metering for LLM requests
- No LLM performance metrics collection

---

## LLM Integration Feasibility Assessment

### 🟢 **High Feasibility Components**

#### Infrastructure Compatibility
- **Docker Compose**: Can easily accommodate LLM services
- **Database Systems**: MongoDB/Redis/TimescaleDB suitable for LLM metadata/caching/metrics
- **Message Queues**: RabbitMQ/Celery can handle LLM request processing
- **Monitoring**: Prometheus/Grafana ready for LLM-specific metrics

#### Service Architecture
- **Inference Gateway**: Can route to LLM endpoints (OpenAI, Anthropic, local models)
- **Model Registry**: Can store LLM model metadata and configurations
- **API Key System**: Compatible with LLM service authentication

### 🟡 **Medium Complexity Requirements**

#### Request/Response Handling
- Need new LLM-specific schemas for chat completions, embeddings, etc.
- Require streaming response support for real-time LLM interactions
- Must handle variable-length context windows and token limits

#### Metering Complexity
- Token-based usage calculation (input/output tokens)
- Model-specific pricing tiers (GPT-4 vs GPT-3.5 vs local models)
- Context length and complexity-based metering

### 🔴 **Implementation Challenges**

#### Performance Considerations
- LLM requests have higher latency (seconds vs milliseconds)
- Variable response times based on prompt complexity
- Potential memory/CPU requirements for local model hosting

#### Cost Management
- External LLM API costs can be significant
- Need sophisticated usage monitoring and alerting
- Require budget controls and rate limiting

---

## Technical Implementation Plan

### Phase 1: Core LLM Task Type Support

#### 1.1 Add LLM Task Type
**Files to Modify:**
- `server/schema/services/common/ulca_task.py`
- `client/components/Feedback/FeedbackTypes.ts`
- `manishclient/client/components/Feedback/FeedbackTypes.ts`

```python
class _ULCATaskType(str, Enum):
    ASR = "asr"
    TRANSLATION = "translation"
    TTS = "tts"
    TRANSLITERATION = "transliteration"
    NER = "ner"
    VAD = "vad"
    LLM = "llm"  # ✅ NEW
```

#### 1.2 Create LLM Request/Response Schemas
**New Files to Create:**
- `server/schema/services/request/ulca_llm_inference_request.py`
- `server/schema/services/response/ulca_llm_inference_response.py`

```python
# LLM Request Schema
class _ULCALlmInferenceRequestConfig(_ULCABaseInferenceRequestConfig):
    model: str  # e.g., "gpt-4", "claude-3", "llama-2"
    max_tokens: Optional[int] = 1000
    temperature: Optional[float] = 0.7
    top_p: Optional[float] = 1.0
    frequency_penalty: Optional[float] = 0.0
    presence_penalty: Optional[float] = 0.0
    system_prompt: Optional[str] = None

class ULCALlmInferenceRequest(_ULCABaseInferenceRequest):
    messages: List[Dict[str, str]]  # [{"role": "user", "content": "..."}]
    config: _ULCALlmInferenceRequestConfig
```

#### 1.3 Implement LLM Inference Endpoint
**Files to Modify:**
- `server/module/services/router/inference_router.py`
- `server/module/services/service/inference_service.py`

```python
@router.post("/llm", response_model=ULCALlmInferenceResponse)
async def _run_inference_llm(
    request: ULCALlmInferenceRequest,
    request_state: Request,
    params: ULCAInferenceQuery = Depends(),
    inference_service: InferenceService = Depends(InferenceService),
):
    if params.serviceId:
        request.set_service_id(params.serviceId)
    
    return await inference_service.run_llm_inference(
        request, request_state.state.api_key_name, request_state.state.user_id
    )
```

### Phase 2: LLM Metering Implementation

#### 2.1 Token-Based Usage Calculation
**Files to Modify:**
- `server/celery_backend/tasks/metering.py`

```python
def calculate_llm_usage(request_data: dict, response_data: dict) -> int:
    """Calculate LLM usage based on input/output tokens"""
    input_tokens = estimate_tokens(request_data.get("messages", []))
    output_tokens = response_data.get("usage", {}).get("completion_tokens", 0)
    
    # Model-specific pricing (tokens per unit)
    model = request_data.get("config", {}).get("model", "gpt-3.5-turbo")
    pricing = LLM_PRICING_MAP.get(model, {"input": 1, "output": 2})
    
    return (input_tokens * pricing["input"]) + (output_tokens * pricing["output"])
```

#### 2.2 Update Metering Pipeline
**Files to Modify:**
- `server/celery_backend/tasks/log_data.py`

```python
@app.task(name="log.data")
def log_data(usage_type: str, service_id: str, ...):
    # Add LLM support
    if usage_type == "llm":
        data_usage = {
            "messages": req_body["messages"],
            "model": req_body["config"]["model"],
            "response_tokens": resp_body.get("usage", {})
        }
    # ... existing logic
```

### Phase 3: Service Integration

#### 3.1 LLM Service Gateway
**Files to Modify:**
- `server/module/services/gateway/inference_gateway.py`

```python
async def send_llm_request(
    self,
    request_body: ULCALlmInferenceRequest,
    service: Service,
) -> dict:
    """Route LLM requests to appropriate providers"""
    provider = service.provider  # "openai", "anthropic", "local"
    
    if provider == "openai":
        return await self._send_openai_request(request_body, service)
    elif provider == "anthropic":
        return await self._send_anthropic_request(request_body, service)
    # ... other providers
```

#### 3.2 Model Registration for LLMs
**Files to Modify:**
- `server/module/services/service/admin_service.py`

Example LLM model registration:
```json
{
  "modelId": "openai/gpt-4",
  "name": "GPT-4",
  "description": "OpenAI's most capable model",
  "task": {"type": "llm"},
  "languages": [{"sourceLanguage": "en", "targetLanguage": "en"}],
  "inferenceEndPoint": {
    "schema": {
      "request": {...},
      "response": {...}
    }
  },
  "domain": ["general", "conversation", "reasoning"],
  "license": "Commercial"
}
```

### Phase 4: Pipeline Integration

#### 4.1 Update Pipeline Validation
**Files to Modify:**
- `server/module/services/service/inference_service.py`

```python
# Add LLM pipeline support
elif current_task_type == _ULCATaskType.LLM:
    if next_task_type not in {_ULCATaskType.TTS, _ULCATaskType.TRANSLATION}:
        is_pipeline_valid = False
        break
```

#### 4.2 Frontend API Configuration
**Files to Modify:**
- `client/api/apiConfig.ts`
- `manishclient/client/api/apiConfig.ts`

```typescript
const dhruvaAPI: { [key: string]: string } = {
  // ... existing endpoints
  llmInference: `${dhruvaRootURL}/services/inference/llm`,
  // ... rest
};
```

---

## Infrastructure Considerations

### Performance Requirements
- **Latency**: LLM requests typically 1-10 seconds vs milliseconds for other tasks
- **Throughput**: Lower concurrent requests due to higher resource usage
- **Memory**: Potential local model hosting requires significant RAM/GPU

### Monitoring Enhancements
```python
# Additional Prometheus metrics for LLMs
LLM_REQUEST_TOKENS = Histogram(
    "dhruva_llm_request_tokens_total",
    "Total tokens processed in LLM requests",
    labelnames=("model", "api_key_name", "user_id")
)

LLM_RESPONSE_TIME = Histogram(
    "dhruva_llm_response_duration_seconds", 
    "LLM response time distribution",
    labelnames=("model", "provider", "api_key_name")
)
```

### Database Schema Updates
```sql
-- TimescaleDB: Enhanced metrics for LLMs
ALTER TABLE apikey ADD COLUMN input_tokens INTEGER;
ALTER TABLE apikey ADD COLUMN output_tokens INTEGER;
ALTER TABLE apikey ADD COLUMN model_name TEXT;
ALTER TABLE apikey ADD COLUMN provider TEXT;
```

---

## Cost and Resource Analysis

### Development Effort Estimate
- **Phase 1 (Core Support)**: 2-3 weeks
- **Phase 2 (Metering)**: 1-2 weeks  
- **Phase 3 (Service Integration)**: 2-3 weeks
- **Phase 4 (Pipeline Integration)**: 1 week
- **Testing & Documentation**: 1-2 weeks

**Total Estimated Effort**: 7-11 weeks

### Infrastructure Costs
- **External APIs**: Variable based on usage (OpenAI: $0.01-0.06/1K tokens)
- **Local Hosting**: GPU instances for local models ($1-5/hour)
- **Storage**: Minimal additional requirements
- **Monitoring**: Existing infrastructure sufficient

---

## Risk Assessment

### Technical Risks
- **API Rate Limits**: External LLM providers have strict limits
- **Cost Overruns**: Uncontrolled usage can lead to high bills
- **Latency Issues**: LLM responses may timeout existing infrastructure
- **Model Availability**: Provider outages affect service reliability

### Mitigation Strategies
- **Multi-Provider Support**: Fallback between OpenAI, Anthropic, local models
- **Usage Controls**: Rate limiting, budget alerts, user quotas
- **Caching**: Response caching for repeated queries
- **Monitoring**: Comprehensive alerting for costs and performance

---

## Conclusion

The Dhruva Platform is **well-positioned for LLM integration** with its robust infrastructure and extensible architecture. The primary work involves:

1. **Schema Extensions**: Adding LLM task types and request/response models
2. **Endpoint Implementation**: Creating LLM inference routes and service logic  
3. **Metering Enhancement**: Token-based usage calculation and monitoring
4. **Service Integration**: Supporting multiple LLM providers

The existing monitoring, metering, and service management systems provide a strong foundation that minimizes the complexity of LLM integration. With proper implementation, the platform can support enterprise-grade LLM workloads while maintaining its current reliability and performance standards.

**Recommendation**: Proceed with LLM integration following the phased approach outlined above, starting with core task type support and gradually adding advanced features like pipeline integration and multi-provider support.

---

## Detailed Implementation Specifications

### LLM Request/Response Schema Details

#### Complete LLM Request Schema
```python
# server/schema/services/request/ulca_llm_inference_request.py
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field
from ..common import _ULCABaseInferenceRequest, _ULCABaseInferenceRequestConfig

class _ULCALlmMessage(BaseModel):
    role: str = Field(..., description="Message role: 'system', 'user', or 'assistant'")
    content: str = Field(..., description="Message content")
    name: Optional[str] = Field(None, description="Optional name for the message sender")

class _ULCALlmInferenceRequestConfig(_ULCABaseInferenceRequestConfig):
    model: str = Field(..., description="LLM model identifier")
    max_tokens: Optional[int] = Field(1000, ge=1, le=8192)
    temperature: Optional[float] = Field(0.7, ge=0.0, le=2.0)
    top_p: Optional[float] = Field(1.0, ge=0.0, le=1.0)
    frequency_penalty: Optional[float] = Field(0.0, ge=-2.0, le=2.0)
    presence_penalty: Optional[float] = Field(0.0, ge=-2.0, le=2.0)
    stop: Optional[Union[str, List[str]]] = Field(None, description="Stop sequences")
    stream: Optional[bool] = Field(False, description="Enable streaming responses")
    system_prompt: Optional[str] = Field(None, description="System message override")

class ULCALlmInferenceRequest(_ULCABaseInferenceRequest):
    messages: List[_ULCALlmMessage] = Field(..., min_items=1)
    config: _ULCALlmInferenceRequestConfig
```

#### Complete LLM Response Schema
```python
# server/schema/services/response/ulca_llm_inference_response.py
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from ..common import _ULCATaskType

class _ULCALlmUsage(BaseModel):
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int

class _ULCALlmChoice(BaseModel):
    index: int
    message: Dict[str, str]  # {"role": "assistant", "content": "..."}
    finish_reason: str  # "stop", "length", "content_filter"

class ULCALlmInferenceResponse(BaseModel):
    taskType: _ULCATaskType = _ULCATaskType.LLM
    choices: List[_ULCALlmChoice]
    usage: _ULCALlmUsage
    model: str
    created: int  # Unix timestamp
    config: Optional[Dict[str, Any]] = None
```

### Complete Inference Service Implementation

```python
# server/module/services/service/inference_service.py (additions)
async def run_llm_inference(
    self,
    request_body: ULCALlmInferenceRequest,
    api_key_name: str,
    user_id: str
) -> ULCALlmInferenceResponse:
    """Execute LLM inference request"""

    # Metrics collection
    INFERENCE_REQUEST_COUNT.labels(
        api_key_name,
        user_id,
        request_body.config.serviceId,
        "llm",
        None,  # source_language (N/A for LLM)
        None   # target_language (N/A for LLM)
    ).inc()

    serviceId = request_body.config.serviceId
    service: Service = validate_service_id(serviceId, self.service_repository)

    # Prepare headers for external LLM service
    headers = {
        "Authorization": f"Bearer {service.api_key}",
        "Content-Type": "application/json"
    }

    # Track request duration
    with INFERENCE_REQUEST_DURATION_SECONDS.labels(
        api_key_name,
        user_id,
        request_body.config.serviceId,
        "llm",
        None,
        None,
    ).time():
        # Route to appropriate LLM provider
        response = await self.inference_gateway.send_llm_request(
            request_body=request_body,
            service=service
        )

    return ULCALlmInferenceResponse(**response)
```

### Enhanced Inference Gateway for LLM Support

```python
# server/module/services/gateway/inference_gateway.py (additions)
async def send_llm_request(
    self,
    request_body: ULCALlmInferenceRequest,
    service: Service,
) -> dict:
    """Route LLM requests to appropriate providers"""

    try:
        provider = service.metadata.get("provider", "openai")  # Default to OpenAI

        if provider == "openai":
            return await self._send_openai_request(request_body, service)
        elif provider == "anthropic":
            return await self._send_anthropic_request(request_body, service)
        elif provider == "local":
            return await self._send_local_llm_request(request_body, service)
        else:
            raise ValueError(f"Unsupported LLM provider: {provider}")

    except Exception as e:
        logger.error(f"LLM inference failed: {str(e)}")
        raise BaseError(Errors.DHRUVA101.value, traceback.format_exc())

async def _send_openai_request(
    self,
    request_body: ULCALlmInferenceRequest,
    service: Service
) -> dict:
    """Send request to OpenAI API"""

    payload = {
        "model": request_body.config.model,
        "messages": [msg.dict() for msg in request_body.messages],
        "max_tokens": request_body.config.max_tokens,
        "temperature": request_body.config.temperature,
        "top_p": request_body.config.top_p,
        "frequency_penalty": request_body.config.frequency_penalty,
        "presence_penalty": request_body.config.presence_penalty,
        "stream": request_body.config.stream or False
    }

    # Add system prompt if provided
    if request_body.config.system_prompt:
        payload["messages"].insert(0, {
            "role": "system",
            "content": request_body.config.system_prompt
        })

    headers = {
        "Authorization": f"Bearer {service.api_key}",
        "Content-Type": "application/json"
    }

    response = requests.post(
        service.endpoint,  # e.g., "https://api.openai.com/v1/chat/completions"
        json=payload,
        headers=headers,
        timeout=60  # LLM requests can take longer
    )

    if response.status_code >= 400:
        raise BaseError(Errors.DHRUVA102.value, f"OpenAI API error: {response.text}")

    return response.json()

async def _send_anthropic_request(
    self,
    request_body: ULCALlmInferenceRequest,
    service: Service
) -> dict:
    """Send request to Anthropic Claude API"""

    # Convert OpenAI format to Anthropic format
    messages = []
    system_prompt = request_body.config.system_prompt

    for msg in request_body.messages:
        if msg.role == "system" and not system_prompt:
            system_prompt = msg.content
        elif msg.role in ["user", "assistant"]:
            messages.append({"role": msg.role, "content": msg.content})

    payload = {
        "model": request_body.config.model,
        "messages": messages,
        "max_tokens": request_body.config.max_tokens,
        "temperature": request_body.config.temperature,
        "top_p": request_body.config.top_p,
        "stream": request_body.config.stream or False
    }

    if system_prompt:
        payload["system"] = system_prompt

    headers = {
        "x-api-key": service.api_key,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01"
    }

    response = requests.post(
        service.endpoint,  # e.g., "https://api.anthropic.com/v1/messages"
        json=payload,
        headers=headers,
        timeout=60
    )

    if response.status_code >= 400:
        raise BaseError(Errors.DHRUVA102.value, f"Anthropic API error: {response.text}")

    # Convert Anthropic response to OpenAI format for consistency
    anthropic_response = response.json()
    return {
        "choices": [{
            "index": 0,
            "message": {
                "role": "assistant",
                "content": anthropic_response["content"][0]["text"]
            },
            "finish_reason": anthropic_response.get("stop_reason", "stop")
        }],
        "usage": {
            "prompt_tokens": anthropic_response["usage"]["input_tokens"],
            "completion_tokens": anthropic_response["usage"]["output_tokens"],
            "total_tokens": anthropic_response["usage"]["input_tokens"] + anthropic_response["usage"]["output_tokens"]
        },
        "model": request_body.config.model,
        "created": int(time.time())
    }
```

### Enhanced Metering for LLM Workloads

```python
# server/celery_backend/tasks/metering.py (additions)

# LLM pricing configuration (tokens per inference unit)
LLM_PRICING_MAP = {
    "gpt-4": {"input": 30, "output": 60},  # $0.03/$0.06 per 1K tokens
    "gpt-4-turbo": {"input": 10, "output": 30},
    "gpt-3.5-turbo": {"input": 1, "output": 2},
    "claude-3-opus": {"input": 15, "output": 75},
    "claude-3-sonnet": {"input": 3, "output": 15},
    "claude-3-haiku": {"input": 0.25, "output": 1.25},
    "llama-2-70b": {"input": 0.7, "output": 0.8},  # Local hosting costs
    "default": {"input": 1, "output": 2}
}

def estimate_tokens(messages: List[Dict[str, str]]) -> int:
    """Estimate token count for messages (rough approximation)"""
    total_chars = sum(len(msg.get("content", "")) for msg in messages)
    # Rough estimate: 1 token ≈ 4 characters for English
    return max(1, total_chars // 4)

def calculate_llm_usage(request_data: dict, response_data: dict) -> int:
    """Calculate LLM usage based on input/output tokens"""

    # Extract token usage from response
    usage = response_data.get("usage", {})
    input_tokens = usage.get("prompt_tokens", 0)
    output_tokens = usage.get("completion_tokens", 0)

    # Fallback to estimation if usage not provided
    if input_tokens == 0:
        input_tokens = estimate_tokens(request_data.get("messages", []))

    # Get model-specific pricing
    model = request_data.get("config", {}).get("model", "gpt-3.5-turbo")
    pricing = LLM_PRICING_MAP.get(model, LLM_PRICING_MAP["default"])

    # Calculate total cost in inference units (scaled to avoid decimals)
    input_cost = (input_tokens * pricing["input"]) // 1000  # Per 1K tokens
    output_cost = (output_tokens * pricing["output"]) // 1000

    return max(1, input_cost + output_cost)  # Minimum 1 unit

# Update main metering function
def meter_usage(
    api_key_id: Optional[str],
    input_data: List,
    usage_type: str,
    service_id: str,
    response_data: Optional[dict] = None
):
    """Enhanced metering with LLM support"""
    if not api_key_id:
        return

    inference_units = 0
    if usage_type == "asr":
        inference_units = calculate_asr_usage(input_data)
    elif usage_type in ("translation", "transliteration"):
        inference_units = calculate_translation_usage(input_data)
    elif usage_type == "tts":
        inference_units = calculate_tts_usage(input_data)
    elif usage_type == "llm":
        # For LLM, input_data contains the request, response_data contains the response
        request_data = input_data[0] if input_data else {}
        inference_units = calculate_llm_usage(request_data, response_data or {})
    else:
        logging.warning(f"Unknown usage type: {usage_type}")
        inference_units = 1  # Default fallback

    logging.info(f"Calculated {inference_units} inference units for {usage_type}")
    write_to_db(api_key_id, inference_units, service_id, usage_type)
```

### Database Schema Enhancements

```sql
-- TimescaleDB schema updates for LLM metrics
-- server/celery_backend/tasks/metering_database.py

class ApiKey(Base):
    __table_args__ = {"timescaledb_hypertable": {"time_column_name": "timestamp"}}
    __tablename__ = "apikey"

    api_key_id = Column("api_key_id", Text)
    api_key_name = Column("api_key_name", Text)
    user_id = Column("user_id", Text)
    user_email = Column("user_email", Text)
    inference_service_id = Column("inference_service_id", Text)
    task_type = Column("task_type", Text)
    usage = Column("usage", Float)

    # New LLM-specific columns
    input_tokens = Column("input_tokens", Integer, nullable=True)
    output_tokens = Column("output_tokens", Integer, nullable=True)
    model_name = Column("model_name", Text, nullable=True)
    provider = Column("provider", Text, nullable=True)

    timestamp = Column(
        "timestamp",
        DateTime(timezone=True),
        default=datetime.datetime.now,
        primary_key=True,
    )
```

### Frontend Integration

```typescript
// client/api/apiConfig.ts (additions)
const dhruvaAPI: { [key: string]: string } = {
  // ... existing endpoints
  llmInference: `${dhruvaRootURL}/services/inference/llm`,
  llmStreamingInference: `wss://${dhruvaHost}/services/inference/llm/stream`,
  // ... rest
};

// client/api/llmAPI.ts (new file)
import { dhruvaAPI, apiInstance } from "./apiConfig";

interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
  name?: string;
}

interface LLMInferenceRequest {
  messages: LLMMessage[];
  config: {
    serviceId: string;
    model: string;
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    stream?: boolean;
    system_prompt?: string;
  };
  controlConfig?: {
    dataTracking?: boolean;
  };
}

interface LLMInferenceResponse {
  taskType: "llm";
  choices: Array<{
    index: number;
    message: {
      role: "assistant";
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
  created: number;
}

export const sendLLMInference = async (
  request: LLMInferenceRequest
): Promise<LLMInferenceResponse> => {
  const response = await apiInstance({
    method: "POST",
    url: dhruvaAPI.llmInference,
    data: request,
  });
  return response.data;
};

export const sendLLMInferenceStreaming = async (
  request: LLMInferenceRequest,
  onChunk: (chunk: string) => void,
  onComplete: (response: LLMInferenceResponse) => void,
  onError: (error: Error) => void
): Promise<void> => {
  // WebSocket streaming implementation
  const ws = new WebSocket(dhruvaAPI.llmStreamingInference);

  ws.onopen = () => {
    ws.send(JSON.stringify(request));
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "chunk") {
        onChunk(data.content);
      } else if (data.type === "complete") {
        onComplete(data.response);
        ws.close();
      }
    } catch (error) {
      onError(new Error("Failed to parse streaming response"));
    }
  };

  ws.onerror = () => {
    onError(new Error("WebSocket connection failed"));
  };
};
```

This completes the comprehensive LLM integration analysis with detailed implementation specifications, code examples, and architectural considerations for the Dhruva Platform.
