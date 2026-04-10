# AI Module (Module 5) - Code Recommendations & Best Practices

---

## 1. Current Implementation Highlights

### ✅ What's Done Well

#### 1.1 Proper Error Handling Pattern
```javascript
// ✅ GOOD: Distinguishes between different error types
export const streamRagAnswer = async ({ orgId, question, onToken }) => {
  try {
    // ... main logic ...
    return { ...payload, chunks_used: chunks.length };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;  // Re-throw known errors
    }
    
    throw new AppError('RAG query pipeline failed', 502, {
      reason: error.message,
    });
  }
};
```

#### 1.2 Graceful Degradation
```javascript
// ✅ GOOD: Cache failures don't block requests
export const getCachedRagResponse = async ({ orgId, question }) => {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }
  
  try {
    const value = await redis.get(buildQueryCacheKey({ orgId, question }));
    return value ? JSON.parse(value) : null;
  } catch {
    return null;  // Fail gracefully
  }
};
```

#### 1.3 Multi-Tenant Data Isolation
```javascript
// ✅ GOOD: org_id in all queries
export const assertOrgMembership = async ({ userId, orgId }) => {
  const membership = await Membership.findOne({
    user: userId,
    org_id: orgId,  // ← ISOLATION
    status: 'active',
  }).lean();
  
  if (!membership) {
    throw new AppError('Organisation membership required', 403);
  }
};

// ✅ GOOD: Vector search scoped by org_id
filter: {
  org_id: orgId,  // ← ISOLATION
}
```

#### 1.4 Proper Streaming Implementation
```javascript
// ✅ GOOD: Non-blocking token streaming
for await (const part of stream) {
  const token = part?.choices?.[0]?.delta?.content;
  if (!token) {
    continue;
  }
  
  answer += token;
  onToken(token);  // Stream immediately
}
```

---

## 2. Recommended Enhancements

### 2.1 Add Request Context Logging

**Current Issue:** Difficult to trace requests across logs

**Recommendation:**
```javascript
// Add to ai.controller.js
import { v4 as uuidv4 } from 'uuid';

export const streamRagQuery = async (req, res, next) => {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  // Add request context to logger
  req.log = logger.child({ requestId, orgId: req.body.org_id });
  
  req.log.info('RAG query started', {
    question: req.body.question.substring(0, 50),
    cached: false,
  });
  
  try {
    // ... existing logic ...
  } catch (error) {
    req.log.error('RAG query failed', {
      error: error.message,
      durationMs: Date.now() - startTime,
    });
  }
};
```

**Benefits:**
- Correlate logs across services
- Track request lifecycle
- Debug concurrent requests

---

### 2.2 Add Request Telemetry/Metrics

**Current Issue:** No performance visibility

**Recommendation:**
```javascript
// Create: src/ai/middleware/telemetry.middleware.js
export const recordTelemetry = (res, metrics) => {
  const payload = {
    timestamp: new Date().toISOString(),
    latencyMs: metrics.latencyMs,
    cached: metrics.cached,
    tokensGenerated: metrics.tokenCount,
    embeddingTimeMs: metrics.embeddingTime,
    vectorSearchTimeMs: metrics.vectorSearchTime,
    graphContextTimeMs: metrics.graphContextTime,
    llmTimeMs: metrics.llmTime,
    cacheWriteTimeMs: metrics.cacheWriteTime,
    organization_id: metrics.orgId,
  };
  
  // Send to analytics service
  // Example: StatsD, DataDog, New Relic
  metrics.emit('ai.query.completed', payload);
};
```

**Usage in controller:**
```javascript
const metrics = {
  latencyMs: Date.now() - startedAt,
  cached: false,
  tokenCount: tokenEvents,
  embeddingTime: embeddingEndTime - startedAt,
  vectorSearchTime: vectorSearchEndTime - embeddingEndTime,
  // ... etc
};

recordTelemetry(res, metrics);
```

