import mongoose from 'mongoose';

import { env } from '../../config/env.js';
import { AppError } from '../../utils/appError.js';

const escapeRegex = value =>
  String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toQueryTerms = question =>
  String(question || '')
    .trim()
    .split(/\s+/)
    .map(term => term.toLowerCase())
    .filter(term => term.length >= 4)
    .slice(0, 6);

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

export const searchChunksFallback = async ({
  orgId,
  question,
  topK = env.aiTopK,
}) => {
  try {
    const terms = toQueryTerms(question);
    const query = {
      org_id: orgId,
    };

    if (terms.length > 0) {
      query.$or = terms.map(term => ({
        chunk_text: {
          $regex: escapeRegex(term),
          $options: 'i',
        },
      }));
    }

    const results = await mongoose.connection
      .collection(env.aiChunkCollection)
      .find(query, {
        projection: {
          _id: 1,
          org_id: 1,
          node_id: 1,
          source: 1,
          chunk_text: 1,
          metadata: 1,
          created_at: 1,
        },
      })
      .sort({ created_at: -1 })
      .limit(topK)
      .toArray();

    return results.map((item, index) => ({
      ...item,
      score: Number((Math.max(0.1, 1 - index * 0.05)).toFixed(4)),
    }));
  } catch (error) {
    throw new AppError('Fallback chunk search failed', 500, {
      reason: error.message,
      collection: env.aiChunkCollection,
    });
  }
};
