import axiosInstance from '../lib/axios';
import useBillingStore from '../store/billingStore';

const getBaseUrl = () => {
  return String(axiosInstance.defaults.baseURL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1').replace(/\/+$/, '');
};

const buildUrl = (path) => `${getBaseUrl()}${path}`;

const toError = async (response) => {
  const fallback = { message: `Request failed with status ${response.status}` };

  try {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await response.json();
    }

    const text = await response.text();
    return text ? { message: text } : fallback;
  } catch {
    return fallback;
  }
};

const extractAuthToken = () => {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const splitStreamingText = (value) => {
  const text = String(value || '');
  if (!text) return [];

  const segments = text.match(/\S+\s*/g);
  return segments && segments.length > 0 ? segments : [text];
};

const parseSseBlock = (block) => {
  const lines = String(block || '')
    .split(/\r?\n/)
    .filter(Boolean);

  let event = 'message';
  const dataLines = [];

  lines.forEach((line) => {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
      return;
    }

    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  });

  const payloadText = dataLines.join('\n');
  let data = null;

  if (payloadText) {
    try {
      data = JSON.parse(payloadText);
    } catch {
      data = { text: payloadText };
    }
  }

  return { event, data };
};

const run = async ({
  orgId,
  question,
  signal,
  onToken,
  onMeta,
  onDone,
  onError,
}) => {
  const response = await fetch(buildUrl('/ai/query/stream'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...extractAuthToken(),
    },
    credentials: 'include',
    body: JSON.stringify({
      org_id: orgId,
      question,
    }),
    signal,
  });

  if (!response.ok) {
    const errorPayload = await toError(response);
    const error = new Error(errorPayload?.message || 'Unable to run query');
    error.status = response.status;
    error.details = errorPayload?.details || errorPayload?.errors || null;

    if (response.status === 429) {
      useBillingStore.getState().openUpgradeModal({
        message: errorPayload?.message || 'Upgrade to continue.',
        details: errorPayload?.details || errorPayload?.errors || null,
      });
    }

    if (typeof onError === 'function') {
      onError(error);
    }
    throw error;
  }

  if (!response.body) {
    throw new Error('Streaming response is unavailable');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let answer = '';
  let meta = null;

  const emitToken = (text) => {
    splitStreamingText(text).forEach((segment) => {
      answer += segment;
      if (typeof onToken === 'function') {
        onToken(segment);
      }
    });
  };

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    let boundaryIndex = buffer.indexOf('\n\n');
    while (boundaryIndex !== -1) {
      const rawBlock = buffer.slice(0, boundaryIndex).trim();
      buffer = buffer.slice(boundaryIndex + 2);

      if (rawBlock) {
        const parsed = parseSseBlock(rawBlock);

        if (parsed.event === 'token' && parsed.data?.text) {
          emitToken(parsed.data.text);
        } else if (parsed.event === 'meta') {
          meta = parsed.data || null;
          if (typeof onMeta === 'function') {
            onMeta(meta);
          }
        } else if (parsed.event === 'done') {
          const donePayload = {
            ...(parsed.data || {}),
            answer: parsed.data?.answer || answer.trim(),
            meta,
          };
          if (typeof onDone === 'function') {
            onDone(donePayload);
          }
          return donePayload;
        } else if (parsed.event === 'error') {
          const error = new Error(parsed.data?.message || 'Streaming query failed');
          error.details = parsed.data?.details || null;
          if (typeof onError === 'function') {
            onError(error);
          }
          throw error;
        }
      }

      boundaryIndex = buffer.indexOf('\n\n');
    }
  }

  const finalAnswer = answer.trim();
  const donePayload = {
    answer: finalAnswer,
    meta,
  };

  if (typeof onDone === 'function') {
    onDone(donePayload);
  }

  return donePayload;
};

const queryService = {
  run,
};

export default queryService;