---

### 2.3 Add Response Timeout Protection

**Current Issue:** Long-running requests can exhaust connections

**Recommendation:**
```javascript
// Add to ai.controller.js
const RESPONSE_TIMEOUT_MS = 30000;  // 30 seconds

export const streamRagQuery = async (req, res, next) => {
  const responseTimeout = setTimeout(() => {
    if (!res.writableEnded) {
      writeSseEvent(res, 'error', {
        message: 'Response timeout exceeded',
        details: 'The query took too long to complete',
      });
      res.end();
    }
  }, RESPONSE_TIMEOUT_MS);
  
  res.on('finish', () => {
    clearTimeout(responseTimeout);
  });
  
  try {
    // ... existing logic ...
  } finally {
    clearTimeout(responseTimeout);
  }
};
```

---

### 2.4 Add Batch Error Recovery

**Current Issue:** Partial graph context failures logged but not visible to client

**Recommendation:**
```javascript
// Update: src/ai/services/graphContext.service.js
export const fetchGraphContextForChunks = async ({ 
  orgId, 
  chunks, 
  maxNodes = 3, 
  maxHops = 2 
}) => {
  const nodeIds = [...new Set(chunks.map(chunk => chunk.node_id))].slice(0, maxNodes);
  
  if (nodeIds.length === 0) {
    return [];
  }
  
  const responses = await Promise.allSettled(
    nodeIds.map(nodeId =>
      graphClient.get(`/causal-chain/${encodeURIComponent(nodeId)}`, {
        params: { max_hops: maxHops, org_id: orgId },
        timeout: 5000,  // Add explicit timeout
      })
    )
  );
  
  const context = [];
  const failures = [];  // Track failures
  
  responses.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      context.push(toGraphSummary(result.value?.data?.data));
    } else {
      failures.push({
        nodeId: nodeIds[index],
        reason: result.reason?.message || 'unknown',
      });
      
      logger.warn(
        `Graph context fetch failed for node ${nodeIds[index]}:`,
        result.reason?.message
      );
    }
  });
  
  // Return context with metadata about failures
  return {
    contexts: context,
    failures: failures,  // Include for debugging
    partialSuccess: failures.length < nodeIds.length,
  };
};
```

---

### 2.5 Implement Circuit Breaker for External Services

**Current Issue:** Cascading failures if external services fail

**Recommendation:**
```javascript
// Create: src/ai/utils/circuitBreaker.js
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000;
    this.failures = 0;
    this.state = 'CLOSED';  // CLOSED, OPEN, HALF_OPEN
    this.lastFailureTime = null;
  }
  
  async call(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  onFailure() {
    this.failures += 1;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
}

export const graphContextCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 30000,
});

// Usage in graphContext.service.js
export const fetchGraphContextForChunks = async (...) => {
  return graphContextCircuitBreaker.call(async () => {
    // ... existing logic ...
  });
};
```

---

### 2.6 Add Input Sanitization

**Current Issue:** XSS/injection in prompts if data is later used in web context

**Recommendation:**
```javascript
// Add to src/ai/utils/sanitizers.js
export const sanitizeQuestion = (question) => {
  // Remove control characters
  return question
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim();
};

export const sanitizeChunkText = (text) => {
  // Remove null bytes and control characters
  return String(text)
    .replace(/[\x00-\x1F\x7F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// Usage in ai.controller.js
const { org_id: orgId, question: rawQuestion } = req.body;
const question = sanitizeQuestion(rawQuestion);
```

---

### 2.7 Implement Rate Limiting Per Organization

**Current Issue:** One org could abuse resources

