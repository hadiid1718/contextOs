import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import { Invitation } from '../models/Invitation.js';
import { Membership } from '../models/Membership.js';
import { Organisation } from '../models/Organisation.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { User } from '../models/User.js';
import { emitNotificationSafely } from '../notifications/services/notificationPublisher.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/appError.js';
import { setAuthCookies } from '../utils/cookie.js';
import { hashToken } from '../utils/hash.js';
import { sendMail } from '../utils/mailer.js';
import {
  generateAccessToken,
  generateRefreshToken,
  generateTokenId,
} from '../utils/token.js';

const roleWeight = {
  viewer: 1,
  member: 2,
  admin: 3,
  owner: 4,
};

const refreshExpiryDate = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const invitationExpiryDate = () => new Date(Date.now() + 48 * 60 * 60 * 1000);

const slugifyOrganisation = value =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

const normaliseEmail = value => value.trim().toLowerCase();

const buildAuthPayload = (user, orgId = null) => {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
  };

  if (orgId) {
    payload.org_id = orgId;
  }

  return payload;
};

const issueOrganisationTokens = async (user, orgId) => {
  const tokenId = generateTokenId();
  const payload = buildAuthPayload(user, orgId);

  const accessToken = generateAccessToken({
    ...payload,
    type: 'access',
  });

  const refreshToken = generateRefreshToken({
    ...payload,
    type: 'refresh',
    tid: tokenId,
  });

  await RefreshToken.create({
    user: user.id,
    tokenHash: hashToken(refreshToken),
    tokenId,
    expiresAt: refreshExpiryDate(),
  });

  return {
    accessToken,
    refreshToken,
  };
};

const buildInvitationToken = ({ orgId, email, role, tokenId }) =>
  jwt.sign(
    {
      type: 'organisation-invitation',
      org_id: orgId,
      email,
      role,
    },
    env.orgInvitationSecret,
    {
      expiresIn: env.orgInvitationExpiresIn,
      jwtid: tokenId,
    }
  );

const ensureOrganisationExists = async orgId => {
  const organisation = await Organisation.findOne({ org_id: orgId });

  if (!organisation) {
    throw new AppError('Organisation not found', 404);
  }

  return organisation;
};

const ensureRequestedOrgMatchesContext = (req, organisation) => {
  if (req.orgId && req.orgId !== organisation.org_id) {
    throw new AppError(
      'Organisation context does not match the request path',
      400
    );
  }
};

const ensureMembership = async (orgId, userId) => {
  const membership = await Membership.findOne({
    org_id: orgId,
    user: userId,
    status: 'active',
  });

  if (!membership) {
    throw new AppError('Organisation membership required', 403);
  }

  return membership;
};

const canAssignRole = (actorRole, targetRole) => {
  if (actorRole === 'owner') {
    return true;
  }

  if (actorRole === 'admin') {
    return ['member', 'viewer'].includes(targetRole);
  }

  return false;
};

export const createOrganisation = asyncHandler(async (req, res) => {
  const { name, slug, description } = req.body;

  const user = await User.findById(req.auth.sub);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const organisationSlug =
    slug || slugifyOrganisation(name) || `org-${Date.now()}`;

  let organisation;
  try {
    organisation = await Organisation.create({
      name,
      slug: organisationSlug,
      description,
      ownerId: user.id,
    });
  } catch (error) {
    if (error?.code === 11000) {
      throw new AppError('Organisation slug already exists', 409);
    }

    throw error;
  }

  const membership = await Membership.create({
    org_id: organisation.org_id,
    user: user.id,
    email: user.email,
    role: 'owner',
    status: 'active',
    invitedBy: user.id,
    joinedAt: new Date(),
  });

  const { accessToken, refreshToken } = await issueOrganisationTokens(
    user,
    organisation.org_id
  );

  setAuthCookies(res, accessToken, refreshToken);

  res.status(201).json({
    message: 'Organisation created successfully',
    organisation,
    membership,
    accessToken,
  });
});

export const listOrganisations = asyncHandler(async (req, res) => {
  const memberships = await Membership.find({
    user: req.auth.sub,
    status: 'active',
  }).lean();

  const orgIds = memberships.map(membership => membership.org_id);

  if (orgIds.length === 0) {
    return res.status(200).json({ organisations: [] });
  }

  const organisations = await Organisation.find({
    org_id: { $in: orgIds },
  }).lean();

  const membershipByOrgId = new Map(
    memberships.map(membership => [membership.org_id, membership])
  );

  res.status(200).json({
    organisations: organisations.map(organisation => ({
      ...organisation,
      role: membershipByOrgId.get(organisation.org_id)?.role || null,
    })),
  });
});

export const getOrganisation = asyncHandler(async (req, res) => {
  const organisation = await ensureOrganisationExists(req.params.orgId);
  ensureRequestedOrgMatchesContext(req, organisation);
  const membership = await ensureMembership(organisation.org_id, req.auth.sub);

  res.status(200).json({
    organisation,
    membership,
  });
});

