import { AdminAuditLog } from '../models/AdminAuditLog.js';

const resolveIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || 'unknown';
};

export const writeAdminAuditLog = async ({ adminId, action, req, meta = null }) => {
  try {
    await AdminAuditLog.create({
      adminId: adminId || 'anonymous',
      action,
      ip: resolveIp(req),
      userAgent: req.headers['user-agent'] || '',
      ts: new Date(),
      meta,
    });
  } catch {
    // Auditing must never block admin flows.
  }
};
