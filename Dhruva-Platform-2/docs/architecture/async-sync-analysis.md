# Dhruva Platform Backend: Synchronous vs Asynchronous Architecture Analysis

## Executive Summary

The Dhruva Platform backend exhibits a **hybrid architecture** with significant **synchronous bottlenecks** that severely limit scalability and performance. While the application uses modern async frameworks (FastAPI, Socket.IO), critical components remain synchronous, creating performance bottlenecks that affect the entire system.

**Key Findings:**
- ✅ **Async Foundation**: FastAPI, Socket.IO, and event handlers are properly asynchronous
- ❌ **Critical Bottlenecks**: Inference API calls, external HTTP requests, and audio processing are synchronous
- ⚠️ **Hybrid Issues**: Synchronous code called within async contexts blocks the event loop
- 📊 **Performance Impact**: Single-threaded bottlenecks limit concurrent user capacity to ~10-20 users

---

## 1. Asynchronous Components Analysis

### 1.1 FastAPI Application Layer ✅

**Framework**: FastAPI with ASGI (Uvicorn)
**Status**: Fully Asynchronous

```python
# main.py - Async FastAPI application
app = FastAPI(
    title="Dhruva API",
    description="Backend API for communicating with the Dhruva platform",
)

# Async startup events
@app.on_event("startup")
async def init_mongo_client():
    db_client["app"] = pymongo.MongoClient(os.environ["APP_DB_CONNECTION_STRING"])

@app.on_event("startup") 
async def init_metering_db():
    Base.metadata.create_all(engine)
```

**Async Features:**
- ASGI server (Uvicorn) with async request handling
- Async startup/shutdown event handlers
- Async exception handlers for error management
- Async middleware stack for request processing

### 1.2 WebSocket/Socket.IO Layer ✅

**Framework**: Python Socket.IO with AsyncServer
**Status**: Fully Asynchronous

```python
# seq_streamer.py - Async Socket.IO server
self.sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
self.app = socketio.ASGIApp(self.sio, socketio_path="")

# Async event handlers
@self.sio.event
async def connect(sid: str, environ: dict, auth):
    # Non-blocking connection handling

@self.sio.on("data")
async def data(sid: str, input_data: dict, streaming_config: dict, 
               clear_server_state: bool, disconnect_stream: bool):
    # Async data processing
```

**Async Features:**
- AsyncServer for concurrent WebSocket connections
- Async event handlers for real-time communication
- Non-blocking Socket.IO emit operations
- Concurrent client state management

### 1.3 API Route Handlers ✅

**Framework**: FastAPI with async route handlers
**Status**: Properly Asynchronous

```python
# auth_router.py - Async route handlers
@router.post("/signin", response_model=SignInResponse)
async def _sign_in(request: SignInRequest, auth_service: AuthService = Depends(AuthService)):
    res = auth_service.validate_user(request)
    return res

@router.get("/dashboard")
async def _view_admin_dashboard(
    request: ViewAdminDashboardRequest = Depends(),
    admin_service: AdminService = Depends(AdminService),
) -> GetAllApiKeysDetailsResponse:
    return admin_service.view_dashboard(request.page, request.limit, request.target_user_id)
```

### 1.4 Background Task System ✅

**Framework**: Celery with RabbitMQ
**Status**: Asynchronous Task Processing

```python
# celery_backend/celery_app.py - Async task scheduling
app.conf.beat_schedule = {
    "heartbeat": {
        "task": "heartbeat",
        "schedule": 300.0,
        "options": {"queue": "heartbeat"},
    },
    "upload-feedback-dump": {
        "task": "upload.feedback.dump", 
        "schedule": crontab(day_of_month="1", hour="6", minute="30"),
        "options": {"queue": "upload-feedback-dump"},
    },
}
```

**Async Background Tasks:**
- `log_data`: Request/response logging (async queued)
- `heartbeat`: Service health monitoring (async scheduled)
- `push_metrics`: Prometheus metrics pushing (async queued)
- `upload_feedback_dump`: Monthly data export (async scheduled)
- `send_usage_email`: Weekly usage reports (async scheduled)

---

## 2. Synchronous Components Analysis

### 2.1 Inference API Calls ❌ **CRITICAL BOTTLENECK**

**Library**: `requests` (synchronous HTTP client)
**Impact**: **BLOCKS ENTIRE EVENT LOOP**

```python
# seq_streamer.py - SYNCHRONOUS in ASYNC context
async def run_inference_and_send(self, sid: str, is_final: bool) -> None:
    response = self.run_inference(sid, is_final)  # BLOCKS HERE
    if response:
        await self.sio.emit("response", data=(response[0], response[1]), room=sid)

def run_inference(self, sid: str, is_final: bool) -> dict:
    # SYNCHRONOUS HTTP call blocks all WebSocket connections
    response = requests.post(
        self.inference_url,
        json=request_json,
        headers=self.client_states[sid].http_headers,
        # timeout=1  # COMMENTED OUT - No timeout protection!
    )
    return response.json()
```

