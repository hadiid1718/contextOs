import { createHash } from 'node:crypto';

import { Membership } from '../../models/Membership.js';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/appError.js';
import {
  createGeminiEmbedding,
  generateGeminiAnswer,
  isGeminiConfigured,
} from '../clients/gemini.client.js';
import {
  getOpenAIClient,
  isOpenAIConfigured,
} from '../clients/openai.client.js';
import { getRedisClient } from '../clients/redis.client.js';
import { buildRagPrompt } from '../prompts/queryPrompt.builder.js';
import {
  searchChunksByVector,
  searchChunksFallback,
} from '../repositories/vectorSearch.repository.js';
import { fetchGraphContextForChunks } from './graphContext.service.js';

const normalizeQuestion = question =>
  String(question || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const normalizeAiProvider = provider => {
  const normalized = String(provider || 'auto').trim().toLowerCase();
  if (['openai', 'gemini', 'auto'].includes(normalized)) {
    return normalized;
  }

  return 'auto';
};

const resolveAiProvider = requestedProvider => {
  const requested = normalizeAiProvider(requestedProvider);
  const openAiAvailable = isOpenAIConfigured();
  const geminiAvailable = isGeminiConfigured();

  if (requested === 'openai') {
    if (!openAiAvailable) {
      throw new AppError('OpenAI is not configured for this environment', 503);
    }

    return {
      requested,
      used: 'openai',
    };
  }

  if (requested === 'gemini') {
    if (!geminiAvailable) {
      throw new AppError('Gemini is not configured for this environment', 503);
    }

    return {
      requested,
      used: 'gemini',
    };
  }

  const defaultProvider = normalizeAiProvider(env.aiProviderDefault || 'auto');
  if (defaultProvider === 'gemini' && geminiAvailable) {
    return {
      requested,
      used: 'gemini',
    };
  }

  if (defaultProvider === 'openai' && openAiAvailable) {
    return {
      requested,
      used: 'openai',
    };
  }

  if (openAiAvailable) {
    return {
      requested,
      used: 'openai',
    };
  }

  if (geminiAvailable) {
    return {
      requested,
      used: 'gemini',
    };
  }

  throw new AppError(
    'No AI provider is configured. Set OPENAI_API_KEY or GEMINI_API_KEY, or enable AI_MOCK_MODE.',
    503
  );
};

const emitTextSegments = (text, onToken) => {
  const value = String(text || '');
  if (!value || typeof onToken !== 'function') {
    return value;
  }

  const segments = value.match(/\S+\s*/g) || [value];
  let answer = '';

  segments.forEach(segment => {
    answer += segment;
    onToken(segment);
  });

  return answer;
};

const buildMockAnswer = ({ question, orgId, aiProviderRequested }) => {
  return [
    'Local AI mock response is active because no live AI provider key is configured.',
    `Question: ${question}`,
    `Organisation: ${orgId}`,
    `Requested provider: ${aiProviderRequested}`,
    'Set OPENAI_API_KEY or GEMINI_API_KEY (or AI_MOCK_MODE=false) in your backend environment to enable full model-backed responses.',
  ].join('\n\n');
};

export const buildQueryCacheKey = ({ orgId, question, aiProvider = 'auto' }) => {
  const provider = normalizeAiProvider(aiProvider);
  const hash = createHash('sha256')
    .update(
      `${orgId}:${normalizeQuestion(question)}:${provider}:${env.aiEmbeddingModel}:${env.aiCompletionModel}:${env.aiGeminiModel}:${env.aiGeminiEmbeddingModel}`
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

export const getCachedRagResponse = async ({
  orgId,
  question,
  aiProvider = 'auto',
}) => {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }

  try {
    const value = await redis.get(
      buildQueryCacheKey({ orgId, question, aiProvider })
    );
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

export const setCachedRagResponse = async ({
  orgId,
  question,
  aiProvider = 'auto',
  payload,
}) => {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }

  try {
    await redis.set(
      buildQueryCacheKey({ orgId, question, aiProvider }),
      JSON.stringify(payload),
      'EX',
      env.aiCacheTtlSeconds
    );
  } catch {
    // Cache failures should not block the request path.
  }
};

const createOpenAiEmbedding = async question => {
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

const createQueryEmbedding = async ({ question, completionProvider }) => {
  if (isOpenAIConfigured()) {
    try {
      return await createOpenAiEmbedding(question);
    } catch (error) {
      if (completionProvider === 'openai') {
        throw error;
      }
    }
  }

  if (isGeminiConfigured()) {
    return createGeminiEmbedding(question);
  }

  throw new AppError(
    'No embedding provider is configured. Set OPENAI_API_KEY or GEMINI_API_KEY.',
    503
  );
};

const retrieveChunks = async ({ orgId, question, queryVector }) => {
  try {
    const chunks = await searchChunksByVector({
      orgId,
      queryVector,
      topK: env.aiTopK,
    });

    return {
      chunks,
      retrievalMode: 'vector',
    };
  } catch {
    const chunks = await searchChunksFallback({
      orgId,
      question,
      topK: env.aiTopK,
    });

    return {
      chunks,
      retrievalMode: 'fallback',
    };
  }
};

const streamOpenAiAnswer = async ({ prompt, onToken }) => {
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

  let answer = '';

  for await (const part of stream) {
    const token = part?.choices?.[0]?.delta?.content;
    if (!token) {
      continue;
    }

    answer += token;
    if (typeof onToken === 'function') {
      onToken(token);
    }
  }

  return answer;
};

const streamGeminiAnswer = async ({ prompt, onToken }) => {
  const answer = await generateGeminiAnswer({
    systemPrompt: prompt.systemPrompt,
    userPrompt: prompt.userPrompt,
  });

  return emitTextSegments(answer, onToken);
};

const isGeminiQuotaError = error => {
  if (!(error instanceof AppError)) {
    return false;
  }

  if (error.statusCode === 429 && error?.details?.provider === 'gemini') {
    return true;
  }

  const reason = String(error?.details?.reason || error?.message || '');
  return /quota exceeded|rate limit|resource_exhausted|limit:\s*0/i.test(reason);
};

export const streamRagAnswer = async ({
  orgId,
  question,
  aiProvider = 'auto',
  onMeta,
  onToken,
}) => {
  const requestedProvider = normalizeAiProvider(aiProvider);
  const openAiAvailable = isOpenAIConfigured();

  if (env.aiMockMode) {
    const answer = buildMockAnswer({
      question,
      orgId,
      aiProviderRequested: requestedProvider,
    });
    const payload = {
      answer,
      citations: [],
      graph_context: [],
      created_at: new Date().toISOString(),
      ai_provider_requested: requestedProvider,
      ai_provider: 'mock',
      cached: false,
      chunks_used: 0,
      retrieval_mode: 'mock',
    };

    if (typeof onMeta === 'function') {
      onMeta({
        cached: false,
        citations: [],
        graph_context: [],
        chunks_used: 0,
        ai_provider_requested: requestedProvider,
        ai_provider: 'mock',
        retrieval_mode: 'mock',
      });
    }

    emitTextSegments(answer, onToken);

    await setCachedRagResponse({
      orgId,
      question,
      aiProvider: requestedProvider,
      payload,
    });
    return payload;
  }

  const providerSelection = resolveAiProvider(requestedProvider);

  let answer;
  let prompt;
  let graphContext;
  let metaPayload;
  let retrievalMode;

  try {
    const embedding = await createQueryEmbedding({
      question,
      completionProvider: providerSelection.used,
    });

    const retrievalResult = await retrieveChunks({
      orgId,
      question,
      queryVector: embedding,
    });

    const chunks = retrievalResult.chunks;
    retrievalMode = retrievalResult.retrievalMode;

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
      ai_provider_requested: providerSelection.requested,
      ai_provider: providerSelection.used,
      retrieval_mode: retrievalMode,
    };

    if (typeof onMeta === 'function') {
      onMeta(metaPayload);
    }

    if (providerSelection.used === 'openai') {
      answer = await streamOpenAiAnswer({
        prompt,
        onToken,
      });
    } else {
      try {
        answer = await streamGeminiAnswer({
          prompt,
          onToken,
        });
      } catch (error) {
        if (
          requestedProvider === 'auto' &&
          openAiAvailable &&
          isGeminiQuotaError(error)
        ) {
          answer = await streamOpenAiAnswer({
            prompt,
            onToken,
          });

          metaPayload = {
            ...metaPayload,
            ai_provider: 'openai',
            fallback_from: 'gemini',
          };

          if (typeof onMeta === 'function') {
            onMeta(metaPayload);
          }
        } else {
          throw error;
        }
      }
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
    throw new AppError('AI provider returned an empty answer', 502);
  }

  const payload = {
    answer: trimmed,
    citations: prompt.citations,
    graph_context: graphContext,
    chunks_used: metaPayload?.chunks_used || 0,
    created_at: new Date().toISOString(),
    ai_provider_requested: providerSelection.requested,
    ai_provider: metaPayload?.ai_provider || providerSelection.used,
    fallback_from: metaPayload?.fallback_from,
    retrieval_mode: retrievalMode,
  };

  await setCachedRagResponse({
    orgId,
    question,
    aiProvider: providerSelection.requested,
    payload,
  });

  return {
    ...payload,
    ...metaPayload,
    cached: false,
  };
};
