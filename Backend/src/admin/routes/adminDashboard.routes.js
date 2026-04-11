import { Router } from 'express';

import { validate } from '../../middleware/validate.middleware.js';
import {
  getAlerts,
  getGoldenSignals,
  getKafkaLag,
  getLogs,
  getOrgRateLimits,
  getPods,
  getRedisStats,
  getServiceHealth,
} from '../controllers/adminDashboard.controller.js';
import { requireSuperadmin } from '../middleware/requireSuperadmin.middleware.js';
import { adminLogsQuerySchema } from '../validators/adminDashboard.schemas.js';

const adminDashboardRouter = Router();

adminDashboardRouter.use(requireSuperadmin);

adminDashboardRouter.get('/golden-signals', getGoldenSignals);
adminDashboardRouter.get('/service-health', getServiceHealth);
adminDashboardRouter.get('/orgs/rate-limits', getOrgRateLimits);
adminDashboardRouter.get('/kafka/lag', getKafkaLag);
adminDashboardRouter.get('/redis/stats', getRedisStats);
adminDashboardRouter.get('/logs', validate(adminLogsQuerySchema), getLogs);
adminDashboardRouter.get('/pods', getPods);
adminDashboardRouter.get('/alerts', getAlerts);

export { adminDashboardRouter };
