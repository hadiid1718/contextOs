# Environment Variables Configuration - AI, Graph & Ingestion

**Date:** April 10, 2026  
**File:** `.env.development`  
**Status:** ✅ CONFIGURED

---

## Overview

Environment variables for the AI Query Service, Graph Module, and Ingestion Module have been configured in `.env.development` for development use.

---

## AI MODULE VARIABLES

### Basic Configuration
```env
AI_QUERY_ENABLED=true
```
- **Description:** Enable/disable the AI query module
- **Default:** true
- **Type:** Boolean

### OpenAI API Configuration
```env
OPENAI_API_KEY=sk-proj-YOUR_OPENAI_API_KEY_HERE
```
- **Description:** OpenAI API key for embeddings and completions
- **Required:** Yes (update with your actual key)
- **Type:** String

### Model Selection
```env
AI_EMBEDDING_MODEL=text-embedding-3-small
AI_COMPLETION_MODEL=gpt-4o
```
- **AI_EMBEDDING_MODEL:** 
  - Used for query embeddings
  - Default: `text-embedding-3-small` (1536 dimensions)
  - Alternative: `text-embedding-3-large`

- **AI_COMPLETION_MODEL:**
  - Used for response generation
  - Default: `gpt-4o`
  - Cost-efficient alternative: `gpt-4-turbo`

### Vector Search Configuration
```env
AI_TOP_K=10
AI_VECTOR_CANDIDATES=150
AI_CHUNK_COLLECTION=rag_chunks
AI_VECTOR_INDEX_NAME=rag_chunks_vector_idx
AI_VECTOR_EMBEDDING_PATH=embedding
```
- **AI_TOP_K:** Number of chunks to retrieve (default: 10)
- **AI_VECTOR_CANDIDATES:** Candidates for vector search (default: 150)
- **AI_CHUNK_COLLECTION:** MongoDB collection name (default: rag_chunks)
- **AI_VECTOR_INDEX_NAME:** Vector search index name (default: rag_chunks_vector_idx)
- **AI_VECTOR_EMBEDDING_PATH:** Field path for embeddings (default: embedding)

### Caching
```env
AI_CACHE_TTL_SECONDS=600
```
- **Description:** Cache time-to-live in seconds
- **Default:** 600 (10 minutes)
- **Impact:** Higher = more cache hits, lower = fresher responses

---

## AI GRAPH CONTEXT VARIABLES

### Graph Context Enabled
```env
AI_GRAPH_CONTEXT_ENABLED=true
```
- **Description:** Enable/disable graph context enrichment
- **Default:** true
- **Note:** When enabled, adds causal context to responses

### Graph Context Limits
```env
AI_GRAPH_CONTEXT_NODES=3
AI_GRAPH_CONTEXT_HOPS=2
```
- **AI_GRAPH_CONTEXT_NODES:** Max number of graph nodes to fetch (default: 3)
- **AI_GRAPH_CONTEXT_HOPS:** Max hops in graph traversal (default: 2)
- **Impact:** Higher values = more context, slower response

### Graph Service
```env
GRAPH_SERVICE_BASE_URL=http://localhost:4001/api/v1/graph
AI_GRAPH_SERVICE_TIMEOUT_MS=5000
```
- **GRAPH_SERVICE_BASE_URL:** Graph service API endpoint
- **AI_GRAPH_SERVICE_TIMEOUT_MS:** Timeout for graph service requests (default: 5000ms)

---

## AI REDIS CACHING VARIABLES

### Redis Configuration
```env
AI_REDIS_ENABLED=true
REDIS_URL=redis://127.0.0.1:6379
```
- **AI_REDIS_ENABLED:** Enable/disable Redis caching (default: true)
- **REDIS_URL:** Redis connection string
  - Format: `redis://host:port`
  - Default: `redis://127.0.0.1:6379`
  - Production: Update with your Redis cluster endpoint

---

## GRAPH MODULE VARIABLES

### Graph Module Enabled
```env
GRAPH_ENABLED=true
```
- **Description:** Enable/disable the graph module
- **Default:** true

### Graph Kafka Configuration
```env
GRAPH_KAFKA_TOPIC=events.ingestion
GRAPH_KAFKA_CLIENT_ID=contextos-knowledge-graph-service
GRAPH_CONSUMER_GROUP_ID=contextos-graph-consumer-group
GRAPH_MOCK_KAFKA=true
```
- **GRAPH_KAFKA_TOPIC:** Kafka topic for graph events
- **GRAPH_KAFKA_CLIENT_ID:** Kafka client identifier
- **GRAPH_CONSUMER_GROUP_ID:** Kafka consumer group ID
- **GRAPH_MOCK_KAFKA:** Use mock Kafka (default: true for dev)

---

## INGESTION MODULE VARIABLES

