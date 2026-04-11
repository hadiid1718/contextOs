import { createHash } from 'node:crypto';

import { Membership } from '../../models/Membership.js';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/appError.js';
import { getOpenAIClient } from '../clients/openai.client.js';
import { getRedisClient } from '../clients/redis.client.js';
import { buildRagPrompt } from '../prompts/queryPrompt.builder.js';
import { searchChunksByVector } from '../repositories/vectorSearch.repository.js';
import { fetchGraphContextForChunks } from './graphContext.service.js';

const normalizeQuestion = question =>
  String(question || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

export const buildQueryCacheKey = ({ orgId, question }) => {
  const hash = createHash('sha256')
    .update(
      `${orgId}:${normalizeQuestion(question)}:${env.aiEmbeddingModel}:${env.aiCompletionModel}`
    )
    .digest('hex');

  return `rag:query:${hash}`;
};

export const assertOrgMembership = async ({ userId, orgId }) => {
  const membership = await Membership.findOne({
    user: userId,
    org_id: orgId,
    status: 'active',
  }).lean();

  if (!membership) {
    throw new AppError('Organisation membership required', 403);
  }
};

export const getCachedRagResponse = async ({ orgId, question }) => {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }

  try {
    const value = await redis.get(buildQueryCacheKey({ orgId, question }));
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

export const setCachedRagResponse = async ({ orgId, question, payload }) => {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }

  try {
    await redis.set(
      buildQueryCacheKey({ orgId, question }),
      JSON.stringify(payload),
      'EX',
      env.aiCacheTtlSeconds
    );
  } catch {
    // Cache failures should not block the request path.
  }
};

const createQueryEmbedding = async question => {
  const openAI = getOpenAIClient();

  const embeddingResponse = await openAI.embeddings.create({
    model: env.aiEmbeddingModel,
    input: question,
  });

  const embedding = embeddingResponse?.data?.[0]?.embedding;

  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new AppError('Embedding generation failed', 502);
  }

  return embedding;
};

export const streamRagAnswer = async ({ orgId, question, onMeta, onToken }) => {
  let answer = '';
  let prompt = null;
  let graphContext = [];
  let metaPayload = null;

  try {
    const embedding = await createQueryEmbedding(question);
    const chunks = await searchChunksByVector({
      orgId,
      queryVector: embedding,
      topK: env.aiTopK,
    });

    graphContext = await fetchGraphContextForChunks({
      orgId,
      chunks,
      maxNodes: env.aiGraphContextNodes,
      maxHops: env.aiGraphContextHops,
    });

    prompt = buildRagPrompt({ question, chunks, graphContext });
    metaPayload = {
      cached: false,
      citations: prompt.citations,
      graph_context: graphContext,
      chunks_used: chunks.length,
    };

    if (typeof onMeta === 'function') {
      onMeta(metaPayload);
    }

    const openAI = getOpenAIClient();

    const stream = await openAI.chat.completions.create({
      model: env.aiCompletionModel,
      temperature: 0.2,
      stream: true,
      messages: [
        {
          role: 'system',
          content: prompt.systemPrompt,
        },
        {
          role: 'user',
          content: prompt.userPrompt,
        },
      ],
    });


    for await (const part of stream) {
      const token = part?.choices?.[0]?.delta?.content;
      if (!token) {
        continue;
      }

      answer += token;
      onToken(token);
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError('RAG query pipeline failed', 502, {
      reason: error.message,
    });
  }

  const trimmed = answer.trim();

  if (!trimmed) {
    throw new AppError('GPT-4o returned an empty answer', 502);
  }

  const payload = {
    answer: trimmed,
    citations: prompt.citations,
    graph_context: graphContext,
    created_at: new Date().toISOString(),
  };

  await setCachedRagResponse({ orgId, question, payload });

  return {
    ...payload,
    ...metaPayload,
  };
};
