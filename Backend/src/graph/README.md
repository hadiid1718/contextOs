# Knowledge Graph Module

This module consumes `events.ingestion` Kafka events and materializes a decision graph in MongoDB.

## Collections

- `graph_nodes`: `{ _id, org_id, node_type, source, content, metadata, created_at }`
- `graph_edges`: `{ from_id, to_id, org_id, relationship_type, confidence_score }`

## API

- `GET /api/v1/graph/node/:id`
- `GET /api/v1/graph/causal-chain/:node_id?max_hops=5`
- `GET /api/v1/graph/decisions?org_id=<id>&file=<path>`

## Quick Try

1. Ensure MongoDB is available at `MONGO_URI`.
2. Start backend: `npm run dev`.
3. Optionally run smoke script: `npm run graph:smoke`.

