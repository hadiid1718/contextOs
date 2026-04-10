import { Router } from 'express';

import {
  getCredentialByProvider,
  listCredentials,
  removeCredential,
  upsertCredential,
} from '../controllers/credential.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireOrganisationMembership } from '../../middleware/organisation.middleware.js';
import { requireIngestionEnabled } from '../middleware/requestContext.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  credentialProviderParamSchema,
  upsertCredentialSchema,
} from '../validators/credential.schemas.js';

const credentialRouter = Router();

credentialRouter.use(requireIngestionEnabled);
credentialRouter.use(requireAuth);
credentialRouter.use(requireOrganisationMembership('admin'));

credentialRouter.get('/', listCredentials);
credentialRouter.get(
  '/:provider',
  validate(credentialProviderParamSchema),
  getCredentialByProvider
);
credentialRouter.put(
  '/:provider',
  validate(upsertCredentialSchema),
  upsertCredential
);
credentialRouter.delete(
  '/:provider',
  validate(credentialProviderParamSchema),
  removeCredential
);

export { credentialRouter };
