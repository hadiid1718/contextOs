import { test, expect } from '@jest/globals';

import {
  buildPeriodWindow,
  getOrgAiQueryLimit,
  incrementUsageRecord,
} from '../billing/services/usage.service.js';
import { UsageRecord } from '../billing/models/UsageRecord.js';

test('buildPeriodWindow returns month boundary key', () => {
  const period = buildPeriodWindow(new Date('2026-04-10T08:00:00Z'));

  expect(period.periodKey).toBe('2026-04');
  expect(period.periodStart.toISOString()).toBe('2026-04-01T00:00:00.000Z');
  expect(period.periodEnd.toISOString()).toBe('2026-05-01T00:00:00.000Z');
});

test('getOrgAiQueryLimit respects unlimited subscription', () => {
  expect(getOrgAiQueryLimit({ aiQueryLimit: 0 })).toBe(0);
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

    expect(Object.hasOwn(capturedUpdate.$setOnInsert, 'usageCount')).toBe(
      false
    );
    expect(capturedUpdate.$inc.usageCount).toBe(1);
  } finally {
    UsageRecord.findOneAndUpdate = originalFindOneAndUpdate;
  }
});