**Recommendation:**
```javascript
// Create: src/ai/middleware/rateLimiter.middleware.js
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

export const createAIRateLimiter = (redisClient) => {
  return rateLimit({
    store: new RedisStore({
      client: redisClient,
      prefix: 'ai:rate-limit:',
    }),
    keyGenerator: (req) => {
      // Rate limit by organization
      return `${req.body.org_id}`;
    },
    windowMs: 60 * 1000,  // 1 minute
    max: 30,              // 30 requests per minute per org
    message: 'Too many AI queries from this organization',
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Usage in routes
import { createAIRateLimiter } from '../middleware/rateLimiter.middleware.js';

const rateLimiter = createAIRateLimiter(getRedisClient());
aiRouter.post('/query/stream', 
  requireAuth, 
  rateLimiter,  // ← Add here
  validate(streamRagQuerySchema), 
  streamRagQuery
);
```

---

### 2.8 Add Cost Tracking

**Current Issue:** No visibility into OpenAI spending

**Recommendation:**
```javascript
// Create: src/ai/utils/costCalculator.js
const TOKEN_COSTS = {
  'text-embedding-3-small': { input: 0.02 / 1_000_000 },
  'gpt-4o': {
    input: 0.005 / 1000,
    output: 0.015 / 1000,
  },
};

export const calculateCost = ({ 
  embeddingModel, 
  completionModel, 
  inputTokens, 
  outputTokens,
  embeddingInputTokens,
}) => {
  const embeddingCost = embeddingInputTokens * TOKEN_COSTS[embeddingModel].input;
  const completionCost = 
    (inputTokens * TOKEN_COSTS[completionModel].input) +
    (outputTokens * TOKEN_COSTS[completionModel].output);
  
  return {
    embeddingCost,
    completionCost,
    totalCost: embeddingCost + completionCost,
  };
};

// Track in controller
const cost = calculateCost({
  embeddingModel: env.aiEmbeddingModel,
  completionModel: env.aiCompletionModel,
  embeddingInputTokens: questionLength / 4,  // rough estimate
  inputTokens: promptTokens,
  outputTokens: responseTokens,
});

writeSseEvent(res, 'meta', {
  // ... existing data ...
  estimatedCostUSD: cost.totalCost,
});
```

---

## 3. Testing Recommendations

### 3.1 Unit Tests for Prompt Builder

```javascript
// src/ai/prompts/__tests__/queryPrompt.builder.test.js
import { buildRagPrompt, toCitations } from '../queryPrompt.builder.js';

describe('queryPrompt.builder', () => {
  describe('toCitations', () => {
    it('should generate citations with sequential IDs', () => {
      const chunks = [
        { source: 'github', node_id: 'n1', score: 0.95, chunk_text: 'text1' },
        { source: 'jira', node_id: 'n2', score: 0.87, chunk_text: 'text2' },
      ];
      
      const citations = toCitations(chunks);
      
      expect(citations).toHaveLength(2);
      expect(citations[0].id).toBe('C1');
      expect(citations[1].id).toBe('C2');
    });
    
    it('should handle missing chunk_text gracefully', () => {
      const chunks = [
        { source: 'github', chunk_text: '' },
      ];
      
      const citations = toCitations(chunks);
      expect(citations[0].snippet).toBe('(empty chunk)');
    });
    
    it('should clip long snippets', () => {
      const longText = 'a'.repeat(300);
      const chunks = [
        { source: 'github', chunk_text: longText },
      ];
      
      const citations = toCitations(chunks);
      expect(citations[0].snippet.length).toBeLessThanOrEqual(260);
      expect(citations[0].snippet).toMatch(/\.\.\.$/);
    });
  });
  
  describe('buildRagPrompt', () => {
    it('should include all sections in user prompt', () => {
      const prompt = buildRagPrompt({
        question: 'What failed?',
        chunks: [
          { node_id: 'n1', chunk_text: 'Test chunk', source: 'test' }
        ],
        graphContext: [],
      });
      
      expect(prompt.userPrompt).toContain('Question: What failed?');
      expect(prompt.userPrompt).toContain('Retrieved Chunks:');
      expect(prompt.userPrompt).toContain('Graph Causal Context:');
      expect(prompt.userPrompt).toContain('Response format:');
    });
  });
});
```

