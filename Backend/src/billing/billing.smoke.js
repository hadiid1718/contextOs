import { buildPeriodWindow } from './services/usage.service.js';
import { checkoutSchema, portalSchema } from './validators/billing.schemas.js';

const checkout = checkoutSchema.parse({
  body: {
    org_id: 'org_smoke',
    user_email: 'test@example.com',
    seats: 2,
  },
});

const portal = portalSchema.parse({
  body: {
    org_id: 'org_smoke',
  },
});

const period = buildPeriodWindow();

console.log('Billing smoke passed', {
  checkout: checkout.body.org_id,
  portal: portal.body.org_id,
  periodKey: period.periodKey,
});
