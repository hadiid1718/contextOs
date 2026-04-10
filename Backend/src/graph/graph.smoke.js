import mongoose from 'mongoose';

import { env } from '../config/env.js';
import logger from '../config/loggers.js';
import { createGraphIndexes } from '../config/graphMigrations.js';
import { processGraphEvent } from './services/graphIngestion.service.js';
import {
  getCausalChain,
  getDecisionsForFile,
  getGraphNodeById,
} from './services/graphQuery.service.js';

const sampleEvent = {
  org_id: 'org-smoke-1',
  source: 'github',
  event_type: 'pull_request.merged',
  content: {
    repository: 'contextos/platform',
    commits: [
      {
        id: 'abc123',
        message: 'Fix incident flow for OPS-102',
        author: { name: 'smoke-user' },
      },
    ],
    pull_request: {
      number: 42,
      title: 'Incident hotfix',
      state: 'closed',
      merged: true,
      url: 'https://example.com/pr/42',
    },
  },
  metadata: {
    file: 'src/services/incident.service.js',
    decision_id: 'dec-42',
  },
  timestamp: new Date().toISOString(),
};

const run = async () => {
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 10000 });

  try {
    await createGraphIndexes();
    const ingestionResult = await processGraphEvent(sampleEvent);

    const decisionId = await (async () => {
      const decisions = await getDecisionsForFile({
        orgId: sampleEvent.org_id,
        file: 'incident.service.js',
      });
      return decisions[0]?._id;
    })();

    let chain = null;
    let node = null;
    if (decisionId) {
      node = await getGraphNodeById(decisionId);
      chain = await getCausalChain({ nodeId: decisionId, maxHops: 3 });
    }

    logger.info(
      JSON.stringify({
        service: 'knowledge-graph',
        message: 'Graph smoke test completed',
        ingestionResult,
        nodeFound: Boolean(node),
        chainNodes: chain?.nodes?.length || 0,
        chainEdges: chain?.edges?.length || 0,
      })
    );
  } finally {
    await mongoose.disconnect();
  }
};

run().catch(error => {
  logger.error(error?.stack || error?.message || 'Graph smoke test failed');
  process.exitCode = 1;
});
