# Dhruva Platform LLM Performance Benchmarking Strategy

## Executive Summary

This comprehensive benchmarking strategy validates the performance bottlenecks identified in our server architecture analysis and establishes baseline metrics for LLM workload integration. The strategy leverages existing benchmarking infrastructure while introducing LLM-specific testing scenarios to assess system readiness for high-latency, memory-intensive workloads.

**Key Objectives**: Validate timeout constraints, memory limitations, concurrency bottlenecks, and database performance under LLM-like conditions without requiring actual LLM integration.

---

## 🎯 Primary Objectives

### 1. **Baseline Performance Establishment**
- **Current State Assessment**: Benchmark existing task types (translation, ASR, TTS) under normal and stress conditions
- **Resource Utilization Mapping**: Establish CPU, memory, and I/O baselines for comparison
- **Throughput Characterization**: Determine current requests/second capacity by task type
- **Latency Profiling**: Document P50, P95, P99 response times for existing workloads

### 2. **LLM Workload Simulation**
- **High-Latency Testing**: Simulate 30-180 second response times using mock LLM services
- **Large Payload Testing**: Test 10-50MB request/response handling capabilities
- **Token-Based Metering**: Validate metering system with token-like calculations
- **Multi-Turn Conversations**: Test session management and context handling

### 3. **Bottleneck Validation**
- **Timeout Cascade Testing**: Verify identified timeout limitations under load
- **Memory Exhaustion Testing**: Validate memory constraints with large payloads
- **Worker Starvation Testing**: Confirm concurrency limitations with long-running requests
- **Database Blocking Testing**: Measure impact of synchronous operations under load

### 4. **Scalability Assessment**
- **Breaking Point Analysis**: Determine system failure thresholds
- **Resource Scaling Requirements**: Quantify infrastructure needs for LLM workloads
- **Performance Degradation Curves**: Map performance vs. load relationships
- **Recovery Behavior**: Test system recovery after overload conditions

---

## 🏗️ Testing Infrastructure Architecture

### **Existing Infrastructure Utilization**

#### 1. **Mock LLM Simulator Enhancement**
**Location**: `benchmarking/mock-services/llm-simulator/`
**Current Capabilities**:
- OpenAI and Anthropic API compatibility
- Configurable response delays and payload sizes
- Error injection and streaming simulation
- Token usage calculation

**Enhancements Required**:
```python
# Enhanced model configurations for testing
LLM_TEST_MODELS = {
    "gpt-4-stress": {
        "latency_range": (30, 180),  # 30-180 second responses
        "tokens_per_second": 10,     # Slow token generation
        "max_tokens": 8192,          # Large context windows
        "payload_size_range": (10, 50),  # 10-50MB responses
        "error_rate": 0.05           # 5% error injection
    },
    "claude-3-memory": {
        "latency_range": (45, 120),
        "tokens_per_second": 15,
        "max_tokens": 4096,
        "payload_size_range": (20, 40),
        "error_rate": 0.02
    },
    "local-llm-timeout": {
        "latency_range": (60, 300),  # Extreme timeout testing
        "tokens_per_second": 5,
        "max_tokens": 2048,
        "payload_size_range": (5, 15),
        "error_rate": 0.10
    }
}
```

#### 2. **Load Testing Framework**
**Tools Available**:
- **K6**: `benchmarking/load-tests/k6/`
- **Locust**: `benchmarking/load-tests/locust/`
- **Custom Node.js**: `client/scripts/load-test.js`

**Framework Selection**:
- **K6**: Primary tool for HTTP load testing and performance metrics
- **Locust**: Secondary tool for complex user behavior simulation
- **Custom Scripts**: Specialized LLM workflow testing

#### 3. **Monitoring Stack**
**Components**:
- **Prometheus**: Metrics collection and alerting
- **Grafana**: Real-time dashboard visualization
- **Custom Metrics**: Application-specific performance tracking
- **Container Monitoring**: Docker resource utilization

---

## 📊 Testing Scenarios & Methodologies

### **Phase 1: Baseline Performance Testing (Week 1)**