### Ingestion Enabled
```env
INGESTION_ENABLED=true
```
- **Description:** Enable/disable the ingestion module
- **Default:** true

### Ingestion Kafka Configuration
```env
KAFKA_BROKERS=127.0.0.1:9092
KAFKA_CLIENT_ID=contextos-ingestion-service
KAFKA_TOPIC=events.ingestion
MOCK_KAFKA=true
```
- **KAFKA_BROKERS:** Kafka broker addresses
- **KAFKA_CLIENT_ID:** Kafka client identifier
- **KAFKA_TOPIC:** Main Kafka topic for ingestion events
- **MOCK_KAFKA:** Use mock Kafka (default: true for dev)

### Encryption
```env
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```
- **Description:** 64-character hex key for credential encryption
- **Length:** 64 characters (256 bits)
- **Default:** Demo key (CHANGE IN PRODUCTION)

### Webhook Security
```env
WEBHOOK_BASE_URL=https://abc123.ngrok-free.app/api/v1/webhooks
GITHUB_WEBHOOK_SECRET=mygithubingestion.189@comcom
JIRA_WEBHOOK_SECRET=bo4DIyCxTyjC9xIQmlbS
SLACK_SIGNING_SECRET=d17436d9df46be29592b7b1ced079908
```
- **WEBHOOK_BASE_URL:** Base URL for webhook endpoints
- **GitHub/JIRA/Slack secrets:** Used for webhook signature verification

### Webhook IP Allowlists
```env
GITHUB_WEBHOOK_IP_ALLOWLIST=192.30.252.0/22,185.199.108.0/22,140.82.112.0/20,143.55.64.0/20,2a0a:a440::/29,2606:50c0::/32
JIRA_WEBHOOK_IP_ALLOWLIST=2401:1d80:3208:5::/64
SLACK_WEBHOOK_IP_ALLOWLIST=
```
- **Description:** CIDR ranges allowed to send webhooks
- **Format:** Comma-separated list of IP ranges

### Polling Configuration
```env
POLL_CRON="*/15 * * * *"
POLL_LOOKBACK_MINUTES=15
```
- **POLL_CRON:** Cron schedule for polling (every 15 minutes)
- **POLL_LOOKBACK_MINUTES:** Minutes to look back for new events

### Retry Configuration
```env
RETRY_MAX_RETRIES=4
RETRY_BASE_DELAY_MS=250
RETRY_MAX_DELAY_MS=10000
```
- **RETRY_MAX_RETRIES:** Maximum retry attempts (default: 4)
- **RETRY_BASE_DELAY_MS:** Base delay between retries in ms (default: 250)
- **RETRY_MAX_DELAY_MS:** Maximum delay between retries (default: 10000)

---

## Configuration Summary Table

| Variable | Module | Value | Type | Required |
|----------|--------|-------|------|----------|
| `AI_QUERY_ENABLED` | AI | true | Boolean | Yes |
| `OPENAI_API_KEY` | AI | sk-proj-... | String | Yes* |
| `AI_EMBEDDING_MODEL` | AI | text-embedding-3-small | String | No |
| `AI_COMPLETION_MODEL` | AI | gpt-4o | String | No |
| `AI_TOP_K` | AI | 10 | Number | No |
| `AI_VECTOR_CANDIDATES` | AI | 150 | Number | No |
| `AI_CHUNK_COLLECTION` | AI | rag_chunks | String | No |
| `AI_VECTOR_INDEX_NAME` | AI | rag_chunks_vector_idx | String | No |
| `AI_VECTOR_EMBEDDING_PATH` | AI | embedding | String | No |
| `AI_CACHE_TTL_SECONDS` | AI | 600 | Number | No |
| `AI_GRAPH_CONTEXT_ENABLED` | Graph | true | Boolean | No |
| `AI_GRAPH_CONTEXT_NODES` | Graph | 3 | Number | No |
| `AI_GRAPH_CONTEXT_HOPS` | Graph | 2 | Number | No |
| `GRAPH_SERVICE_BASE_URL` | Graph | http://localhost:4001/api/v1/graph | String | No |
| `AI_GRAPH_SERVICE_TIMEOUT_MS` | Graph | 5000 | Number | No |
| `AI_REDIS_ENABLED` | AI | true | Boolean | No |
| `REDIS_URL` | AI | redis://127.0.0.1:6379 | String | No |
| `GRAPH_ENABLED` | Graph | true | Boolean | No |
| `GRAPH_KAFKA_TOPIC` | Graph | events.ingestion | String | No |
| `GRAPH_KAFKA_CLIENT_ID` | Graph | contextos-knowledge-graph-service | String | No |
| `GRAPH_CONSUMER_GROUP_ID` | Graph | contextos-graph-consumer-group | String | No |
| `GRAPH_MOCK_KAFKA` | Graph | true | Boolean | No |
| `INGESTION_ENABLED` | Ingestion | true | Boolean | Yes |
| `KAFKA_BROKERS` | Ingestion | 127.0.0.1:9092 | String | Yes |
| `KAFKA_CLIENT_ID` | Ingestion | contextos-ingestion-service | String | Yes |
| `KAFKA_TOPIC` | Ingestion | events.ingestion | String | Yes |
| `MOCK_KAFKA` | Ingestion | true | Boolean | Yes |
| `ENCRYPTION_KEY` | Ingestion | 0123456789abcdef... | String | Yes |
| `WEBHOOK_BASE_URL` | Ingestion | https://abc123.ngrok-free.app/api/v1/webhooks | String | Yes |
| `GITHUB_WEBHOOK_SECRET` | Ingestion | ... | String | Yes |
| `JIRA_WEBHOOK_SECRET` | Ingestion | ... | String | Yes |
| `SLACK_SIGNING_SECRET` | Ingestion | ... | String | Yes |
| `GITHUB_WEBHOOK_IP_ALLOWLIST` | Ingestion | 192.30.252.0/22,... | String | No |
| `JIRA_WEBHOOK_IP_ALLOWLIST` | Ingestion | 2401:1d80:3208:5::/64 | String | No |
| `SLACK_WEBHOOK_IP_ALLOWLIST` | Ingestion | (empty) | String | No |
| `POLL_CRON` | Ingestion | */15 * * * * | String | No |
| `POLL_LOOKBACK_MINUTES` | Ingestion | 15 | Number | No |
| `RETRY_MAX_RETRIES` | Ingestion | 4 | Number | No |
| `RETRY_BASE_DELAY_MS` | Ingestion | 250 | Number | No |
| `RETRY_MAX_DELAY_MS` | Ingestion | 10000 | Number | No |

