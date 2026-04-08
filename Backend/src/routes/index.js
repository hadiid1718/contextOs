import { Router } from 'express';

import { authRouter } from './auth.routes.js';
import {
  organisationRouter,
  publicOrganisationRouter,
} from './organisation.routes.js';
import { oauthRouter } from './oauth.routes.js';
import { requestContext } from '../ingestion/middleware/requestContext.middleware.js';
import { credentialRouter } from '../ingestion/routes/credential.routes.js';
import { webhookRouter } from '../ingestion/routes/webhook.routes.js';

const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/auth/oauth', oauthRouter);
apiRouter.use('/organisations', publicOrganisationRouter);
apiRouter.use('/organisations', organisationRouter);
apiRouter.use('/webhooks', requestContext, webhookRouter);
apiRouter.use('/credentials', credentialRouter);

export { apiRouter }; 
