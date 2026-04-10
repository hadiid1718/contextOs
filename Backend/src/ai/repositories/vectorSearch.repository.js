import mongoose from 'mongoose';

import { env } from '../../config/env.js';
import { AppError } from '../../utils/appError.js';

export const searchChunksByVector = async ({
  orgId,
  queryVector,
  topK = env.aiTopK,
}) => {
  try {
    const results = await mongoose.connection
      .collection(env.aiChunkCollection)
      .aggregate([
        {
          $vectorSearch: {
            index: env.aiVectorIndexName,
            path: env.aiVectorEmbeddingPath,
            queryVector,
            numCandidates: env.aiVectorCandidates,
            limit: topK,
            filter: {
              org_id: orgId,
            },
          },
        },
        {
          $project: {
            _id: 1,
            org_id: 1,
            node_id: 1,
            source: 1,
            chunk_text: 1,
            metadata: 1,
            score: { $meta: 'vectorSearchScore' },
          },
        },
      ])
      .toArray();

    return results;
  } catch (error) {
    throw new AppError('Atlas Vector Search query failed', 500, {
      reason: error.message,
      collection: env.aiChunkCollection,
      index: env.aiVectorIndexName,
    });
  }
};