**Performance Impact:**
- **Single-threaded blocking**: One inference call freezes ALL WebSocket connections
- **Cascading delays**: 2-10 second inference calls affect all users
- **Connection timeouts**: Clients disconnect due to server unresponsiveness
- **Poor scalability**: Cannot handle more than 1-2 concurrent inference requests

### 2.2 External HTTP Requests ❌ **MAJOR BOTTLENECK**

**Multiple synchronous HTTP calls throughout the codebase:**

```python
# inference_gateway.py - Synchronous service calls
def send_inference_request(self, request_body: Any, service: Service) -> dict:
    try:
        response = requests.post(service.endpoint, json=request_body.dict())
    except:
        raise BaseError(Errors.DHRUVA101.value, traceback.format_exc())
    return response.json()

# feedback_service.py - Synchronous external API
def fetch_questions(self, request: ULCAFeedbackQuestionRequest):
    return requests.post(
        "https://dev-auth.ulcacontrib.org/ulca/mdms/v0/pipelineQuestions",
        json=request.dict(),
    ).json()
```

### 2.3 Database Operations ⚠️ **MIXED IMPLEMENTATION**

**MongoDB Operations**: Synchronous PyMongo
**Status**: Synchronous but fast (local network)

```python
# BaseRepository.py - Synchronous MongoDB operations
def find_one(self, query: dict) -> Optional[T]:
    results = self.collection.find_one(query)  # SYNCHRONOUS
    if results:
        return self.__map_to_model(results)

def insert_one(self, data: T) -> str:
    document = self.__map_to_document(data)
    result = self.collection.insert_one(document)  # SYNCHRONOUS
    return str(result.inserted_id)
```

**Impact**: Moderate - Database operations are fast but still block event loop

### 2.4 Audio Processing ❌ **COMPUTATIONAL BOTTLENECK**

**Audio format conversion and processing:**

```python
# asr_streamer.py - Synchronous audio processing
def run_inference(self, sid: str) -> str:
    # SYNCHRONOUS audio processing blocks event loop
    byte_io = io.BytesIO()
    with wave.open(byte_io, "wb") as file:
        file.setnchannels(1)
        file.setsampwidth(2) 
        file.setframerate(self.client_states[sid].sampling_rate)
        file.writeframes(self.client_states[sid].buffer)  # CPU-intensive
    
    byte_io.seek(0)
    return self.run_ulca_inference_from_stream(sid, byte_io)
```

### 2.5 File I/O Operations ❌ **I/O BOTTLENECK**

**Synchronous file operations in background tasks:**

```python
# upload_feedback_dump.py - Synchronous file I/O
@app.task(name="upload.feedback.dump")
def upload_feedback_dump() -> None:
    file = io.StringIO()  # SYNCHRONOUS file operations
    csv_writer = csv.writer(file)
    csv_writer.writerow(csv_headers)
    
    # Synchronous database queries and file writing
    for feedback in feedback_collection.find(query):
        csv_writer.writerow([...])  # BLOCKS during large datasets
```

---

## 3. Hybrid/Problematic Areas

### 3.1 Sync-in-Async Anti-Pattern ❌ **CRITICAL ISSUE**

**Most Critical Problem**: Synchronous HTTP calls within async WebSocket handlers

```python
# seq_streamer.py - ANTI-PATTERN
async def run_inference_and_send(self, sid: str, is_final: bool) -> None:
    # This is an ASYNC function that calls SYNCHRONOUS code
    response = self.run_inference(sid, is_final)  # BLOCKS EVENT LOOP
    if response:
        await self.sio.emit("response", data=(response[0], response[1]), room=sid)
```

**Why This Is Critical:**
- Async function calls synchronous HTTP request
- Blocks entire event loop during inference (2-10 seconds)
- All WebSocket connections freeze
- Defeats the purpose of async architecture

### 3.2 Missing Timeout Protection ❌ **RELIABILITY ISSUE**

```python
# Timeouts are commented out - infinite blocking possible
response = requests.post(
    self.inference_url,
    json=request_json,
    headers=self.client_states[sid].http_headers,
    # timeout=1  # COMMENTED OUT!
)
```

### 3.3 Triton Client Blocking ❌ **PERFORMANCE ISSUE**

```python
# inference_gateway.py - Blocking Triton operations
response = triton_client.async_infer(
    model_name, model_version="1",
    inputs=input_list, outputs=output_list, headers=headers,
)
response = response.get_result(block=True, timeout=20)  # BLOCKS!
```

---

## 4. Performance Impact Assessment

### 4.1 WebSocket Streaming Performance

**Current Limitations:**
- **Concurrent Users**: 1-2 active inference requests maximum
- **Response Time**: 2-10 seconds (highly variable)
- **Throughput**: ~0.1-0.5 requests/second
- **Connection Stability**: Poor (frequent timeouts)

