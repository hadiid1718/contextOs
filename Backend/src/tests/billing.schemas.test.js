import test from 'node:test';
import assert from 'node:assert/strict';

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

  assert.equal(result.body.org_id, 'org-1');
  assert.equal(result.body.seats, 3);
});

test('portal schema requires org_id', () => {
  const result = portalSchema.parse({ body: { org_id: 'org-1' } });
  assert.equal(result.body.org_id, 'org-1');
});

test('usage schema defaults units to 1', () => {
  const result = usageTrackSchema.parse({ body: { org_id: 'org-1' } });
  assert.equal(result.body.units, 1);
});

test('usage helpers calculate current period and limit', () => {
  const period = buildPeriodWindow(new Date('2026-04-10T12:00:00Z'));
  assert.equal(period.periodKey, '2026-04');
  assert.equal(getOrgAiQueryLimit({ aiQueryLimit: 500 }), 500);
});