#### Scenario 1.1: Current Workload Characterization
**Objective**: Establish performance baselines for existing task types
**Duration**: 2 hours per task type
**Configuration**:
```yaml
baseline_test:
  task_types: ["translation", "asr", "tts", "ner"]
  concurrent_users: [1, 5, 10, 20, 50]
  duration_minutes: 30
  ramp_up_time: 5
  request_patterns:
    - constant_rate: 10 rps
    - burst_pattern: 50 rps for 30s every 5min
    - gradual_increase: 1-100 rps over 20min
```

**Key Metrics**:
- Response time percentiles (P50, P95, P99)
- Throughput (requests/second)
- Error rate percentage
- Resource utilization (CPU, memory, disk I/O)
- Database query performance
- Queue depth and processing time

#### Scenario 1.2: Resource Utilization Mapping
**Objective**: Document resource consumption patterns
**Methodology**:
```bash
# Resource monitoring during baseline tests
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"

# Database performance metrics
docker exec dhruva-platform-app-db mongostat --host localhost:27017
docker exec dhruva-platform-timescaledb pg_stat_activity

# Application metrics collection
curl -s http://localhost:9090/api/v1/query?query=dhruva_requests_total
curl -s http://localhost:9090/api/v1/query?query=dhruva_request_duration_seconds
```

### **Phase 2: LLM Workload Simulation (Week 2)**

#### Scenario 2.1: High-Latency Request Testing
**Objective**: Validate system behavior with LLM-like response times
**Configuration**:
```yaml
high_latency_test:
  mock_llm_endpoints:
    - model: "gpt-4-stress"
      response_time: 30-180s
      concurrent_requests: [1, 5, 10, 15, 20]
      test_duration: 60min
  
  test_patterns:
    - single_long_request: 180s response time
    - multiple_medium_requests: 5x 60s concurrent
    - mixed_workload: 70% normal + 30% LLM requests
```

**Validation Criteria**:
- No timeout failures for requests < 180s
- Worker threads remain available for new requests
- Memory usage remains stable during long requests
- Database connections don't leak or timeout

#### Scenario 2.2: Large Payload Handling
**Objective**: Test memory management with LLM-sized payloads
**Configuration**:
```yaml
large_payload_test:
  request_sizes: [1MB, 5MB, 10MB, 25MB, 50MB]
  response_sizes: [1MB, 5MB, 10MB, 25MB, 50MB]
  concurrent_requests: [1, 3, 5, 8, 10]
  
  test_scenarios:
    - large_input_small_output: 50MB → 1MB
    - small_input_large_output: 1MB → 50MB
    - large_bidirectional: 25MB → 25MB
    - sustained_large_load: 10MB requests for 30min
```

**Memory Monitoring**:
```bash
# Container memory tracking
docker exec dhruva-platform-server python3 -c "
import psutil
import gc
print(f'Memory: {psutil.virtual_memory().percent}%')
print(f'Garbage: {len(gc.garbage)} objects')
"

# System-level memory monitoring
free -h && echo "---" && cat /proc/meminfo | grep -E "(MemTotal|MemFree|MemAvailable|Buffers|Cached)"
```

#### Scenario 2.3: Token-Based Metering Simulation
**Objective**: Validate metering system with LLM-like calculations
**Configuration**:
```yaml
token_metering_test:
  simulated_requests:
    - input_tokens: [100, 1000, 4000, 8000]
    - output_tokens: [50, 500, 2000, 4000]
    - models: ["gpt-4", "claude-3", "local-llm"]
  
  pricing_scenarios:
    - high_cost_model: $0.06/1K tokens
    - medium_cost_model: $0.03/1K tokens
    - low_cost_model: $0.001/1K tokens
```

### **Phase 3: Bottleneck Validation Testing (Week 3)**

#### Scenario 3.1: Timeout Cascade Testing
**Objective**: Confirm timeout-related bottlenecks
**Test Design**:
```yaml
timeout_cascade_test:
  stages:
    - stage1: 5 requests @ 30s response time
    - stage2: 10 requests @ 60s response time
    - stage3: 15 requests @ 120s response time
    - stage4: 20 requests @ 180s response time
  
  failure_conditions:
    - request_timeout: >180s
    - worker_exhaustion: all workers busy
    - cascade_failure: subsequent requests fail
```

