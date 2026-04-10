import assert from 'node:assert/strict';
import test from 'node:test';

import { createOrgSlidingWindowRateLimiter } from '../gateway/middleware/orgRateLimit.middleware.js';

class FakeRedis {
  constructor() {
    this.status = 'ready';
    this.data = new Map();
  }

  multi() {
    const commands = [];

    const chain = {
      zremrangebyscore: (key, min, max) => {
        commands.push({ cmd: 'zremrangebyscore', key, min, max });
        return chain;
      },
      zadd: (key, score, member) => {
        commands.push({ cmd: 'zadd', key, score, member });
        return chain;
      },
      zcard: key => {
        commands.push({ cmd: 'zcard', key });
        return chain;
      },
      pexpire: (_key, _ttl) => {
        commands.push({ cmd: 'pexpire' });
        return chain;
      },
      exec: async () => {
        const results = [];

        commands.forEach(command => {
          if (!this.data.has(command.key)) {
            this.data.set(command.key, []);
          }

          const bucket = this.data.get(command.key) || [];

          if (command.cmd === 'zremrangebyscore') {
            const updated = bucket.filter(
              item => item.score < command.min || item.score > command.max
            );
            this.data.set(command.key, updated);
            results.push([null, bucket.length - updated.length]);
          }

          if (command.cmd === 'zadd') {
            const updated = [
              ...bucket,
              { score: command.score, member: command.member },
            ];
            this.data.set(command.key, updated);
            results.push([null, 1]);
          }

          if (command.cmd === 'zcard') {
            results.push([null, (this.data.get(command.key) || []).length]);
          }

          if (command.cmd === 'pexpire') {
            results.push([null, 1]);
          }
        });

        return results;
      },
    };

    return chain;
  }
}

const createResponse = () => ({
  headers: {},
  statusCode: 200,
  payload: null,
  setHeader(name, value) {
    this.headers[name] = String(value);
  },
  status(value) {
    this.statusCode = value;
    return this;
  },
  json(payload) {
    this.payload = payload;
    return this;
  },
});

test('allows request under per-org limit', async () => {
  const redis = new FakeRedis();
  const middleware = createOrgSlidingWindowRateLimiter({
    redisClient: redis,
    limit: 2,
    windowMs: 60_000,
    keyPrefix: 'test:rate',
  });

  const req = { orgId: 'org_1', headers: {} };
  const res = createResponse();
  let nextCalled = false;

  await middleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['X-RateLimit-Limit'], '2');
});

test('blocks request above per-org limit', async () => {
  const redis = new FakeRedis();
  const middleware = createOrgSlidingWindowRateLimiter({
    redisClient: redis,
    limit: 1,
    windowMs: 60_000,
    keyPrefix: 'test:rate',
  });

  const req = { orgId: 'org_2', headers: {} };

  await middleware(req, createResponse(), () => {});

  const blockedRes = createResponse();
  let nextCalled = false;

  await middleware(req, blockedRes, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(blockedRes.statusCode, 429);
  assert.equal(
    blockedRes.payload?.message,
    'Rate limit exceeded for organisation'
  );
});
