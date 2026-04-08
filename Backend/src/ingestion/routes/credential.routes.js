import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireOrganisationMembership } from '../../middleware/organisation.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  disableIntegrationCredential,
  getIntegrationCredential,
  listIntegrationCredentials,
  upsertIntegrationCredential,
} from '../controllers/credential.controller.js';
import {
  providerParamSchema,
  upsertCredentialSchema,
} from '../validators/credential.schemas.js';

const credentialRouter = Router();

credentialRouter.use(requireAuth, requireOrganisationMembership('admin'));

credentialRouter.get('/', listIntegrationCredentials);
credentialRouter.get(
  '/:provider',
  validate(providerParamSchema),
  getIntegrationCredential
);
credentialRouter.put(
  '/:provider',
  validate(upsertCredentialSchema),
  upsertIntegrationCredential
);
credentialRouter.delete(
  '/:provider',
  validate(providerParamSchema),
  disableIntegrationCredential
);

export { credentialRouter };