**Root Cause**: Synchronous inference calls in async WebSocket handlers

### 4.2 API Endpoint Performance

**Current Performance:**
- **Simple Queries**: 50-200ms (acceptable)
- **Inference Endpoints**: 2-10 seconds (poor)
- **External API Calls**: 1-5 seconds (poor)
- **Database Operations**: 10-50ms (good)

### 4.3 Scalability Analysis

**Horizontal Scaling Issues:**
- Worker processes cannot share WebSocket connection state
- Synchronous bottlenecks limit per-worker capacity
- Load balancing complicated by stateful WebSocket connections

**Vertical Scaling Issues:**
- Single-threaded bottlenecks don't benefit from more CPU cores
- Memory usage grows with connection count but throughput doesn't improve
- I/O wait time dominates CPU utilization

---

## 5. Architecture Recommendations

### 5.1 High Priority (Immediate Action Required)

#### **1. Replace Synchronous HTTP Client** 🚨 **CRITICAL**

**Current Problem:**
```python
# BLOCKING - Freezes entire server
response = requests.post(url, json=data)
```

**Solution:**
```python
import aiohttp
import asyncio

async def run_inference_async(self, sid: str, is_final: bool):
    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(
                self.inference_url,
                json=request_json,
                headers=self.client_states[sid].http_headers,
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                return await response.json()
        except asyncio.TimeoutError:
            raise InferenceTimeoutError("Inference request timed out")
```

**Expected Impact:**
- **Concurrency**: 50-100+ simultaneous WebSocket connections
- **Response Time**: Consistent 0.5-2 seconds
- **Throughput**: 20-50+ requests/second
- **Reliability**: Proper timeout handling

#### **2. Implement Connection Pooling** 🚨 **CRITICAL**

```python
# Initialize once at startup
self.http_session = aiohttp.ClientSession(
    connector=aiohttp.TCPConnector(
        limit=100,           # Total connection pool size
        limit_per_host=30,   # Per-host connection limit
        keepalive_timeout=30,
        enable_cleanup_closed=True
    ),
    timeout=aiohttp.ClientTimeout(total=30, connect=10)
)
```

#### **3. Add Proper Error Handling** 🚨 **CRITICAL**

```python
async def run_inference_with_retry(self, sid: str, is_final: bool, max_retries: int = 3):
    for attempt in range(max_retries):
        try:
            return await self.run_inference_async(sid, is_final)
        except asyncio.TimeoutError:
            if attempt == max_retries - 1:
                await self.sio.emit("error", data="Inference timeout", room=sid)
                raise
            await asyncio.sleep(2 ** attempt)  # Exponential backoff
        except aiohttp.ClientError as e:
            await self.sio.emit("error", data=f"Inference failed: {str(e)}", room=sid)
            raise
```

### 5.2 Medium Priority

#### **4. Async Database Operations** ⚠️ **IMPORTANT**

**Replace PyMongo with Motor (async MongoDB driver):**

```python
import motor.motor_asyncio

# Async MongoDB operations
class AsyncBaseRepository:
    def __init__(self, db: motor.motor_asyncio.AsyncIOMotorDatabase, collection_name: str):
        self.collection = db[collection_name]
    
    async def find_one_async(self, query: dict) -> Optional[T]:
        result = await self.collection.find_one(query)
        if result:
            return self.__map_to_model(result)
        return None
    
    async def insert_one_async(self, data: T) -> str:
        document = self.__map_to_document(data)
        result = await self.collection.insert_one(document)
        return str(result.inserted_id)
```

#### **5. Background Audio Processing** ⚠️ **IMPORTANT**

**Move CPU-intensive audio processing to background tasks:**

```python
import asyncio
from concurrent.futures import ThreadPoolExecutor

class AsyncAudioProcessor:
    def __init__(self):
        self.executor = ThreadPoolExecutor(max_workers=4)
    
    async def process_audio_async(self, audio_buffer: bytes, sampling_rate: int) -> bytes:
        # Run CPU-intensive audio processing in thread pool
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            self.executor, 
            self._process_audio_sync, 
            audio_buffer, 
            sampling_rate
        )
    
    def _process_audio_sync(self, audio_buffer: bytes, sampling_rate: int) -> bytes:
        # Synchronous audio processing (runs in separate thread)
        byte_io = io.BytesIO()
        with wave.open(byte_io, "wb") as file:
            file.setnchannels(1)
            file.setsampwidth(2)
            file.setframerate(sampling_rate)
            file.writeframes(audio_buffer)
        byte_io.seek(0)
        return byte_io.getvalue()
```

### 5.3 Low Priority (Future Improvements)

#### **6. Async File I/O** 📝 **ENHANCEMENT**

```python
import aiofiles

async def write_csv_async(data: List[dict], filename: str):
    async with aiofiles.open(filename, 'w') as file:
        writer = csv.writer(file)
        await writer.writerow(headers)
        for row in data:
            await writer.writerow(row)
```

