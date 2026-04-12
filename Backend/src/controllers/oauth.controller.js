import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/appError.js';
import { setAuthCookies } from '../utils/cookie.js';
import { env } from '../config/env.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { Membership } from '../models/Membership.js';
import { saveIntegrationCredential } from '../ingestion/services/integrationCredential.service.js';
import {
  generateAccessToken,
  generateRefreshToken,
  generateTokenId,
} from '../utils/token.js';
import { hashToken } from '../utils/hash.js';

const refreshExpiryDate = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

const resolveOAuthOrgId = async (req, userId) => {
  const orgIdFromState =
    typeof req.query?.state === 'string' && req.query.state.trim()
      ? req.query.state.trim()
      : null;

  if (orgIdFromState) {
    return orgIdFromState;
  }

  const membership = await Membership.findOne({
    user: userId,
    status: 'active',
  }).sort({ createdAt: 1 });

  return membership?.org_id || null;
};

export const oauthCallbackSuccess = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) {
    throw new AppError('OAuth authentication failed', 401);
  }

  const tokenId = generateTokenId();

  const accessToken = generateAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    type: 'access',
  });

  const refreshToken = generateRefreshToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    type: 'refresh',
    tid: tokenId,
  });

  await RefreshToken.create({
    user: user.id,
    tokenId,
    tokenHash: hashToken(refreshToken),
    expiresAt: refreshExpiryDate(),
  });

  const authInfo = req.authInfo || {};
  if (authInfo.provider === 'github' && authInfo.accessToken) {
    const orgId = await resolveOAuthOrgId(req, user.id);

    if (orgId) {
      await saveIntegrationCredential({
        orgId,
        provider: 'github',
        accountName: authInfo.accountName || user.email || 'GitHub account',
        credentials: {
          accessToken: authInfo.accessToken,
        },
        externalId: authInfo.externalId || null,
        status: 'active',
        scopes: Array.isArray(authInfo.scopes) ? authInfo.scopes : [],
        metadata: {
          connectedVia: 'oauth',
        },
        createdBy: user.id,
        updatedBy: user.id,
      });
    }
  }

  setAuthCookies(res, accessToken, refreshToken);
  res.redirect(env.oauthSuccessRedirect);
});

export const oauthCallbackFailure = (_req, res) => {
  res.redirect(env.oauthFailureRedirect);
};
