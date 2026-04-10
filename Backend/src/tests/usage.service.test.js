import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPeriodWindow,
  getOrgAiQueryLimit,
} from '../billing/services/usage.service.js';

test('buildPeriodWindow returns month boundary key', () => {
  const period = buildPeriodWindow(new Date('2026-04-10T08:00:00Z'));

  assert.equal(period.periodKey, '2026-04');
  assert.equal(period.periodStart.toISOString(), '2026-04-01T00:00:00.000Z');
  assert.equal(period.periodEnd.toISOString(), '2026-05-01T00:00:00.000Z');
});

test('getOrgAiQueryLimit respects unlimited subscription', () => {
  assert.equal(getOrgAiQueryLimit({ aiQueryLimit: 0 }), 0);
});
