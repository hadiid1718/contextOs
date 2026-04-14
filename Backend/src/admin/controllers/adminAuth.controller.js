import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import { env } from '../../config/env.js';
import { AppError } from '../../utils/appError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AdminUser } from '../models/AdminUser.js';
import { writeAdminAuditLog } from '../services/adminAudit.service.js';

const lockWindowMs = env.adminLockoutWindowMinutes * 60 * 1000;

const buildAdminCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'strict',
  secure: env.nodeEnv === 'production',
  signed: true,
  path: '/',
});

const signAdminToken = admin =>
  jwt.sign(
    {
      sub: admin.id,
      role: admin.role,
      email: admin.email,
    },
    env.adminJwtSecret,
    { expiresIn: env.adminJwtExpiresIn }
  );

const serializeAdmin = admin => ({
  id: admin.id,
  email: admin.email,
  role: admin.role,
  lastLoginAt: admin.lastLoginAt,
});

export const login = asyncHandler(async (req, res) => {
  const email = req.body.email.toLowerCase().trim();
  const { password } = req.body;

  const admin = await AdminUser.findOne({ email }).select('+passwordHash');
  if (!admin) {
    throw new AppError('Invalid credentials', 401);
  }

  const now = new Date();
  if (admin.lockedUntil && admin.lockedUntil > now) {
    await writeAdminAuditLog({
      adminId: admin.id,
      action: 'login_locked',
      req,
      meta: { lockedUntil: admin.lockedUntil.toISOString() },
    });

    throw new AppError('Account temporarily locked. Try again later.', 423, {
      lockedUntil: admin.lockedUntil,
    });
  }

  const passwordMatches = await bcrypt.compare(password, admin.passwordHash);
  if (!passwordMatches) {
    admin.loginAttempts += 1;

    if (admin.loginAttempts >= env.adminLockoutMaxAttempts) {
      admin.lockedUntil = new Date(Date.now() + lockWindowMs);
      admin.loginAttempts = 0;
    }

    await admin.save();

    await writeAdminAuditLog({
      adminId: admin.id,
      action: 'login_failed',
      req,
      meta: {
        attempts: admin.loginAttempts,
        lockedUntil: admin.lockedUntil,
      },
    });

    throw new AppError('Invalid credentials', 401);
  }

  admin.loginAttempts = 0;
  admin.lockedUntil = null;
  admin.lastLoginAt = now;
  await admin.save();

  const token = signAdminToken(admin);
  res.cookie(env.adminCookieName, token, buildAdminCookieOptions());

  await writeAdminAuditLog({
    adminId: admin.id,
    action: 'login',
    req,
    meta: { role: admin.role },
  });

  res.status(200).json({
    ok: true,
    role: 'superadmin',
    admin: serializeAdmin(admin),
  });
});

export const logout = asyncHandler(async (req, res) => {
  await writeAdminAuditLog({
    adminId: req.adminUser?.sub || 'anonymous',
    action: 'logout',
    req,
  });

  res.clearCookie(env.adminCookieName, buildAdminCookieOptions());
  res.status(200).json({ ok: true });
});

export const me = asyncHandler(async (req, res) => {
  const admin = await AdminUser.findById(req.adminUser.sub);
  if (!admin) {
    throw new AppError('Admin account not found', 404);
  }

  await writeAdminAuditLog({
    adminId: admin.id,
    action: 'view_dashboard',
    req,
    meta: { endpoint: '/admin/auth/me' },
  });

  res.status(200).json(serializeAdmin(admin));
});
