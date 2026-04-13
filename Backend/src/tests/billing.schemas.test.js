import { test, expect } from '@jest/globals';

import {
  buildPeriodWindow,
  getOrgAiQueryLimit,
} from '../billing/services/usage.service.js';
import {
  checkoutSchema,
  portalSchema,
  usageTrackSchema,
} from '../billing/validators/billing.schemas.js';

test('checkout schema parses payload', () => {
  const result = checkoutSchema.parse({
    body: {
      org_id: 'org-1',
      user_email: 'user@example.com',
      seats: 3,
    },
  });

  expect(result.body.org_id).toBe('org-1');
  expect(result.body.seats).toBe(3);
});

test('portal schema requires org_id', () => {
  const result = portalSchema.parse({ body: { org_id: 'org-1' } });
  expect(result.body.org_id).toBe('org-1');
});

test('usage schema defaults units to 1', () => {
  const result = usageTrackSchema.parse({ body: { org_id: 'org-1' } });
  expect(result.body.units).toBe(1);
});

test('usage helpers calculate current period and limit', () => {
  const period = buildPeriodWindow(new Date('2026-04-10T12:00:00Z'));
  expect(period.periodKey).toBe('2026-04');
  expect(getOrgAiQueryLimit({ aiQueryLimit: 500 })).toBe(500);
});