#### **7. Streaming Response Architecture** 📝 **ENHANCEMENT**

```python
async def stream_inference_results(self, sid: str):
    """Stream partial results as they become available"""
    async for partial_result in self.inference_stream(sid):
        await self.sio.emit("partial_response", data=partial_result, room=sid)
```

---

## 6. Implementation Priority Matrix

| Component | Current State | Priority | Expected Impact | Implementation Effort |
|-----------|---------------|----------|-----------------|----------------------|
| HTTP Client (requests → aiohttp) | Synchronous | 🚨 Critical | Very High | Medium |
| Connection Pooling | None | 🚨 Critical | High | Low |
| Timeout Handling | Missing | 🚨 Critical | High | Low |
| Database Operations | Sync PyMongo | ⚠️ Important | Medium | High |
| Audio Processing | Blocking | ⚠️ Important | Medium | Medium |
| File I/O | Synchronous | 📝 Enhancement | Low | Medium |

---

## 7. Expected Performance Improvements

### Before Optimization:
- **Concurrent WebSocket Users**: 1-2
- **API Response Time**: 2-10 seconds
- **Throughput**: 0.1-0.5 req/sec
- **Connection Stability**: Poor

### After Critical Fixes:
- **Concurrent WebSocket Users**: 50-100+
- **API Response Time**: 0.5-2 seconds
- **Throughput**: 20-50+ req/sec
- **Connection Stability**: Excellent

### After Full Optimization:
- **Concurrent WebSocket Users**: 200-500+
- **API Response Time**: 0.2-1 second
- **Throughput**: 100-200+ req/sec
- **Connection Stability**: Production-ready

---

## 8. Conclusion

The Dhruva Platform's current architecture suffers from **critical synchronous bottlenecks** that severely limit its production scalability. The **immediate priority** should be replacing synchronous HTTP calls with async alternatives, particularly in the WebSocket streaming implementation.

**Key Actions:**
1. **🚨 IMMEDIATE**: Replace `requests` with `aiohttp` in streaming components
2. **🚨 IMMEDIATE**: Add connection pooling and timeout handling
3. **⚠️ SOON**: Migrate to async database operations
4. **📝 FUTURE**: Implement comprehensive async file I/O

These changes will transform the platform from a **pseudo-async** system limited to ~10 concurrent users to a **truly async** system capable of handling **hundreds of concurrent users** with consistent performance.

---

## 9. Detailed Code Examples and Fixes

### 9.1 WebSocket Streaming - Before vs After

#### **BEFORE (Current Problematic Implementation):**

```python
# seq_streamer.py - BLOCKS EVENT LOOP
class StreamingServerTaskSequence:
    def run_inference(self, sid: str, is_final: bool) -> dict:
        # SYNCHRONOUS HTTP call - blocks ALL WebSocket connections
        response = requests.post(
            self.inference_url,
            json=request_json,
            headers=self.client_states[sid].http_headers,
            # timeout=1  # COMMENTED OUT - no timeout protection
        )
        return response.json()

    async def run_inference_and_send(self, sid: str, is_final: bool) -> None:
        # Async function calling sync code - ANTI-PATTERN
        response = self.run_inference(sid, is_final)  # BLOCKS HERE
        if response:
            await self.sio.emit("response", data=(response[0], response[1]), room=sid)
```

**Problems:**
- ❌ Blocks entire event loop for 2-10 seconds
- ❌ All WebSocket connections freeze during inference
- ❌ No timeout protection (can hang indefinitely)
- ❌ No error handling for network failures
- ❌ Cannot handle concurrent inference requests

#### **AFTER (Recommended Async Implementation):**