export const updateOrganisation = asyncHandler(async (req, res) => {
  const organisation = await ensureOrganisationExists(req.params.orgId);
  ensureRequestedOrgMatchesContext(req, organisation);
  const actorMembership = await ensureMembership(
    organisation.org_id,
    req.auth.sub
  );

  if (roleWeight[actorMembership.role] < roleWeight.admin) {
    throw new AppError('Insufficient organisation permissions', 403);
  }

  const update = {};
  if (req.body.name !== undefined) update.name = req.body.name;
  if (req.body.slug !== undefined) update.slug = req.body.slug;
  if (req.body.description !== undefined)
    update.description = req.body.description;
  if (req.body.status !== undefined) update.status = req.body.status;

  try {
    const updatedOrganisation = await Organisation.findOneAndUpdate(
      { org_id: organisation.org_id },
      { $set: update },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      message: 'Organisation updated successfully',
      organisation: updatedOrganisation,
    });
  } catch (error) {
    if (error?.code === 11000) {
      throw new AppError('Organisation slug already exists', 409);
    }

    throw error;
  }
});

export const deleteOrganisation = asyncHandler(async (req, res) => {
  const organisation = await ensureOrganisationExists(req.params.orgId);
  ensureRequestedOrgMatchesContext(req, organisation);
  const actorMembership = await ensureMembership(
    organisation.org_id,
    req.auth.sub
  );

  if (actorMembership.role !== 'owner') {
    throw new AppError('Only owners can delete an organisation', 403);
  }

  await Promise.all([
    Membership.deleteMany({ org_id: organisation.org_id }),
    Invitation.deleteMany({ org_id: organisation.org_id }),
    Organisation.deleteOne({ org_id: organisation.org_id }),
  ]);

  res.status(200).json({
    message: 'Organisation deleted successfully',
  });
});

export const selectOrganisationContext = asyncHandler(async (req, res) => {
  const organisation = await ensureOrganisationExists(req.params.orgId);
  const membership = await ensureMembership(organisation.org_id, req.auth.sub);
  const user = await User.findById(req.auth.sub);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const { accessToken, refreshToken } = await issueOrganisationTokens(
    user,
    organisation.org_id
  );

  setAuthCookies(res, accessToken, refreshToken);

  res.status(200).json({
    message: 'Organisation context activated',
    organisation,
    membership,
    accessToken,
  });
});

export const inviteMember = asyncHandler(async (req, res) => {
  const organisation = await ensureOrganisationExists(req.params.orgId);
  ensureRequestedOrgMatchesContext(req, organisation);
  const actorMembership =
    req.organisationMembership ||
    (await ensureMembership(organisation.org_id, req.auth.sub));

  if (!canAssignRole(actorMembership.role, req.body.role)) {
    throw new AppError('Insufficient organisation permissions', 403);
  }

  const email = normaliseEmail(req.body.email);

  const existingMembership = await Membership.findOne({
    org_id: organisation.org_id,
    email,
    status: 'active',
  });

  if (existingMembership) {
    throw new AppError('User is already a member of this organisation', 409);
  }

  await Invitation.deleteMany({
    org_id: organisation.org_id,
    email,
    status: 'pending',
  });

  const tokenId = generateTokenId();
  const invitationToken = buildInvitationToken({
    orgId: organisation.org_id,
    email,
    role: req.body.role,
    tokenId,
  });

  const invitation = await Invitation.create({
    org_id: organisation.org_id,
    email,
    role: req.body.role,
    invitedBy: req.auth.sub,
    tokenId,
    tokenHash: hashToken(invitationToken),
    status: 'pending',
    expiresAt: invitationExpiryDate(),
  });

  const invitationUrl = `${env.apiBaseUrl}/api/v1/organisations/${organisation.org_id}/invitations/${invitationToken}/accept`;

  await sendMail({
    to: email,
    subject: `You have been invited to ${organisation.name}`,
    text:
      `You were invited to join ${organisation.name} as ${req.body.role}. ` +
      `Use this invitation token to accept: ${invitationToken}. ` +
      `API endpoint: POST ${invitationUrl}`,
    html: `<p>You were invited to join <strong>${organisation.name}</strong> as <strong>${req.body.role}</strong>.</p><p>Use this invitation token to accept:</p><pre>${invitationToken}</pre><p>API endpoint: <a href="${invitationUrl}">${invitationUrl}</a></p>`,
  });

  res.status(201).json({
    message: 'Invitation created successfully',
    invitation,
    invitationToken,
    invitationUrl,
  });
});

export const listOrganisationMembers = asyncHandler(async (req, res) => {
  const organisation = await ensureOrganisationExists(req.params.orgId);
  ensureRequestedOrgMatchesContext(req, organisation);
  await ensureMembership(organisation.org_id, req.auth.sub);

  const memberships = await Membership.find({
    org_id: organisation.org_id,
    status: 'active',
  })
    .populate('user', 'name email role emailVerified lastLoginAt')
    .sort({ role: -1, createdAt: 1 });

  res.status(200).json({
    memberships,
  });
});

