import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPeriodWindow,
  getOrgAiQueryLimit,
  incrementUsageRecord,
} from '../billing/services/usage.service.js';
import { UsageRecord } from '../billing/models/UsageRecord.js';

test('buildPeriodWindow returns month boundary key', () => {
  const period = buildPeriodWindow(new Date('2026-04-10T08:00:00Z'));

  assert.equal(period.periodKey, '2026-04');
  assert.equal(period.periodStart.toISOString(), '2026-04-01T00:00:00.000Z');
  assert.equal(period.periodEnd.toISOString(), '2026-05-01T00:00:00.000Z');
});

test('getOrgAiQueryLimit respects unlimited subscription', () => {
  assert.equal(getOrgAiQueryLimit({ aiQueryLimit: 0 }), 0);
});

test('incrementUsageRecord avoids usageCount upsert conflict', async () => {
  const originalFindOneAndUpdate = UsageRecord.findOneAndUpdate;
  let capturedUpdate;

  UsageRecord.findOneAndUpdate = async (_filter, update) => {
    capturedUpdate = update;
    return { usageCount: 1, periodKey: '2026-04' };
  };

  try {
    await incrementUsageRecord({
      orgId: 'org-test',
      units: 1,
      date: new Date('2026-04-10T08:00:00Z'),
    });

    assert.equal(
      Object.hasOwn(capturedUpdate.$setOnInsert, 'usageCount'),
      false
    );
    assert.equal(capturedUpdate.$inc.usageCount, 1);
  } finally {
    UsageRecord.findOneAndUpdate = originalFindOneAndUpdate;
  }
});