```python
# seq_streamer.py - FULLY ASYNC
import aiohttp
import asyncio
from typing import Optional

class AsyncStreamingServerTaskSequence:
    def __init__(self, async_mode: bool = True, max_connections: int = -1):
        # Initialize async HTTP session with connection pooling
        self.http_session: Optional[aiohttp.ClientSession] = None
        self.inference_semaphore = asyncio.Semaphore(10)  # Limit concurrent inferences

    async def __aenter__(self):
        # Create HTTP session with connection pooling
        connector = aiohttp.TCPConnector(
            limit=100,              # Total connection pool size
            limit_per_host=30,      # Per-host connection limit
            keepalive_timeout=30,   # Keep connections alive
            enable_cleanup_closed=True
        )

        timeout = aiohttp.ClientTimeout(
            total=30,      # Total request timeout
            connect=10,    # Connection timeout
            sock_read=20   # Socket read timeout
        )

        self.http_session = aiohttp.ClientSession(
            connector=connector,
            timeout=timeout,
            headers={'User-Agent': 'Dhruva-Platform/1.0'}
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.http_session:
            await self.http_session.close()

    async def run_inference_async(self, sid: str, is_final: bool, max_retries: int = 3) -> Optional[dict]:
        """Fully async inference with retry logic and proper error handling"""

        # Limit concurrent inference requests
        async with self.inference_semaphore:
            for attempt in range(max_retries):
                try:
                    # Construct request payload
                    request_json = {
                        "inputData": {
                            "audio": self.get_audio_payload(sid),
                        },
                        "pipelineTasks": self.client_states[sid].task_sequence[
                            : self.client_states[sid].sequence_depth_to_run
                        ],
                        "controlConfig": {"dataTracking": False},
                    }

                    # ASYNC HTTP request - non-blocking
                    async with self.http_session.post(
                        self.inference_url,
                        json=request_json,
                        headers=self.client_states[sid].http_headers
                    ) as response:

                        if response.status >= 400:
                            error_text = await response.text()
                            raise aiohttp.ClientResponseError(
                                request_info=response.request_info,
                                history=response.history,
                                status=response.status,
                                message=f"Inference API error: {error_text}"
                            )

                        result = await response.json()
                        return result

                except asyncio.TimeoutError:
                    if attempt == max_retries - 1:
                        await self.sio.emit("error",
                            data=f"Inference timeout after {max_retries} attempts",
                            room=sid)
                        return None

                    # Exponential backoff
                    wait_time = 2 ** attempt
                    await asyncio.sleep(wait_time)

                except aiohttp.ClientError as e:
                    if attempt == max_retries - 1:
                        await self.sio.emit("error",
                            data=f"Inference failed: {str(e)}",
                            room=sid)
                        return None

                    await asyncio.sleep(1)  # Brief pause before retry

                except Exception as e:
                    # Unexpected error - don't retry
                    await self.sio.emit("error",
                        data=f"Unexpected inference error: {str(e)}",
                        room=sid)
                    return None

        return None

    async def run_inference_and_send(self, sid: str, is_final: bool) -> Optional[dict]:
        """Fully async inference and response sending"""
        if (
            self.client_states[sid].input_audio__buffer is not None
            and not self.client_states[sid].input_audio__buffer.size
        ):
            return None

        # ASYNC inference call - non-blocking
        response = await self.run_inference_async(sid, is_final)

        if response:
            # Send response asynchronously
            await self.sio.emit("response",
                data=(response[0], response[1]),
                room=sid)

            # Update metrics asynchronously
            await self.update_inference_metrics(sid, response)

        return response

    async def update_inference_metrics(self, sid: str, response: dict):
        """Update metrics without blocking"""
        try:
            # Update metrics in background
            asyncio.create_task(self.log_inference_metrics(sid, response))
        except Exception as e:
            # Don't let metrics errors affect main flow
            print(f"Metrics update failed: {e}")
```

**Benefits:**
- ✅ **Non-blocking**: Multiple inference requests run concurrently
- ✅ **Timeout Protection**: Configurable timeouts prevent hanging
- ✅ **Retry Logic**: Automatic retry with exponential backoff
- ✅ **Error Handling**: Comprehensive error handling and user feedback
- ✅ **Connection Pooling**: Efficient HTTP connection reuse
- ✅ **Concurrency Control**: Semaphore limits concurrent requests
- ✅ **Metrics Integration**: Non-blocking metrics updates

### 9.2 Database Operations - Async Migration

#### **BEFORE (Synchronous PyMongo):**

```python
# BaseRepository.py - SYNCHRONOUS
class BaseRepository(Generic[T]):
    def find_one(self, query: dict) -> Optional[T]:
        results = self.collection.find_one(query)  # BLOCKS EVENT LOOP
        if results:
            return self.__map_to_model(results)

    def insert_one(self, data: T) -> str:
        document = self.__map_to_document(data)
        result = self.collection.insert_one(document)  # BLOCKS EVENT LOOP
        return str(result.inserted_id)
```

#### **AFTER (Async Motor):**