**Expected Results**:
- Requests >180s should timeout (validating bottleneck)
- Worker pool exhaustion at ~10-15 concurrent long requests
- New requests should queue or fail gracefully

#### Scenario 3.2: Memory Exhaustion Testing
**Objective**: Validate memory constraint bottlenecks
**Test Design**:
```yaml
memory_exhaustion_test:
  progressive_load:
    - phase1: 10x 10MB requests
    - phase2: 20x 15MB requests  
    - phase3: 30x 20MB requests
    - phase4: 40x 25MB requests (expect failure)
  
  monitoring:
    - container_memory_limit: 4GB
    - expected_failure_point: ~3.5GB usage
    - recovery_behavior: after memory pressure
```

#### Scenario 3.3: Database Blocking Testing
**Objective**: Measure synchronous DB operation impact
**Test Design**:
```yaml
database_blocking_test:
  concurrent_scenarios:
    - api_key_validation: 50 concurrent lookups
    - session_management: 30 concurrent session queries
    - service_discovery: 40 concurrent service lookups
    - mixed_db_operations: All above simultaneously
  
  measurement_points:
    - db_query_duration: Individual query times
    - request_queue_depth: Pending request count
    - overall_response_time: End-to-end latency
```

### **Phase 4: Scalability Assessment (Week 4)**

#### Scenario 4.1: Breaking Point Analysis
**Objective**: Determine system failure thresholds
**Methodology**:
```yaml
breaking_point_test:
  load_progression:
    - start: 10 concurrent LLM requests
    - increment: +5 requests every 5 minutes
    - continue: until system failure
    - max_test_duration: 2 hours
  
  failure_indicators:
    - response_time_p95: >300s
    - error_rate: >10%
    - memory_usage: >90%
    - cpu_usage: >95%
    - queue_depth: >1000 messages
```

#### Scenario 4.2: Recovery Behavior Testing
**Objective**: Test system recovery after overload
**Test Design**:
```yaml
recovery_test:
  overload_phase:
    - duration: 15 minutes
    - load: 150% of breaking point
    - expected: system degradation/failure
  
  recovery_phase:
    - load_reduction: Drop to 50% normal load
    - monitoring_duration: 30 minutes
    - recovery_metrics:
      - time_to_normal_response: <5 minutes
      - error_rate_normalization: <2 minutes
      - queue_drain_time: <10 minutes
```

---

## 🔧 Testing Tools & Frameworks

### **Primary Testing Framework: K6**

#### LLM Load Testing Script
```javascript
// k6-llm-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const llmResponseTime = new Trend('llm_response_time');
const llmErrorRate = new Rate('llm_error_rate');

export let options = {
  stages: [
    { duration: '5m', target: 5 },   // Ramp up
    { duration: '20m', target: 10 }, // Sustained load
    { duration: '10m', target: 20 }, // Peak load
    { duration: '5m', target: 0 },   // Ramp down
  ],
  thresholds: {
    'llm_response_time': ['p(95)<180000'], // 95% under 3 minutes
    'llm_error_rate': ['rate<0.1'],        // Error rate under 10%
    'http_req_duration': ['p(99)<300000'], // 99% under 5 minutes
  },
};

export default function() {
  const payload = {
    model: 'gpt-4-stress',
    messages: [
      { role: 'user', content: generateLargePrompt() },
    ],
    max_tokens: 2000,
    simulate_delay: Math.random() * 150 + 30, // 30-180s
    response_size_kb: Math.floor(Math.random() * 40) + 10, // 10-50KB
  };

  const response = http.post(
    'http://localhost:8000/services/inference/llm',
    JSON.stringify(payload),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'test-api-key',
      },
      timeout: '300s', // 5 minute timeout
    }
  );

  // Validate response
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 180s': (r) => r.timings.duration < 180000,
    'has valid response': (r) => r.json('choices') !== undefined,
  });

  // Record metrics
  llmResponseTime.add(response.timings.duration);
  llmErrorRate.add(!success);

  sleep(Math.random() * 10 + 5); // 5-15s between requests
}

function generateLargePrompt() {
  // Generate 1-10KB prompt to simulate real LLM usage
  const basePrompt = "Analyze this complex scenario: ";
  const padding = "x".repeat(Math.floor(Math.random() * 10000) + 1000);
  return basePrompt + padding;
}
```

