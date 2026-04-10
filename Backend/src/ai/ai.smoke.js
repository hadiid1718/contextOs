import { buildRagPrompt } from './prompts/queryPrompt.builder.js';
import { streamRagQuerySchema } from './validators/ai.schemas.js';

const payload = {
  body: {
    org_id: 'org_demo',
    question: 'What caused the checkout API latency regression?',
  },
  query: {},
  params: {},
};

const parsed = streamRagQuerySchema.parse(payload);

const prompt = buildRagPrompt({
  question: parsed.body.question,
  chunks: [
    {
      org_id: parsed.body.org_id,
      node_id: 'node-1',
      source: 'github',
      score: 0.92,
      chunk_text:
        'PR #81 introduced synchronous retry in checkout client. Deployed at 09:10 UTC and latency doubled.',
    },
    {
      org_id: parsed.body.org_id,
      node_id: 'node-2',
      source: 'jira',
      score: 0.88,
      chunk_text:
        'INC-245 notes p95 latency jump after release 2026.04.10. Temporary mitigation disabled aggressive retry.',
    },
  ],
  graphContext: [
    {
      root_id: 'node-1',
      root_type: 'pr',
      node_count: 4,
      edge_count: 3,
      nodes: [],
    },
  ],
});

console.log('Validated payload:', parsed.body);
console.log(
  'Prompt preview:',
  prompt.userPrompt.split('\n').slice(0, 8).join('\n')
);
console.log('Citation count:', prompt.citations.length);