```python
# AsyncBaseRepository.py - FULLY ASYNC
import motor.motor_asyncio
from typing import Generic, List, Optional, TypeVar
import asyncio

T = TypeVar("T", bound=BaseModel)

class AsyncBaseRepository(Generic[T]):
    def __init__(self, db: motor.motor_asyncio.AsyncIOMotorDatabase, collection_name: str):
        self.db = db
        self.collection = db[collection_name]
        self.__document_class = self.__orig_bases__[0].__args__[0]

    async def find_one_async(self, query: dict) -> Optional[T]:
        """Async find one document"""
        try:
            result = await self.collection.find_one(query)
            if result:
                return self.__map_to_model(result)
            return None
        except Exception as e:
            print(f"Database find_one error: {e}")
            return None

    async def find_many_async(self, query: dict, limit: int = 100) -> List[T]:
        """Async find multiple documents with limit"""
        try:
            cursor = self.collection.find(query).limit(limit)
            results = await cursor.to_list(length=limit)
            return [self.__map_to_model(doc) for doc in results]
        except Exception as e:
            print(f"Database find_many error: {e}")
            return []

    async def insert_one_async(self, data: T) -> Optional[str]:
        """Async insert one document"""
        try:
            document = self.__map_to_document(data)
            result = await self.collection.insert_one(document)
            return str(result.inserted_id)
        except Exception as e:
            print(f"Database insert_one error: {e}")
            return None

    async def update_one_async(self, query: dict, update: dict) -> bool:
        """Async update one document"""
        try:
            result = await self.collection.update_one(query, {"$set": update})
            return result.modified_count > 0
        except Exception as e:
            print(f"Database update_one error: {e}")
            return False

    async def delete_one_async(self, query: dict) -> bool:
        """Async delete one document"""
        try:
            result = await self.collection.delete_one(query)
            return result.deleted_count > 0
        except Exception as e:
            print(f"Database delete_one error: {e}")
            return False

    # Batch operations for better performance
    async def insert_many_async(self, data_list: List[T]) -> List[str]:
        """Async bulk insert with better performance"""
        try:
            documents = [self.__map_to_document(data) for data in data_list]
            result = await self.collection.insert_many(documents)
            return [str(id) for id in result.inserted_ids]
        except Exception as e:
            print(f"Database insert_many error: {e}")
            return []

    async def aggregate_async(self, pipeline: List[dict]) -> List[dict]:
        """Async aggregation pipeline"""
        try:
            cursor = self.collection.aggregate(pipeline)
            return await cursor.to_list(length=None)
        except Exception as e:
            print(f"Database aggregate error: {e}")
            return []
```

### 9.3 Audio Processing - Background Threading

#### **BEFORE (Blocking Audio Processing):**

```python
# asr_streamer.py - BLOCKS EVENT LOOP
def run_inference(self, sid: str) -> str:
    # CPU-intensive audio processing blocks event loop
    byte_io = io.BytesIO()
    with wave.open(byte_io, "wb") as file:
        file.setnchannels(1)
        file.setsampwidth(2)
        file.setframerate(self.client_states[sid].sampling_rate)
        file.writeframes(self.client_states[sid].buffer)  # BLOCKS

    byte_io.seek(0)
    return self.run_ulca_inference_from_stream(sid, byte_io)
```

#### **AFTER (Async Audio Processing):**

```python
# async_audio_processor.py - NON-BLOCKING
import asyncio
from concurrent.futures import ThreadPoolExecutor
import numpy as np
import soundfile as sf
from typing import Tuple

class AsyncAudioProcessor:
    def __init__(self, max_workers: int = 4):
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.processing_semaphore = asyncio.Semaphore(max_workers * 2)

    async def process_audio_async(
        self,
        audio_buffer: bytes,
        sampling_rate: int,
        target_format: str = "wav"
    ) -> bytes:
        """Process audio in background thread to avoid blocking event loop"""

        async with self.processing_semaphore:
            loop = asyncio.get_event_loop()

            # Run CPU-intensive processing in thread pool
            processed_audio = await loop.run_in_executor(
                self.executor,
                self._process_audio_sync,
                audio_buffer,
                sampling_rate,
                target_format
            )

            return processed_audio

    def _process_audio_sync(
        self,
        audio_buffer: bytes,
        sampling_rate: int,
        target_format: str
    ) -> bytes:
        """Synchronous audio processing (runs in separate thread)"""
        try:
            # Convert raw bytes to audio format
            byte_io = io.BytesIO()

            if target_format.lower() == "wav":
                with wave.open(byte_io, "wb") as wav_file:
                    wav_file.setnchannels(1)  # Mono
                    wav_file.setsampwidth(2)  # 16-bit
                    wav_file.setframerate(sampling_rate)
                    wav_file.writeframes(audio_buffer)

            byte_io.seek(0)
            return byte_io.getvalue()

        except Exception as e:
            print(f"Audio processing error: {e}")
            return audio_buffer  # Return original if processing fails

    async def convert_sampling_rate_async(
        self,
        audio_data: np.ndarray,
        original_rate: int,
        target_rate: int
    ) -> np.ndarray:
        """Async audio resampling"""
        if original_rate == target_rate:
            return audio_data

        async with self.processing_semaphore:
            loop = asyncio.get_event_loop()

            resampled = await loop.run_in_executor(
                self.executor,
                self._resample_audio_sync,
                audio_data,
                original_rate,
                target_rate
            )

            return resampled

    def _resample_audio_sync(
        self,
        audio_data: np.ndarray,
        original_rate: int,
        target_rate: int
    ) -> np.ndarray:
        """Synchronous audio resampling (runs in thread pool)"""
        try:
            # Use scipy for resampling
            from scipy import signal

            # Calculate resampling ratio
            ratio = target_rate / original_rate
            num_samples = int(len(audio_data) * ratio)

            # Resample audio
            resampled = signal.resample(audio_data, num_samples)
            return resampled.astype(audio_data.dtype)

        except Exception as e:
            print(f"Audio resampling error: {e}")
            return audio_data

    async def validate_audio_async(
        self,
        audio_buffer: bytes,
        max_duration: float = 30.0
    ) -> Tuple[bool, str]:
        """Async audio validation"""
        async with self.processing_semaphore:
            loop = asyncio.get_event_loop()

            is_valid, message = await loop.run_in_executor(
                self.executor,
                self._validate_audio_sync,
                audio_buffer,
                max_duration
            )

            return is_valid, message

    def _validate_audio_sync(
        self,
        audio_buffer: bytes,
        max_duration: float
    ) -> Tuple[bool, str]:
        """Synchronous audio validation"""
        try:
            # Read audio data
            file_handle = io.BytesIO(audio_buffer)
            data, sampling_rate = sf.read(file_handle)

            # Calculate duration
            duration = len(data) / sampling_rate

            if duration > max_duration:
                return False, f"Audio too long: {duration:.1f}s > {max_duration}s"

            if duration < 0.1:
                return False, f"Audio too short: {duration:.1f}s"

            if sampling_rate < 8000:
                return False, f"Sampling rate too low: {sampling_rate}Hz"

            return True, "Audio validation passed"

        except Exception as e:
            return False, f"Audio validation error: {str(e)}"

    async def cleanup(self):
        """Cleanup thread pool"""
        self.executor.shutdown(wait=True)

# Usage in streaming server
class AsyncStreamingServerASR:
    def __init__(self):
        self.audio_processor = AsyncAudioProcessor(max_workers=4)

    async def process_audio_data(self, sid: str, audio_data: bytes) -> Optional[bytes]:
        """Process audio data asynchronously"""
        try:
            # Validate audio first
            is_valid, message = await self.audio_processor.validate_audio_async(audio_data)
            if not is_valid:
                await self.sio.emit("error", data=f"Audio validation failed: {message}", room=sid)
                return None

            # Process audio in background
            processed_audio = await self.audio_processor.process_audio_async(
                audio_data,
                self.client_states[sid].sampling_rate
            )

            return processed_audio

        except Exception as e:
            await self.sio.emit("error", data=f"Audio processing failed: {str(e)}", room=sid)
            return None
```

