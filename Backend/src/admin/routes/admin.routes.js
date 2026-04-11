import { Router } from 'express';

import { adminAuthRouter } from './adminAuth.routes.js';
import { adminDashboardRouter } from './adminDashboard.routes.js';

const adminRouter = Router();

adminRouter.use('/auth', adminAuthRouter);
adminRouter.use('/', adminDashboardRouter);

export { adminRouter };
