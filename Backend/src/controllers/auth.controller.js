import { env } from '../config/env.js';
import { PasswordResetToken } from '../models/PasswordResetToken.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { User } from '../models/User.js';
import { VerificationToken } from '../models/VerificationToken.js';
import { AppError } from '../utils/appError.js';
import { clearAuthCookies, setAuthCookies } from '../utils/cookie.js';
import { hashToken } from '../utils/hash.js';
import { sendMail } from '../utils/mailer.js';
import logger from '../config/loggers.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  generateAccessToken,
  generateRandomToken,
  generateRefreshToken,
  generateTokenId,
  verifyRefreshToken,
} from '../utils/token.js';

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

const refreshExpiryDate = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const verificationExpiryDate = () => new Date(Date.now() + 24 * 60 * 60 * 1000);
const passwordResetExpiryDate = () => new Date(Date.now() + 60 * 60 * 1000);

const issueAuthTokens = async (
  user,
  previousRefreshTokenDoc = null,
  orgId = null
) => {
  const tokenId = generateTokenId();
  const accessToken = generateAccessToken({
    ...buildAuthPayload(user, orgId),
    type: 'access',
  });

  const refreshToken = generateRefreshToken({
    ...buildAuthPayload(user, orgId),
    type: 'refresh',
    tid: tokenId,
  });

  await RefreshToken.create({
    user: user.id,
    tokenHash: hashToken(refreshToken),
    tokenId,
    expiresAt: refreshExpiryDate(),
  });

  if (previousRefreshTokenDoc) {
    previousRefreshTokenDoc.revokedAt = new Date();
    previousRefreshTokenDoc.replacedByTokenId = tokenId;
    await previousRefreshTokenDoc.save();
  }

  return { accessToken, refreshToken };
};

const sendVerificationEmail = async user => {
  await VerificationToken.deleteMany({ user: user.id });

  const rawToken = generateRandomToken();
  await VerificationToken.create({
    user: user.id,
    tokenHash: hashToken(rawToken),
    expiresAt: verificationExpiryDate(),
  });

  const verificationUrl = `${env.apiBaseUrl}/api/v1/auth/verify-email/${rawToken}`;
  await sendMail({
    to: user.email,
    subject: 'Verify your ContextOS account',
    text: `Verify your email by visiting: ${verificationUrl}`,
    html: `<p>Verify your email by clicking <a href="${verificationUrl}">this link</a>.</p>`,
  });
};

const sendPasswordResetEmail = async user => {
  await PasswordResetToken.deleteMany({ user: user.id });

  const rawToken = generateRandomToken();
  await PasswordResetToken.create({
    user: user.id,
    tokenHash: hashToken(rawToken),
    expiresAt: passwordResetExpiryDate(),
  });

  const resetUrl = `${env.appOrigin}/reset-password?token=${rawToken}`;
  await sendMail({
    to: user.email,
    subject: 'Reset your ContextOS password',
    text: `Reset your password by visiting: ${resetUrl}`,
    html: `<p>Reset your password by clicking <a href="${resetUrl}">this link</a>.</p>`,
  });
};

const buildAuthResponse = user => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  emailVerified: user.emailVerified,
  organizations: user.organizations,
});

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, organizationId } = req.body;

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new AppError('Email is already in use', 409);
  }

  const organizations = organizationId
    ? [{ orgId: organizationId, role: role || 'member' }]
    : [];

  const user = await User.create({
    name,
    email,
    password,
    role: role || 'member',
    organizations,
  });

  try {
    await sendVerificationEmail(user);
  } catch (error) {
    // Registration should still succeed even if mail delivery is temporarily down.
    logger.warn(
      `Verification email failed for ${user.email}: ${error.message}`
    );
  }

  const { accessToken, refreshToken } = await issueAuthTokens(user);
  setAuthCookies(res, accessToken, refreshToken);

  res.status(201).json({
    message: 'User registered successfully',
    user: buildAuthResponse(user),
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select(
    '+password'
  );
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }

  if (!user.emailVerified) {
    throw new AppError('Email is not verified', 403);
  }

  user.lastLoginAt = new Date();
  await user.save();

  const { accessToken, refreshToken } = await issueAuthTokens(user);
  setAuthCookies(res, accessToken, refreshToken);

  res.status(200).json({
    message: 'Login successful',
    user: buildAuthResponse(user),
  });
});

