# Module 5 - AI Query Service (RAG Pipeline)

This module implements the Query-time RAG flow:

1. Validate `question` + `org_id` input.
2. Generate embedding with `text-embedding-3-small`.
3. Query MongoDB Atlas Vector Search scoped by `org_id` (top 10 chunks).
4. Pull causal context from Graph Service.
5. Build a citation-aware prompt.
6. Stream GPT-4o output through Server-Sent Events (SSE).
7. Cache final response in Redis for 10 minutes.

## Route

- `POST /api/v1/ai/query/stream`

Request body:

```json
{
  "org_id": "org_123",
  "question": "Why did deployment X fail?"
}
```

SSE events:

- `token` -> incremental generated text
- `meta` -> citations, graph context, pipeline metadata
- `done` -> final complete answer
- `error` -> streaming-safe error payload

## File Structure

```text
src/ai/
  README.md
  ai.smoke.js
  index.js
  clients/
    openai.client.js
    redis.client.js
  controllers/
    ai.controller.js
  models/
    RagChunk.js
  prompts/
    queryPrompt.builder.js
  repositories/
    vectorSearch.repository.js
  routes/
    ai.routes.js
  services/
    graphContext.service.js
    ragQuery.service.js
  validators/
    ai.schemas.js
```
