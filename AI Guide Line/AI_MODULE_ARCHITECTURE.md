# AI Module (Module 5) - Architecture & Flow Diagrams

---

## 1. Request Processing Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Client Request: POST /api/v1/ai/query/stream                           │
│ Body: { org_id: "org_123", question: "Why did deployment fail?" }      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │  Middleware: requireAuth      │
                    │  Validates JWT token          │
                    │  Sets req.auth.sub (user_id) │
                    └───────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────────┐
                    │  Middleware: validate(schema)     │
                    │  Zod validation                   │
                    │  org_id: 1-120 chars             │
                    │  question: 3-4000 chars          │
                    └───────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────────────┐
                    │  Controller: streamRagQuery           │
                    │  Initialize SSE response headers      │
                    └───────────────────────────────────────┘
                                    │
                    ┌───────────────┴────────────────┐
                    │                                │
                    ▼                                ▼
        ┌──────────────────────┐      ┌─────────────────────┐
        │ Service: assertOrg   │      │ Service: getCached  │
        │ Membership           │      │ RagResponse         │
        │                      │      │ (Redis)             │
        │ SELECT org member    │      │                     │
        │ WHERE user_id=?      │      │ IF cached:          │
        │ AND org_id=?         │      │   Return immediately│
        │                      │      │                     │
        │ If not found:        │      │ ELSE:               │
        │   Throw 403          │      │   Continue pipeline │
        └──────────────────────┘      └─────────────────────┘
                    │                          │
                    └──────────────┬───────────┘
                                   ▼
                    ┌──────────────────────────────┐
                    │ Service: streamRagAnswer     │
                    │ Core RAG Pipeline            │
                    └──────────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
         ┌────────────────┐ ┌─────────────┐ ┌──────────────┐
         │ 1. Embedding   │ │ 2. Vector   │ │ 3. Graph     │
         │                │ │ Search      │ │ Context      │
         │ OpenAI         │ │             │ │              │
         │ text-emb-3-sm  │ │ MongoDB     │ │ External API │
         │                │ │ Atlas       │ │ Call         │
         │ Input:         │ │             │ │              │
         │ question       │ │ Filter:     │ │ Promise      │
         │                │ │ org_id      │ │ .allSettled  │
         │ Output:        │ │ Top K: 10   │ │              │
         │ [0.1, ...]     │ │             │ │ Non-blocking │
         │ 1536 dims      │ │ Output:     │ │              │
         └────────────────┘ │ 10 chunks   │ │ Output:      │
                            │ + scores    │ │ Causal       │
                            │             │ │ chains       │
                            └─────────────┘ └──────────────┘
                                   │              │
                                   └──────┬───────┘
                                          ▼
                        ┌────────────────────────────┐
                        │ 4. Build Prompt            │
                        │ queryPrompt.builder        │
                        │                            │
                        │ systemPrompt:              │
                        │ "You are ContextOS AI..."  │
                        │                            │
                        │ userPrompt:                │
                        │ "Question: ..."            │
                        │ "Retrieved Chunks: ..."    │
                        │ "Graph Context: ..."       │
                        │ "Response Format: ..."     │
                        │                            │
                        │ citations:                 │
                        │ [{id: C1, source, score}]  │
                        └────────────────────────────┘
                                   │
                                   ▼
                        ┌────────────────────────┐
                        │ 5. Stream GPT-4o       │
                        │ openai.chat.completions│
                        │ .create({ stream: true│
                        │                        │
                        │ For each token:        │
                        │   onToken(token)       │
                        │   SSE write event      │
                        │                        │
                        │ Accumulate answer      │
                        └────────────────────────┘
                                   │
                                   ▼
                        ┌────────────────────────┐
                        │ 6. Cache Response      │
                        │                        │
                        │ Redis.set(             │
                        │   cacheKey,            │
                        │   {answer, citations,  │
                        │    graph_context},     │
                        │   EX: 600s             │
                        │ )                      │
                        │                        │
                        │ Key includes:          │
                        │ - org_id               │
                        │ - question (normalized)│
                        │ - model versions       │
                        └────────────────────────┘
                                   │
                                   ▼
                    ┌───────────────────────────────┐
                    │ SSE Events → Client           │
                    │                               │
                    │ event: meta                   │
                    │ data: {citations, context}    │
                    │                               │
                    │ event: token                  │
                    │ data: {text: "The..."}        │
                    │                               │
                    │ event: token                  │
                    │ data: {text: " issue..."}     │
                    │                               │
                    │ ...more tokens...             │
                    │                               │
                    │ event: done                   │
                    │ data: {answer: "..."}         │
                    │                               │
                    │ res.end()                     │
                    └───────────────────────────────┘
```

---

## 2. Multi-Tenant Data Isolation

```
┌─────────────────────────────────────────────────────────────────┐
│                    Database Layer                               │
│                                                                 │
│  ┌──────────────────┐       ┌──────────────────┐               │
│  │ MongoDB Collections      │ Redis Cache                       │
│  │                  │       │                  │               │
│  │ org_1:          │       │ org_1:           │               │
│  │  ┌────────────┐│       │  ┌──────────┐    │               │
│  │  │ rag_chunks││ Filter │  │ cache    │    │               │
│  │  │ org_id=1   ││ WHERE  │  │ keys     │    │               │
│  │  │ + node_id  ││ org_id │  │ include  │    │               │
│  │  │ + embedding││ = 1    │  │ org_id   │    │               │
│  │  │ + metadata ││       │  │          │    │               │
│  │  └────────────┘│       │  └──────────┘    │               │
│  │                  │       │                  │               │
│  │ org_2:          │       │ org_2:           │               │
│  │  ┌────────────┐│       │  ┌──────────┐    │               │
│  │  │ rag_chunks││       │  │ cache    │    │               │
│  │  │ org_id=2   ││       │  │ keys     │    │               │
│  │  │ + node_id  ││       │  │ include  │    │               │
│  │  │ + embedding││       │  │ org_id   │    │               │
│  │  │ + metadata ││       │  │          │    │               │
│  │  └────────────┘│       │  └──────────┘    │               │
│  │                  │       │                  │               │
│  └──────────────────┘       └──────────────────┘               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              △
                              │
                 ┌────────────┴────────────┐
                 │                         │
         ┌───────────────┐        ┌───────────────┐
         │  Org 1 User   │        │  Org 2 User   │
         │               │        │               │
         │ Request with  │        │ Request with  │
         │ org_id: "1"   │        │ org_id: "2"   │
         │               │        │               │
         │ ✓ Can access  │        │ ✓ Can access  │
         │   org_id:1    │        │   org_id:2    │
         │ ✗ Cannot see  │        │ ✗ Cannot see  │
         │   org_id:2    │        │   org_id:1    │
         └───────────────┘        └───────────────┘

Vector Search Query Example:

  db.rag_chunks.aggregate([
    {
      $vectorSearch: {
        index: "rag_chunks_vector_idx",
        path: "embedding",
        queryVector: [0.1, 0.2, ...],
        numCandidates: 150,
        limit: 10,
        filter: {
          org_id: "org_1"  ← MULTI-TENANT FILTER
        }
      }
    }
  ])
```

---

## 3. Component Dependency Graph

```
                        ┌─────────────────┐
                        │   Express App   │
                        │   (server.js)   │
                        └────────┬────────┘
                                 │
                ┌────────────────┴────────────────┐
                │                                 │
                ▼                                 ▼
        ┌─────────────────┐             ┌──────────────────┐
        │  ai.routes.js   │             │ Other Modules    │
        │  POST/query/... │             │ (auth, ingestion)│
        └────────┬────────┘             └──────────────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
┌──────────┐ ┌────────────┐ ┌──────────────┐
│requireAuth│ │ validate() │ │streamRagQuery│
│middleware │ │ (Zod)      │ │ controller   │
└────┬─────┘ └─────┬──────┘ └──────┬───────┘
     │             │               │
     └─────────────┼───────────────┘
                   ▼
        ┌──────────────────────┐
        │ ai.controller.js      │
        │ (SSE handler)         │
        └──────┬───────────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
    ▼          ▼          ▼
┌──────────┐ ┌────────────────┐ ┌──────────────┐
│ assertOrg │ │getCachedRagRes │ │streamRagAnswer
│Membership │ │(Redis Client)  │ │(Service)
└─────┬────┘ └────────┬───────┘ └──────┬───────┘
      │               │                │
      │ Membership    │ Redis          ▼
      │ .findOne()    │ Get            ┌──────────────────┐
      ▼               │                │ragQuery.service  │
   MongoDB            ▼                └─────┬────────────┘
                  ┌─────────────┐            │
                  │Redis Client │            │
                  │(ioredis)    │            │
                  └─────────────┘     ┌──────┼──────┐
                                      │      │      │
                             ┌────────┘      │      └─────────┐
                             │               │                │
                             ▼               ▼                ▼
                   ┌────────────────┐ ┌──────────────┐ ┌─────────────┐
                   │ Embedding      │ │vectorSearch  │ │graphContext │
                   │ (OpenAI Client)│ │ Repository  │ │ Service     │
                   │ text-emb-3-sm  │ │ (MongoDB)    │ │ (axios)     │
                   └────────────────┘ └──────────────┘ └─────────────┘
                           │                │               │
                           │                │               │
                    ┌──────┴────┐    ┌──────┴──────┐    ┌───┴─────┐
                    │ OpenAI    │    │ MongoDB     │    │External │
                    │ API       │    │ Atlas       │    │Graph    │
                    │ embeddings│    │ Vector      │    │Service  │
                    │ endpoint  │    │ Search      │    │ API     │
                    └───────────┘    └─────────────┘    └─────────┘

                           ▼
                   ┌────────────────┐
                   │queryPrompt     │
                   │.builder.js     │
                   │(Prompt Builder)│
                   └────────┬───────┘
                            │
                            ▼
                   ┌────────────────────┐
                   │ GPT-4o Streaming   │
                   │ (OpenAI Completion)│
                   │ API                │
                   └────────┬───────────┘
                            │
                            ▼
                   ┌────────────────────┐
                   │ Cache Response     │
                   │ (Redis SET)        │
                   └────────┬───────────┘
                            │
                            ▼
                   ┌────────────────────┐
                   │ SSE Response       │
                   │ (Client Streaming) │
                   └────────────────────┘
```

---

## 4. Data Models

### RagChunk Schema
```
{
  _id: ObjectId,
  org_id: String,                    ← MULTI-TENANT KEY
  node_id: String,                   ← Graph node reference
  chunk_text: String,                ← Content to retrieve
  source: String,                    ← 'github', 'jira', 'confluence', etc.
  metadata: {                        ← Flexible attributes
    link: String,
    author: String,
    timestamp: Date,
    ...custom fields...
  },
  embedding: [Number],               ← 1536-dim vector (text-embedding-3-small)
  created_at: Date,
  
  Indexes:
  - { org_id: 1, node_id: 1, created_at: -1 }
  - Vector Index on "embedding" field
}
```

### Cache Key Structure
```
Key Format: rag:query:{sha256_hash}

Hash Components:
1. org_id (multi-tenant)
2. normalized_question (lowercase, trimmed)
3. ai_embedding_model (text-embedding-3-small)
4. ai_completion_model (gpt-4o)

Example Hash Calculation:
  SHA256("org_123:why did checkout fail:text-embedding-3-small:gpt-4o")
  = "a7c2d8e9f3b1c4a6d8e9f3b1c4a6d8e9"

Full Key:
  "rag:query:a7c2d8e9f3b1c4a6d8e9f3b1c4a6d8e9"

TTL: 600 seconds (10 minutes, configurable)

Cached Payload:
{
  answer: String,
  citations: [{id, source, node_id, score, snippet}],
  graph_context: [{root_id, root_type, nodes, edges}],
  created_at: ISO8601
}
```

---

## 5. Error Handling Flow

```
┌─────────────────────────────────────────────────┐
│         streamRagQuery Controller               │
│         (SSE Request Handler)                   │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
         ┌──────────────────────┐
         │ Headers not sent yet │
         │ (Normal flow)        │
         └──────┬───────────────┘
                │
    ┌───────────┴───────────────────────┐
    │                                   │
    ▼                                   ▼
┌─────────────────────┐      ┌──────────────────────┐
│ Error in validation │      │ Error in pipeline    │
│ or membership       │      │ (after SSE started)  │
│                     │      │                      │
│ ✓ Headers not sent  │      │ ✓ Headers sent       │
│ → Use next(error)   │      │ → SSE error event    │
│                     │      │ → res.end()          │
│ Express error       │      │                      │
│ middleware handles  │      │ Client receives:     │
│ response            │      │ event: error         │
│                     │      │ data: {message, ...} │
└─────────────────────┘      └──────────────────────┘

Exception Types:
│
├─ 401 Unauthenticated
│  └─ No JWT token
│
├─ 403 Unauthorized
│  └─ Not org member
│
├─ 400 Bad Request
│  └─ Invalid question (too short/long)
│
├─ 502 Bad Gateway
│  ├─ OpenAI embedding failed
│  ├─ MongoDB Atlas down
│  └─ Graph service timeout
│
├─ 503 Service Unavailable
│  └─ AI module disabled (env config)
│
└─ 500 Internal Server Error
   └─ Unexpected error (logged)
```

---

## 6. Performance Profile

### Typical Request Timeline

```
T+0ms:    Client sends request
T+50ms:   Auth middleware validates JWT
T+75ms:   Validation middleware (Zod) validates input
T+100ms:  Organization membership check (1 DB query)
T+120ms:  Redis cache lookup
T+150ms:  OpenAI embedding request (network)
T+500ms:  ✓ Embedding received
T+520ms:  MongoDB Vector Search query
T+600ms:  ✓ Chunks retrieved
T+610ms:  Graph service request (parallel with above)
T+750ms:  ✓ Graph context received (or timed out gracefully)
T+800ms:  Prompt building (local, <10ms)
T+810ms:  OpenAI streaming started
T+825ms:  ✓ First token received
T+850ms:  Event: meta (citations + context)
T+875ms:  Event: token "The..."
T+900ms:  Event: token " issue..."
...continues until...
T+5000ms: ✓ All tokens streamed
T+5050ms: Event: done
T+5070ms: Redis cache write
T+5100ms: ✓ Connection closed

Breakdown:
- Auth + Validation:  100ms
- Cache Lookup:       50ms
- Embedding:          350ms
- Vector Search:      80ms
- Graph Context:      140ms
- Prompt Build:       10ms
- LLM Streaming:      4000-5000ms (varies by response length)
- Cache Write:        30ms

Total:                4750-5150ms (4.75-5.15 seconds)

Cache Hit Path:       200ms total (much faster!)
```

---

## 7. Security Boundaries

```
┌──────────────────────────────────────────────────────────────────┐
│                    Client / Internet                             │
│                  (Untrusted, External)                           │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                    HTTPS/TLS
                         │
                         ▼
            ┌────────────────────────────┐
            │   Express Server (4001)    │
            │ Layer 1: Authentication   │
            │   - JWT Validation        │
            │   - Decoding req.auth.sub │
            └────────┬───────────────────┘
                     │
                     ▼
            ┌────────────────────────────┐
            │ Layer 2: Authorization    │
            │   - Org Membership Check  │
            │   - Verify User ∈ Org    │
            │   - Verify Status=active │
            └────────┬───────────────────┘
                     │
                     ▼
            ┌────────────────────────────┐
            │ Layer 3: Input Validation │
            │   - Zod Schema Check      │
            │   - Length Bounds         │
            │   - Type Validation       │
            └────────┬───────────────────┘
                     │
                     ▼
            ┌────────────────────────────┐
            │ Layer 4: Data Isolation   │
            │   - All queries filtered  │
            │     by org_id             │
            │   - Cache keys include    │
            │     org_id                │
            └────────┬───────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────────┐
│              Internal Network (Trusted)                          │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐            │
│  │  MongoDB    │  │    Redis    │  │ Graph Svc    │            │
│  │  Cluster    │  │   Cluster   │  │ (Internal)   │            │
│  └─────────────┘  └─────────────┘  └──────────────┘            │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         OpenAI API (External, Over HTTPS)              │   │
│  │         OPENAI_API_KEY managed securely                │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 8. Environment Configuration Hierarchy

```
┌─────────────────────────────────────────────────────┐
│       Application Environment (env.js)              │
└─────────────────────────────────────────────────────┘
         │
         ├─ Required in Production:
         │  ├─ OPENAI_API_KEY
         │  ├─ MONGO_URI
         │  └─ REDIS_URL
         │
         ├─ Feature Flags:
         │  ├─ AI_QUERY_ENABLED (default: true)
         │  ├─ AI_GRAPH_CONTEXT_ENABLED (default: true)
         │  └─ AI_REDIS_ENABLED (default: true)
         │
         ├─ Model Configuration:
         │  ├─ AI_EMBEDDING_MODEL → text-embedding-3-small
         │  ├─ AI_COMPLETION_MODEL → gpt-4o
         │  └─ (Changing models invalidates cache)
         │
         ├─ Query Parameters:
         │  ├─ AI_TOP_K → 10 (chunks to retrieve)
         │  ├─ AI_VECTOR_CANDIDATES → 150 (search candidates)
         │  ├─ AI_GRAPH_CONTEXT_NODES → 3 (max nodes)
         │  └─ AI_GRAPH_CONTEXT_HOPS → 2 (max hops)
         │
         ├─ Performance Tuning:
         │  ├─ AI_CACHE_TTL_SECONDS → 600 (10 min)
         │  ├─ AI_GRAPH_SERVICE_TIMEOUT_MS → 5000
         │  └─ Network timeouts
         │
         └─ External Services:
            ├─ GRAPH_SERVICE_BASE_URL → http://localhost:4001/api/v1/graph
            └─ OpenAI endpoint (hardcoded by library)
```

---

**End of Architecture & Flow Diagrams**

This module demonstrates production-grade architecture with clear separation of concerns, proper error handling, and security-first design.

