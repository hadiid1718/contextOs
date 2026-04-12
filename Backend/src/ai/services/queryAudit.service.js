import logger from '../../config/loggers.js';
import { AiQueryRecord } from '../models/AiQueryRecord.js';

const clipText = (value, maxLength = 2000) => {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return '';
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}...`;
};

export const recordAiQuery = async ({
  orgId,
  userId,
  question,
  answer,
  status = 'success',
  aiProviderRequested = 'auto',
  aiProvider = 'mock',
  cached = false,
  chunksUsed = 0,
  citationsCount = 0,
  graphContextCount = 0,
  latencyMs = null,
  errorMessage = null,
  metadata = {},
}) => {
  try {
    await AiQueryRecord.create({
      org_id: orgId,
      user_id: userId || null,
      question: clipText(question, 4000),
      answer_preview: clipText(answer, 2000),
      status,
      ai_provider_requested: aiProviderRequested,
      ai_provider: aiProvider,
      cached: Boolean(cached),
      chunks_used: Number(chunksUsed || 0),
      citations_count: Number(citationsCount || 0),
      graph_context_count: Number(graphContextCount || 0),
      latency_ms: latencyMs == null ? null : Number(latencyMs),
      error_message: errorMessage ? clipText(errorMessage, 2000) : null,
      metadata: metadata || {},
    });
  } catch (error) {
    logger.warn(
      JSON.stringify({
        service: 'ai-query',
        message: 'Failed to persist AI query record',
        org_id: orgId,
        reason: error?.message || String(error),
      })
    );
  }
};