### **Secondary Framework: Locust**

#### Complex User Behavior Simulation
```python
# locust-llm-behavior.py
from locust import HttpUser, task, between
import json
import random
import time

class LLMUser(HttpUser):
    wait_time = between(10, 30)  # 10-30s between requests
    
    def on_start(self):
        """Initialize user session"""
        self.api_key = "test-api-key"
        self.conversation_history = []
    
    @task(3)
    def single_llm_request(self):
        """Single LLM inference request"""
        payload = {
            "model": random.choice(["gpt-4-stress", "claude-3-memory"]),
            "messages": [{"role": "user", "content": self.generate_prompt()}],
            "max_tokens": random.randint(500, 2000),
            "simulate_delay": random.uniform(30, 180),
        }
        
        with self.client.post(
            "/services/inference/llm",
            json=payload,
            headers={"Authorization": self.api_key},
            timeout=300,
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Status: {response.status_code}")
    
    @task(1)
    def multi_turn_conversation(self):
        """Multi-turn conversation simulation"""
        conversation = [
            {"role": "user", "content": "Start a complex analysis"},
            {"role": "assistant", "content": "I'll help with that analysis"},
            {"role": "user", "content": self.generate_followup()},
        ]
        
        payload = {
            "model": "gpt-4-stress",
            "messages": conversation,
            "max_tokens": 1500,
            "simulate_delay": random.uniform(60, 120),
        }
        
        self.client.post(
            "/services/inference/llm",
            json=payload,
            headers={"Authorization": self.api_key},
            timeout=300
        )
    
    def generate_prompt(self):
        """Generate realistic LLM prompts"""
        prompts = [
            "Analyze the following complex business scenario...",
            "Write a detailed technical documentation for...",
            "Create a comprehensive analysis of...",
            "Develop a strategic plan for...",
        ]
        base = random.choice(prompts)
        # Add padding to simulate real usage
        padding = "Additional context: " + "x" * random.randint(1000, 5000)
        return base + padding
    
    def generate_followup(self):
        """Generate follow-up questions"""
        return "Can you elaborate on that analysis with more details?"
```

### **Monitoring & Metrics Collection**

#### Enhanced Prometheus Queries
```promql
# LLM-specific performance metrics

# Response time distribution for LLM requests
histogram_quantile(0.95, 
  rate(dhruva_request_duration_seconds_bucket{path="/services/inference/llm"}[5m])
)

# LLM request rate vs other services
rate(dhruva_requests_total{path="/services/inference/llm"}[5m]) /
rate(dhruva_requests_total[5m])

# Memory usage during LLM requests
container_memory_usage_bytes{name="dhruva-platform-server"} / 
container_spec_memory_limit_bytes{name="dhruva-platform-server"}

# Worker thread utilization
dhruva_active_requests / dhruva_max_workers

# Database query performance under load
rate(mongodb_op_counters_query[5m])
mongodb_connections{state="current"}

# Queue depth during LLM processing
rabbitmq_queue_messages{queue="data-log"}
celery_task_queue_length{queue="metrics-log"}
```

#### Custom Grafana Dashboard
```json
{
  "dashboard": {
    "title": "LLM Performance Benchmarking",
    "panels": [
      {
        "title": "LLM Response Time Distribution",
        "type": "histogram",
        "targets": [
          {
            "expr": "histogram_quantile(0.50, dhruva_llm_response_duration_seconds_bucket)",
            "legendFormat": "P50"
          },
          {
            "expr": "histogram_quantile(0.95, dhruva_llm_response_duration_seconds_bucket)", 
            "legendFormat": "P95"
          },
          {
            "expr": "histogram_quantile(0.99, dhruva_llm_response_duration_seconds_bucket)",
            "legendFormat": "P99"
          }
        ]
      },
      {
        "title": "Memory Usage vs Request Size",
        "type": "scatter",
        "targets": [
          {
            "expr": "container_memory_usage_bytes{name=\"dhruva-platform-server\"}",
            "legendFormat": "Memory Usage"
          }
        ]
      },
      {
        "title": "Concurrent Request Handling",
        "type": "graph",
        "targets": [
          {
            "expr": "dhruva_active_llm_requests",
            "legendFormat": "Active LLM Requests"
          },
          {
            "expr": "dhruva_queued_requests", 
            "legendFormat": "Queued Requests"
          }
        ]
      }
    ]
  }
}
```