### 3.2 Integration Tests

```javascript
// src/ai/__tests__/ai.integration.test.js
import request from 'supertest';
import app from '../../app.js';

describe('AI Module Integration', () => {
  it('should handle complete RAG flow', async () => {
    const response = await request(app)
      .post('/api/v1/ai/query/stream')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        org_id: 'test-org',
        question: 'What caused the outage?',
      });
    
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/event-stream');
    // Parse SSE events from response body
  });
});
```

---

## 4. Performance Optimization Tips

### 4.1 Embedding Response Caching
```javascript
// Cache embeddings for same question in same session
const embeddingCache = new Map();

export const createQueryEmbedding = async (question) => {
  const normalizedQ = normalizeQuestion(question);
  
  // Check embedding cache
  if (embeddingCache.has(normalizedQ)) {
    return embeddingCache.get(normalizedQ);
  }
  
  const embedding = await openAI.embeddings.create({
    model: env.aiEmbeddingModel,
    input: question,
  });
  
  // Cache for session (5 min)
  embeddingCache.set(normalizedQ, embedding);
  setTimeout(() => embeddingCache.delete(normalizedQ), 5 * 60 * 1000);
  
  return embedding;
};
```

### 4.2 Parallel Execution Pattern
```javascript
// Execute multiple operations in parallel
const [embedding, cachedResponse] = await Promise.all([
  createQueryEmbedding(question),
  getCachedRagResponse({ orgId, question }),
]);

if (cachedResponse) {
  // Short-circuit if cached
  return cachedResponse;
}
```

---

## 5. Security Hardening

### 5.1 Rate Limiting by User + Organization
```javascript
const limiter = rateLimit({
  keyGenerator: (req) => `${req.auth.sub}:${req.body.org_id}`,
  windowMs: 60 * 1000,
  max: 10,  // More restrictive per user
});
```

### 5.2 Query Complexity Validation
```javascript
export const validateQueryComplexity = (question) => {
  const wordCount = question.split(/\s+/).length;
  const charCount = question.length;
  
  if (wordCount > 1000) {
    throw new AppError('Question too complex (max 1000 words)', 400);
  }
  
  if (charCount > 4000) {
    throw new AppError('Question too long (max 4000 chars)', 400);
  }
  
  // Check for SQL injection patterns
  if (/['";\\]/g.test(question)) {
    logger.warn('Suspicious question pattern detected', { question });
  }
};
```

---

## 6. Monitoring Checklist

```javascript
// Metrics to track
✓ Response latency (p50, p95, p99)
✓ Cache hit rate
✓ Error rate by type
✓ Token consumption
✓ Organization quota usage
✓ OpenAI API response times
✓ MongoDB query times
✓ Redis connection health
✓ Active streaming connections
✓ Cost per query
```

---

## Summary

| Category | Priority | Status | Effort |
|----------|----------|--------|--------|
| Logging Context | Medium | 🔴 Not Done | 1 hour |
| Telemetry | High | 🔴 Not Done | 2 hours |
| Response Timeout | High | 🔴 Not Done | 30 min |
| Circuit Breaker | Medium | 🔴 Not Done | 2 hours |
| Rate Limiting | High | 🔴 Not Done | 1 hour |
| Testing | High | 🔴 Basic Only | 2-3 days |
| Cost Tracking | Low | 🔴 Not Done | 1 hour |
| Sanitization | Low | 🟢 Partial | 30 min |

**Total Estimated Effort:** 1-2 weeks for full implementation

**Recommended Next Steps:**
1. Add response timeout (30 min)
2. Implement rate limiting (1 hour)
3. Add logging context (1 hour)
4. Write unit tests (1 day)
5. Set up telemetry (2 hours)


