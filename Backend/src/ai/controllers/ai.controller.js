import { AppError } from '../../utils/appError.js';
import { env } from '../../config/env.js';
import {
  assertOrgMembership,
  getCachedRagResponse,
  streamRagAnswer,
} from '../services/ragQuery.service.js';

const writeSseEvent = (res, event, data) => {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
};

const initializeSseResponse = res => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }
};

export const streamRagQuery = async (req, res, next) => {
  initializeSseResponse(res);

  const { org_id: orgId, question } = req.body;

  try {
    if (!env.aiQueryEnabled) {
      throw new AppError('AI query module is disabled', 503);
    }

    if (!req.auth?.sub) {
      throw new AppError('Authentication required', 401);
    }

    await assertOrgMembership({
      userId: req.auth.sub,
      orgId,
    });

    const cached = await getCachedRagResponse({ orgId, question });

    if (cached) {
      writeSseEvent(res, 'meta', {
        cached: true,
        citations: cached.citations,
        graph_context: cached.graph_context,
      });
      writeSseEvent(res, 'token', { text: cached.answer });
      writeSseEvent(res, 'done', {
        answer: cached.answer,
      });
      res.end();
      return;
    }

    const startedAt = Date.now();
    let tokenEvents = 0;

    const result = await streamRagAnswer({
      orgId,
      question,
      onToken: token => {
        if (res.writableEnded) {
          return;
        }

        tokenEvents += 1;
        writeSseEvent(res, 'token', { text: token });
      },
    });

    writeSseEvent(res, 'meta', {
      cached: false,
      citations: result.citations,
      graph_context: result.graph_context,
      chunks_used: result.chunks_used,
      token_events: tokenEvents,
      latency_ms: Date.now() - startedAt,
    });

    writeSseEvent(res, 'done', {
      answer: result.answer,
    });

    res.end();
  } catch (error) {
    if (!res.headersSent) {
      next(error);
      return;
    }

    writeSseEvent(res, 'error', {
      message: error?.message || 'Unexpected streaming error',
      details: error?.details,
    });

    res.end();
  }
};
