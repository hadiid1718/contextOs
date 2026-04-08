import { Router } from 'express';

import {
  acceptInvitation,
  createOrganisation,
  declineInvitation,
  deleteOrganisation,
  getOrganisation,
  inviteMember,
  listOrganisationMembers,
  listOrganisations,
  selectOrganisationContext,
  updateMemberRole,
  updateOrganisation,
} from '../controllers/organisation.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  requireOrganisationAccess,
  requireOrganisationContext,
  requireOrganisationMembership,
  requireOrganisationRole,
} from '../middleware/organisation.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createOrganisationSchema,
  getOrganisationSchema,
  invitationActionSchema,
  inviteMemberSchema,
  listOrganisationMembersSchema,
  selectOrganisationContextSchema,
  updateMemberRoleSchema,
  updateOrganisationSchema,
} from '../validators/organisation.schemas.js';

const publicOrganisationRouter = Router();
const organisationRouter = Router();

publicOrganisationRouter.post(
  '/:orgId/invitations/:token/accept',
  validate(invitationActionSchema),
  acceptInvitation
);

publicOrganisationRouter.post(
  '/:orgId/invitations/:token/decline',
  validate(invitationActionSchema),
  declineInvitation
);

organisationRouter.use(requireAuth);

organisationRouter.get('/', listOrganisations);
organisationRouter.post(
  '/',
  validate(createOrganisationSchema),
  createOrganisation
);

organisationRouter.get(
  '/:orgId',
  validate(getOrganisationSchema),
  requireOrganisationMembership('viewer'),
  getOrganisation
);

organisationRouter.patch(
  '/:orgId',
  validate(updateOrganisationSchema),
  requireOrganisationMembership('admin'),
  updateOrganisation
);

organisationRouter.delete(
  '/:orgId',
  validate(getOrganisationSchema),
  requireOrganisationMembership('owner'),
  deleteOrganisation
);

organisationRouter.post(
  '/:orgId/context',
  validate(selectOrganisationContextSchema),
  requireOrganisationAccess('viewer'),
  selectOrganisationContext
);

organisationRouter.get(
  '/:orgId/memberships',
  validate(listOrganisationMembersSchema),
  requireOrganisationMembership('viewer'),
  listOrganisationMembers
);

organisationRouter.patch(
  '/:orgId/memberships/:memberId',
  validate(updateMemberRoleSchema),
  requireOrganisationMembership('admin'),
  updateMemberRole
);

organisationRouter.post(
  '/:orgId/invitations',
  validate(inviteMemberSchema),
  requireOrganisationContext,
  requireOrganisationRole('admin'),
  inviteMember
);

export { organisationRouter, publicOrganisationRouter };
