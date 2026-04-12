import { asyncHandler } from '../../utils/asyncHandler.js';
import { writeAdminAuditLog } from '../services/adminAudit.service.js';
import {
  getAlertsData,
  getGoldenSignalsData,
  getKafkaLagData,
  getLogsData,
  getOrgRateLimitsData,
  getPodsData,
  getRedisStatsData,
  getServiceHealthData,
} from '../services/adminDashboardData.service.js';

const auditView = (req, meta) =>
  writeAdminAuditLog({
    adminId: req.adminUser.sub,
    action: 'view_dashboard',
    req,
    meta,
  });

export const getGoldenSignals = asyncHandler(async (req, res) => {
  const data = await getGoldenSignalsData();
  await auditView(req, { panel: 'golden-signals' });
  res.status(200).json(data);
});

export const getServiceHealth = asyncHandler(async (req, res) => {
  const data = await getServiceHealthData();
  await auditView(req, { panel: 'service-health' });
  res.status(200).json(data);
});

export const getOrgRateLimits = asyncHandler(async (req, res) => {
  const data = await getOrgRateLimitsData();
  await auditView(req, { panel: 'org-rate-limits' });
  res.status(200).json(data);
});

export const getKafkaLag = asyncHandler(async (req, res) => {
  const data = await getKafkaLagData();
  await auditView(req, { panel: 'kafka-lag' });
  res.status(200).json(data);
});

export const getRedisStats = asyncHandler(async (req, res) => {
  const data = await getRedisStatsData();
  await auditView(req, { panel: 'redis-stats' });
  res.status(200).json(data);
});

export const getLogs = asyncHandler(async (req, res) => {
  const data = await getLogsData({
    q: req.query.q,
    limit: req.query.limit,
    offset: req.query.offset,
  });

  await writeAdminAuditLog({
    adminId: req.adminUser.sub,
    action: 'export_logs',
    req,
    meta: {
      q: req.query.q || '',
      limit: req.query.limit,
      offset: req.query.offset,
    },
  });

  res.status(200).json(data);
});

export const getPods = asyncHandler(async (req, res) => {
  const data = await getPodsData();
  await auditView(req, { panel: 'pods' });
  res.status(200).json(data);
});

export const getAlerts = asyncHandler(async (req, res) => {
  const data = await getAlertsData();
  await auditView(req, { panel: 'alerts' });
  res.status(200).json(data);
});
