import { env } from '../../config/env.js';
import { UsageRecord } from '../models/UsageRecord.js';
import { getOrCreateSubscriptionForOrg } from './subscription.service.js';

export const buildPeriodWindow = (date = new Date()) => {
  const periodStart = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)
  );
  const periodEnd = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)
  );
  const periodKey = `${date.getUTCFullYear()}-${String(
    date.getUTCMonth() + 1
  ).padStart(2, '0')}`;

  return { periodStart, periodEnd, periodKey };
};

export const getOrgAiQueryLimit = subscription => {
  if (!subscription) {
    return env.freeAiQueryLimit;
  }

  if (subscription.aiQueryLimit === 0) {
    return 0;
  }

  return subscription.aiQueryLimit;
};

export const loadSubscriptionForOrg = async orgId =>
  getOrCreateSubscriptionForOrg(orgId);

export const getOrCreateUsageRecord = async (orgId, date = new Date()) => {
  const { periodStart, periodEnd, periodKey } = buildPeriodWindow(date);
  const existing = await UsageRecord.findOne({ org_id: orgId, periodKey });

  if (existing) {
    return existing;
  }

  return UsageRecord.create({
    org_id: orgId,
    periodKey,
    periodStart,
    periodEnd,
    usageCount: 0,
  });
};

export const incrementUsageRecord = async ({
  orgId,
  units = 1,
  date = new Date(),
}) => {
  const { periodStart, periodEnd, periodKey } = buildPeriodWindow(date);

  return UsageRecord.findOneAndUpdate(
    { org_id: orgId, periodKey },
    {
      $setOnInsert: {
        periodStart,
        periodEnd,
      },
      $inc: { usageCount: units },
      $set: { lastIncrementAt: new Date() },
    },
    { upsert: true, new: true }
  );
};

export const getUsageSummary = async orgId => {
  const subscription = await loadSubscriptionForOrg(orgId);
  const { periodKey, periodStart, periodEnd } = buildPeriodWindow();
  const record = await UsageRecord.findOne({ org_id: orgId, periodKey });

  return {
    subscription,
    periodKey,
    periodStart: record?.periodStart || periodStart,
    periodEnd: record?.periodEnd || periodEnd,
    usageCount: record?.usageCount || 0,
    limit: getOrgAiQueryLimit(subscription),
  };
};
