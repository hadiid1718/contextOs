import { Router } from 'express';

import { authRouter } from './auth.routes.js';
import {
  organisationRouter,
  publicOrganisationRouter,
} from './organisation.routes.js';
import { oauthRouter } from './oauth.routes.js';

const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/auth/oauth', oauthRouter);
apiRouter.use('/organisations', publicOrganisationRouter);
apiRouter.use('/organisations', organisationRouter);

export { apiRouter };