export const updateMemberRole = asyncHandler(async (req, res) => {
  const organisation = await ensureOrganisationExists(req.params.orgId);
  ensureRequestedOrgMatchesContext(req, organisation);
  const actorMembership =
    req.organisationMembership ||
    (await ensureMembership(organisation.org_id, req.auth.sub));

  const targetMembership = await Membership.findOne({
    org_id: organisation.org_id,
    user: req.params.memberId,
    status: 'active',
  });

  if (!targetMembership) {
    throw new AppError('Organisation member not found', 404);
  }

  if (!canAssignRole(actorMembership.role, req.body.role)) {
    throw new AppError('Insufficient organisation permissions', 403);
  }

  if (targetMembership.role === 'owner' && actorMembership.role !== 'owner') {
    throw new AppError('Only owners can modify owner roles', 403);
  }

  if (
    targetMembership.user.toString() === req.auth.sub &&
    targetMembership.role === 'owner' &&
    req.body.role !== 'owner'
  ) {
    throw new AppError(
      'The organisation owner role cannot be removed here',
      400
    );
  }

  const previousRole = targetMembership.role;
  targetMembership.role = req.body.role;
  await targetMembership.save();

  void emitNotificationSafely({
    user_id: targetMembership.user.toString(),
    org_id: organisation.org_id,
    type: 'MEMBER_ROLE_CHANGED',
    message: `Your role in ${organisation.name} changed from ${previousRole} to ${req.body.role}.`,
  });

  if (req.auth.sub !== targetMembership.user.toString()) {
    void emitNotificationSafely({
      user_id: req.auth.sub,
      org_id: organisation.org_id,
      type: 'MEMBER_ROLE_UPDATED',
      message: `You changed ${targetMembership.email}'s role from ${previousRole} to ${req.body.role} in ${organisation.name}.`,
    });
  }

  res.status(200).json({
    message: 'Member role updated successfully',
    membership: targetMembership,
  });
});

const handleInvitationAction = async (req, res, action) => {
  const { orgId, token } = req.params;
  const organisation = await ensureOrganisationExists(orgId);
  const decodedToken = jwt.verify(token, env.orgInvitationSecret);

  if (decodedToken.type !== 'organisation-invitation') {
    throw new AppError('Invalid invitation token', 400);
  }

  if (decodedToken.org_id !== organisation.org_id) {
    throw new AppError('Invitation token does not match the organisation', 400);
  }

  const user = req.auth?.sub
    ? await User.findById(req.auth.sub)
    : await User.findOne({ email: normaliseEmail(decodedToken.email) });

  if (!user) {
    if (action === 'accept') {
      throw new AppError(
        'No user account exists for the invited email address',
        404
      );
    }

    throw new AppError('User not found', 404);
  }

  if (normaliseEmail(user.email) !== normaliseEmail(decodedToken.email)) {
    throw new AppError(
      'Invitation can only be used by the invited email address',
      403
    );
  }

  const invitation = await Invitation.findOne({
    org_id: organisation.org_id,
    tokenHash: hashToken(token),
    status: 'pending',
  });

  if (!invitation) {
    throw new AppError('Invitation not found or already processed', 404);
  }

  if (invitation.expiresAt < new Date()) {
    invitation.status = 'revoked';
    await invitation.save();
    throw new AppError('Invitation token is expired', 400);
  }

  if (action === 'accept') {
    const existingMembership = await Membership.findOne({
      org_id: organisation.org_id,
      user: user.id,
    });

    if (!existingMembership) {
      await Membership.create({
        org_id: organisation.org_id,
        user: user.id,
        email: user.email,
        role: invitation.role,
        status: 'active',
        invitedBy: invitation.invitedBy,
        joinedAt: new Date(),
      });
    }

    invitation.status = 'accepted';
    invitation.respondedAt = new Date();
    invitation.acceptedBy = user.id;
    await invitation.save();

    void emitNotificationSafely({
      user_id: user.id.toString(),
      org_id: organisation.org_id,
      type: 'INVITATION_ACCEPTED',
      message: `You joined ${organisation.name} as ${invitation.role}.`,
    });

    if (
      invitation.invitedBy?.toString() &&
      invitation.invitedBy.toString() !== user.id.toString()
    ) {
      void emitNotificationSafely({
        user_id: invitation.invitedBy.toString(),
        org_id: organisation.org_id,
        type: 'INVITATION_ACCEPTED',
        message: `${user.email} accepted the invitation to join ${organisation.name} as ${invitation.role}.`,
      });
    }

    const { accessToken, refreshToken } = await issueOrganisationTokens(
      user,
      organisation.org_id
    );

    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json({
      message: 'Invitation accepted successfully',
      organisation,
      accessToken,
    });
  }

  invitation.status = 'declined';
  invitation.respondedAt = new Date();
  await invitation.save();

  return res.status(200).json({
    message: 'Invitation declined successfully',
  });
};

export const acceptInvitation = asyncHandler(async (req, res) =>
  handleInvitationAction(req, res, 'accept')
);

export const declineInvitation = asyncHandler(async (req, res) =>
  handleInvitationAction(req, res, 'decline')
);