---

## 📈 Success Criteria & Validation

### **Performance Benchmarks**

#### Baseline Requirements
```yaml
baseline_performance:
  existing_services:
    translation:
      p95_response_time: <5s
      throughput: >50 rps
      error_rate: <1%
    
    asr:
      p95_response_time: <10s
      throughput: >20 rps
      error_rate: <2%
    
    tts:
      p95_response_time: <8s
      throughput: >30 rps
      error_rate: <1%

llm_simulation_targets:
  response_times:
    p50: <60s
    p95: <180s
    p99: <300s
  
  throughput:
    concurrent_requests: >10
    sustained_load: >5 rps
  
  reliability:
    error_rate: <5%
    timeout_rate: <2%
    recovery_time: <5min
```

#### Resource Utilization Limits
```yaml
resource_constraints:
  memory:
    normal_operation: <70%
    peak_load: <85%
    failure_threshold: >95%
  
  cpu:
    normal_operation: <60%
    peak_load: <80%
    failure_threshold: >90%
  
  database:
    connection_pool: <80% utilization
    query_time_p95: <500ms
    lock_wait_time: <100ms
```

### **Bottleneck Validation Criteria**

#### Confirmed Bottlenecks
```yaml
expected_bottlenecks:
  timeout_cascade:
    trigger_point: >15 concurrent 180s requests
    failure_mode: "Request timeout errors"
    validation: "Error rate >50% for new requests"
  
  memory_exhaustion:
    trigger_point: >30 concurrent 25MB requests
    failure_mode: "OOM errors or container restart"
    validation: "Memory usage >90%"
  
  worker_starvation:
    trigger_point: >20 concurrent long requests
    failure_mode: "Request queuing delays"
    validation: "Response time >300s for simple requests"
  
  database_blocking:
    trigger_point: >50 concurrent DB operations
    failure_mode: "Query timeout errors"
    validation: "DB query time >5s"
```

---

## 🚀 Implementation Timeline

### **Week 1: Baseline Establishment**
- **Day 1-2**: Infrastructure setup and tool configuration
- **Day 3-4**: Current workload characterization testing
- **Day 5-7**: Resource utilization mapping and baseline documentation

### **Week 2: LLM Simulation Testing**
- **Day 1-2**: High-latency request testing
- **Day 3-4**: Large payload handling validation
- **Day 5-7**: Token-based metering simulation

### **Week 3: Bottleneck Validation**
- **Day 1-2**: Timeout cascade testing
- **Day 3-4**: Memory exhaustion validation
- **Day 5-7**: Database blocking and concurrency testing

### **Week 4: Scalability Assessment**
- **Day 1-3**: Breaking point analysis
- **Day 4-5**: Recovery behavior testing
- **Day 6-7**: Final analysis and reporting

---

## 📊 Expected Outcomes & Deliverables

### **Performance Reports**
1. **Baseline Performance Report**: Current system capabilities and resource utilization
2. **LLM Readiness Assessment**: System behavior under LLM-like workloads
3. **Bottleneck Validation Report**: Confirmation of identified performance constraints
4. **Scalability Analysis**: Resource requirements and scaling recommendations

### **Optimization Recommendations**
1. **Immediate Fixes**: Critical bottlenecks requiring immediate attention
2. **Performance Tuning**: Configuration optimizations for LLM workloads
3. **Infrastructure Scaling**: Resource allocation recommendations
4. **Architecture Improvements**: Long-term architectural enhancements

### **Implementation Roadmap**
1. **Priority Matrix**: Ranked list of performance improvements
2. **Resource Planning**: Infrastructure and development resource requirements
3. **Risk Assessment**: Potential issues and mitigation strategies
4. **Success Metrics**: KPIs for measuring LLM integration success

This comprehensive benchmarking strategy provides a systematic approach to validating the Dhruva Platform's readiness for LLM integration while identifying specific performance optimizations required for successful deployment.
