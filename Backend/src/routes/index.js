import { Router } from 'express';

import { authRouter } from './auth.routes.js';
import { credentialRouter } from '../ingestion/routes/credential.routes.js';
import { webhookRouter } from '../ingestion/routes/webhook.routes.js';
import {
  organisationRouter,
  publicOrganisationRouter,
} from './organisation.routes.js';
import { oauthRouter } from './oauth.routes.js';
import { graphRouter } from '../graph/routes/graph.routes.js';
import { aiRouter } from '../ai/routes/ai.routes.js';
import { notificationRouter } from '../notifications/routes/notification.routes.js';
import { billingRouter } from '../billing/index.js';

const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/auth/oauth', oauthRouter);
apiRouter.use('/organisations', publicOrganisationRouter);
apiRouter.use('/organisations', organisationRouter);
apiRouter.use('/credentials', credentialRouter);
apiRouter.use('/webhooks', webhookRouter);
apiRouter.use('/graph', graphRouter);
apiRouter.use('/ai', aiRouter);
apiRouter.use('/notifications', notificationRouter);
apiRouter.use('/billing', billingRouter);

export { apiRouter };
