import test from 'node:test';
import assert from 'node:assert/strict';

import { env } from '../config/env.js';
import {
  createGeminiEmbedding,
  generateGeminiAnswer,
} from '../ai/clients/gemini.client.js';

test('createGeminiEmbedding falls back to next model when configured model is unsupported', async () => {
  const originalFetch = globalThis.fetch;
  const originalGeminiKey = env.geminiApiKey;
  const originalEmbeddingModel = env.aiGeminiEmbeddingModel;

  const requestedModels = [];

  env.geminiApiKey = 'test-gemini-key';
  env.aiGeminiEmbeddingModel = 'text-embedding-004';

  globalThis.fetch = async url => {
    const modelMatch = String(url).match(/\/models\/([^:]+):embedContent/);
    const model = modelMatch?.[1] || 'unknown';
    requestedModels.push(model);

    if (model === 'text-embedding-004') {
      return {
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            message:
              'models/text-embedding-004 is not found for API version v1beta, or is not supported for embedContent.',
          },
        }),
      };
    }

    if (model === 'gemini-embedding-001') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          embedding: {
            values: [0.123, 0.456],
          },
        }),
      };
    }

    return {
      ok: false,
      status: 404,
      json: async () => ({
        error: {
          message: `unexpected model: ${model}`,
        },
      }),
    };
  };

  try {
    const embedding = await createGeminiEmbedding('How do we deploy this?');

    assert.deepEqual(embedding, [0.123, 0.456]);
    assert.deepEqual(requestedModels.slice(0, 2), [
      'text-embedding-004',
      'gemini-embedding-001',
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    env.geminiApiKey = originalGeminiKey;
    env.aiGeminiEmbeddingModel = originalEmbeddingModel;
  }
});

test('generateGeminiAnswer falls back to next model when configured model is unsupported', async () => {
  const originalFetch = globalThis.fetch;
  const originalGeminiKey = env.geminiApiKey;
  const originalGeminiModel = env.aiGeminiModel;

  const requestedModels = [];

  env.geminiApiKey = 'test-gemini-key';
  env.aiGeminiModel = 'gemini-1.5-flash';

  globalThis.fetch = async url => {
    const modelMatch = String(url).match(/\/models\/([^:]+):generateContent/);
    const model = modelMatch?.[1] || 'unknown';
    requestedModels.push(model);

    if (model === 'gemini-1.5-flash') {
      return {
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            message:
              'models/gemini-1.5-flash is not found for API version v1beta, or is not supported for generateContent.',
          },
        }),
      };
    }

    if (model === 'gemini-2.0-flash') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'Fallback completion response' }],
              },
            },
          ],
        }),
      };
    }

    return {
      ok: false,
      status: 404,
      json: async () => ({
        error: {
          message: `unexpected model: ${model}`,
        },
      }),
    };
  };

  try {
    const answer = await generateGeminiAnswer({
      systemPrompt: 'You are an assistant.',
      userPrompt: 'Summarize deployment steps.',
    });

    assert.equal(answer, 'Fallback completion response');
    assert.deepEqual(requestedModels.slice(0, 2), [
      'gemini-1.5-flash',
      'gemini-2.0-flash',
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    env.geminiApiKey = originalGeminiKey;
    env.aiGeminiModel = originalGeminiModel;
  }
});

test('generateGeminiAnswer returns provider quota error details when Gemini quota is exhausted', async () => {
  const originalFetch = globalThis.fetch;
  const originalGeminiKey = env.geminiApiKey;
  const originalGeminiModel = env.aiGeminiModel;

  env.geminiApiKey = 'test-gemini-key';
  env.aiGeminiModel = 'gemini-2.0-flash';

  globalThis.fetch = async () => ({
    ok: false,
    status: 429,
    json: async () => ({
      error: {
        message:
          'Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: gemini-2.0-flash',
      },
    }),
  });

  try {
    await assert.rejects(
      () =>
        generateGeminiAnswer({
          systemPrompt: 'You are an assistant.',
          userPrompt: 'Explain deployment.',
        }),
      error => {
        assert.equal(error?.statusCode, 429);
        assert.match(String(error?.message || ''), /Gemini API quota exceeded/i);
        assert.equal(error?.details?.provider, 'gemini');
        assert.equal(error?.details?.operation, 'generateContent');
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
    env.geminiApiKey = originalGeminiKey;
    env.aiGeminiModel = originalGeminiModel;
  }
});