*Required when AI module is in production. For development with mock responses, can be skipped.

---

## Important Notes

### 1. OPENAI_API_KEY
⚠️ **Must be updated before using the AI module**
```env
# Replace this:
OPENAI_API_KEY=sk-proj-YOUR_OPENAI_API_KEY_HERE

# With your actual key:
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxx
```

### 2. Redis Configuration
For development:
```env
REDIS_URL=redis://127.0.0.1:6379
```

For production, use cloud Redis:
```env
REDIS_URL=redis://user:password@redis-prod-cluster.example.com:6379
```

### 3. Graph Service URL
Default points to localhost. For distributed setup:
```env
GRAPH_SERVICE_BASE_URL=http://graph-service:4002/api/v1/graph
```

### 4. Kafka Configuration
For development (mock mode):
```env
MOCK_KAFKA=true
```

For production (real Kafka):
```env
MOCK_KAFKA=false
KAFKA_BROKERS=kafka-broker-1:9092,kafka-broker-2:9092,kafka-broker-3:9092
```

### 5. Encryption Key
⚠️ **Generate a new key for production**
```bash
# Generate secure encryption key (64 hex chars)
openssl rand -hex 32
```

---

## How to Update Variables

### For Quick Testing
Edit `.env.development` and update only:
```env
OPENAI_API_KEY=your_actual_key
```

### For Full Configuration
Update relevant sections based on your deployment:
1. AI module variables (OpenAI, models, caching)
2. Graph module variables (Kafka topics, timeouts)
3. Ingestion module variables (webhooks, encryption)
4. Redis configuration
5. External service URLs

### Environment File Priority
1. `.env.development` - Development (current)
2. `.env.production` - Production
3. `.env.example` - Template/reference
4. Environment system variables - Override everything

---

## Verification

To verify all variables are loaded correctly:

```bash
# Check if variables are present
grep -E "^(AI_|GRAPH_|INGESTION_|REDIS_|OPENAI_)" .env.development

# Start the application
npm run dev

# Check application logs for configuration confirmation
# Look for messages like "AI module initialized" or "Redis connected"
```

---

## Next Steps

1. **For AI Module:**
   - Update `OPENAI_API_KEY` with your actual OpenAI key
   - Ensure MongoDB Atlas Vector Search is configured
   - Verify Redis is running on localhost:6379

2. **For Graph Module:**
   - Verify Graph Service is accessible at `http://localhost:4001/api/v1/graph`
   - Ensure Kafka/Mock Kafka is running

3. **For Ingestion Module:**
   - Update webhook secrets with actual values
   - Configure webhook base URL (use ngrok for local testing)
   - Ensure encryption key is production-ready

4. **Test Configuration:**
   ```bash
   npm run dev
   npm run ai:smoke
   npm run graph:smoke
   npm run ingestion:smoke
   ```

---

**Status: ✅ ENVIRONMENT VARIABLES CONFIGURED**

All AI, Graph, and Ingestion module environment variables are now set in `.env.development`.