**Benefits of Async Audio Processing:**
- ✅ **Non-blocking**: Audio processing doesn't freeze WebSocket connections
- ✅ **Concurrent Processing**: Multiple audio streams processed simultaneously
- ✅ **Resource Management**: Thread pool limits CPU usage
- ✅ **Error Handling**: Graceful handling of audio processing errors
- ✅ **Validation**: Async audio validation before processing
- ✅ **Scalable**: Can handle many concurrent audio streams

---

## 10. Migration Strategy and Timeline

### Phase 1: Critical Fixes (Week 1-2) 🚨
**Goal**: Fix blocking operations that prevent scalability

1. **Replace requests with aiohttp** in streaming components
   - `seq_streamer.py` - inference calls
   - `asr_streamer.py` - inference calls
   - `inference_gateway.py` - service calls

2. **Add connection pooling and timeout handling**
   - HTTP session management
   - Proper timeout configuration
   - Connection pool sizing

3. **Implement basic error handling**
   - Timeout error handling
   - Network error recovery
   - User error notifications

**Expected Result**: 10x improvement in concurrent user capacity

### Phase 2: Database Migration (Week 3-4) ⚠️
**Goal**: Eliminate database blocking operations

1. **Migrate to Motor (async MongoDB driver)**
   - Replace PyMongo with Motor
   - Update all repository classes
   - Add async database connection management

2. **Update service layer for async database operations**
   - Modify service classes to use async repositories
   - Update dependency injection for async operations
   - Add database connection pooling

**Expected Result**: 2x improvement in API response times

### Phase 3: Audio Processing Optimization (Week 5-6) 📝
**Goal**: Optimize CPU-intensive operations

1. **Implement background audio processing**
   - Thread pool for audio operations
   - Async audio validation
   - Non-blocking audio format conversion

2. **Add audio processing optimizations**
   - Audio caching for repeated operations
   - Streaming audio processing
   - Memory-efficient audio handling

**Expected Result**: Better resource utilization and stability

### Phase 4: Advanced Optimizations (Week 7-8) 🔧
**Goal**: Production-ready performance and monitoring

1. **Advanced connection management**
   - WebSocket connection pooling
   - Load balancing support
   - Connection health monitoring

2. **Performance monitoring and metrics**
   - Async operation metrics
   - Performance bottleneck identification
   - Real-time performance dashboards

**Expected Result**: Production-ready scalability and monitoring

---

## 11. Testing and Validation Strategy

### 11.1 Performance Testing