export const refresh = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.[env.refreshCookieName];
  if (!incomingRefreshToken) {
    throw new AppError('Refresh token is required', 401);
  }

  let payload;
  try {
    payload = verifyRefreshToken(incomingRefreshToken);
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  if (payload.type !== 'refresh') {
    throw new AppError('Invalid refresh token', 401);
  }

  const existingTokenDoc = await RefreshToken.findOne({
    tokenHash: hashToken(incomingRefreshToken),
  }).populate('user');

  if (
    !existingTokenDoc ||
    existingTokenDoc.revokedAt ||
    existingTokenDoc.expiresAt < new Date()
  ) {
    throw new AppError('Refresh token is no longer valid', 401);
  }

  const user = existingTokenDoc.user;
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const orgId = payload.org_id || null;
  const { accessToken, refreshToken } = await issueAuthTokens(
    user,
    existingTokenDoc,
    orgId
  );
  setAuthCookies(res, accessToken, refreshToken);

  res.status(200).json({
    message: 'Token refreshed successfully',
    user: buildAuthResponse(user),
  });
});

export const logout = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.[env.refreshCookieName];

  if (incomingRefreshToken) {
    const tokenHash = hashToken(incomingRefreshToken);
    const tokenDoc = await RefreshToken.findOne({ tokenHash });

    if (tokenDoc && !tokenDoc.revokedAt) {
      tokenDoc.revokedAt = new Date();
      await tokenDoc.save();
    }
  }

  clearAuthCookies(res);
  res.status(200).json({ message: 'Logged out successfully' });
});

export const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.auth.sub);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.status(200).json({ user: buildAuthResponse(user) });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const tokenHash = hashToken(req.params.token);
  const verificationToken = await VerificationToken.findOne({
    tokenHash,
    expiresAt: { $gt: new Date() },
  });

  if (!verificationToken) {
    throw new AppError('Verification token is invalid or expired', 400);
  }

  const user = await User.findById(verificationToken.user);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  user.emailVerified = true;
  await user.save();

  await VerificationToken.deleteMany({ user: user.id });

  res.status(200).json({ message: 'Email verified successfully' });
});

export const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });
  if (user && !user.emailVerified) {
    try {
      await sendVerificationEmail(user);
    } catch (error) {
      logger.warn(
        `Verification resend failed for ${user.email}: ${error.message}`
      );
    }
  }

  res.status(200).json({
    message:
      'If the account exists and is unverified, a verification email has been sent',
  });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });
  if (user) {
    try {
      await sendPasswordResetEmail(user);
    } catch (error) {
      logger.warn(
        `Password reset email failed for ${user.email}: ${error.message}`
      );
    }
  }

  res.status(200).json({
    message: 'If the account exists, a password reset email has been sent',
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  const tokenHash = hashToken(token);
  const resetToken = await PasswordResetToken.findOne({
    tokenHash,
    expiresAt: { $gt: new Date() },
  });

  if (!resetToken) {
    throw new AppError('Password reset token is invalid or expired', 400);
  }

  const user = await User.findById(resetToken.user).select('+password');
  if (!user) {
    throw new AppError('User not found', 404);
  }

  user.password = password;
  await user.save();

  await Promise.all([
    PasswordResetToken.deleteMany({ user: user.id }),
    RefreshToken.updateMany(
      { user: user.id, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    ),
  ]);

  clearAuthCookies(res);

  res.status(200).json({ message: 'Password reset successful' });
});
