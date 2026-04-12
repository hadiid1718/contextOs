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
  const { org_id: orgId, question } = req.body;

  try {
    if (!env.aiQueryEnabled) {
      next(new AppError('AI query module is disabled', 503));
      return;
    }

    if (!req.auth?.sub) {
      next(new AppError('Authentication required', 401));
      return;
    }

    await assertOrgMembership({
      userId: req.auth.sub,
      orgId,
    });

    initializeSseResponse(res);

    const cached = await getCachedRagResponse({ orgId, question });

    if (cached) {
      writeSseEvent(res, 'meta', {
        cached: true,
        citations: cached.citations,
        graph_context: cached.graph_context,
        chunks_used: cached.chunks_used || null,
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
      onMeta: meta => {
        if (!res.writableEnded) {
          writeSseEvent(res, 'meta', meta);
        }
      },
      onToken: token => {
        if (res.writableEnded) {
          return;
        }

        tokenEvents += 1;
        writeSseEvent(res, 'token', { text: token });
      },
    });

    writeSseEvent(res, 'done', {
      answer: result.answer,
      token_events: tokenEvents,
      latency_ms: Date.now() - startedAt,
    });

    res.end();
  } catch (error) {
    if (!res.headersSent) {
      const statusCode = error instanceof AppError ? error.statusCode : 500;
      res.status(statusCode).json({
        message:
          error instanceof AppError
            ? error.message
            : error?.message || 'AI query failed',
        details:
          error instanceof AppError
            ? error.details
            : { reason: error?.message || 'Unexpected error' },
      });
      return;
    }

    writeSseEvent(res, 'error', {
      message: error?.message || 'Unexpected streaming error',
      details: error?.details,
    });

    res.end();
  }
};