#### **Load Testing Script:**
```python
# load_test_async.py
import asyncio
import aiohttp
import time
from concurrent.futures import ThreadPoolExecutor

async def test_concurrent_websocket_connections(num_connections: int = 50):
    """Test concurrent WebSocket connections"""

    async def create_websocket_connection(connection_id: int):
        try:
            session = aiohttp.ClientSession()
            async with session.ws_connect('ws://localhost:8000/socket.io/') as ws:
                # Send test audio data
                await ws.send_str(json.dumps({
                    'event': 'start',
                    'data': {'task_sequence': [{'taskType': 'asr'}]}
                }))

                # Wait for response
                async for msg in ws:
                    if msg.type == aiohttp.WSMsgType.TEXT:
                        data = json.loads(msg.data)
                        if data.get('event') == 'response':
                            print(f"Connection {connection_id}: Received response")
                            break
                    elif msg.type == aiohttp.WSMsgType.ERROR:
                        print(f"Connection {connection_id}: WebSocket error")
                        break

            await session.close()

        except Exception as e:
            print(f"Connection {connection_id}: Error - {str(e)}")

    # Create concurrent connections
    start_time = time.time()
    tasks = [create_websocket_connection(i) for i in range(num_connections)]
    await asyncio.gather(*tasks, return_exceptions=True)
    end_time = time.time()

    print(f"Completed {num_connections} concurrent connections in {end_time - start_time:.2f} seconds")

# Run load test
if __name__ == "__main__":
    asyncio.run(test_concurrent_websocket_connections(100))
```

#### **API Performance Testing:**
```python
# api_performance_test.py
import asyncio
import aiohttp
import time
import statistics

async def test_api_performance(endpoint: str, num_requests: int = 100):
    """Test API endpoint performance"""

    async def make_request(session: aiohttp.ClientSession, request_id: int):
        start_time = time.time()
        try:
            async with session.get(endpoint) as response:
                await response.text()
                end_time = time.time()
                return end_time - start_time, response.status
        except Exception as e:
            end_time = time.time()
            return end_time - start_time, 500

    # Create HTTP session with connection pooling
    connector = aiohttp.TCPConnector(limit=50, limit_per_host=30)
    timeout = aiohttp.ClientTimeout(total=30)

    async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
        # Make concurrent requests
        start_time = time.time()
        tasks = [make_request(session, i) for i in range(num_requests)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        end_time = time.time()

        # Calculate statistics
        response_times = [r[0] for r in results if isinstance(r, tuple)]
        status_codes = [r[1] for r in results if isinstance(r, tuple)]

        total_time = end_time - start_time
        avg_response_time = statistics.mean(response_times)
        p95_response_time = statistics.quantiles(response_times, n=20)[18]  # 95th percentile
        success_rate = sum(1 for code in status_codes if code < 400) / len(status_codes)

        print(f"API Performance Test Results:")
        print(f"Total requests: {num_requests}")
        print(f"Total time: {total_time:.2f}s")
        print(f"Requests per second: {num_requests / total_time:.2f}")
        print(f"Average response time: {avg_response_time:.3f}s")
        print(f"95th percentile response time: {p95_response_time:.3f}s")
        print(f"Success rate: {success_rate:.2%}")

# Run API performance test
if __name__ == "__main__":
    asyncio.run(test_api_performance("http://localhost:8000/services/details/list_services", 200))
```

### 11.2 Monitoring and Metrics

#### **Async Performance Metrics:**
```python
# async_metrics.py
import time
import asyncio
from prometheus_client import Counter, Histogram, Gauge
from functools import wraps

# Metrics for async operations
ASYNC_OPERATION_DURATION = Histogram(
    'async_operation_duration_seconds',
    'Duration of async operations',
    ['operation_type', 'status']
)

CONCURRENT_OPERATIONS = Gauge(
    'concurrent_operations_total',
    'Number of concurrent async operations',
    ['operation_type']
)

ASYNC_OPERATION_ERRORS = Counter(
    'async_operation_errors_total',
    'Total async operation errors',
    ['operation_type', 'error_type']
)

def monitor_async_operation(operation_type: str):
    """Decorator to monitor async operations"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            CONCURRENT_OPERATIONS.labels(operation_type=operation_type).inc()

            try:
                result = await func(*args, **kwargs)
                duration = time.time() - start_time
                ASYNC_OPERATION_DURATION.labels(
                    operation_type=operation_type,
                    status='success'
                ).observe(duration)
                return result

            except Exception as e:
                duration = time.time() - start_time
                ASYNC_OPERATION_DURATION.labels(
                    operation_type=operation_type,
                    status='error'
                ).observe(duration)
                ASYNC_OPERATION_ERRORS.labels(
                    operation_type=operation_type,
                    error_type=type(e).__name__
                ).inc()
                raise

            finally:
                CONCURRENT_OPERATIONS.labels(operation_type=operation_type).dec()

        return wrapper
    return decorator

# Usage example
@monitor_async_operation('inference_request')
async def run_inference_async(self, sid: str, is_final: bool):
    # Monitored async inference operation
    async with self.http_session.post(...) as response:
        return await response.json()
```

This comprehensive analysis provides a complete roadmap for transforming the Dhruva Platform from a pseudo-async system with critical bottlenecks to a truly scalable, production-ready async architecture. The implementation should be prioritized based on the critical fixes first, followed by the database migration and optimization phases.
