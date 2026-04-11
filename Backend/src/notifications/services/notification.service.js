import { AppError } from '../../utils/appError.js';
import {
  NotificationPreference,
  defaultNotificationTypePreferences,
} from '../models/NotificationPreference.js';
import { Notification } from '../models/Notification.js';

const ALLOWED_SEVERITIES = new Set(['info', 'success', 'warning', 'error']);
const ALLOWED_DIGEST_FREQUENCIES = new Set(['instant', 'hourly', 'daily']);

const toInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const normalizeSeverityFromType = (type = '') => {
  const normalized = String(type || '').toUpperCase();

  if (
    normalized.includes('FAILED') ||
    normalized.includes('ERROR') ||
    normalized.includes('BLOCKED') ||
    normalized.includes('DENIED')
  ) {
    return 'error';
  }

  if (
    normalized.includes('PASSWORD') ||
    normalized.includes('REVOKED') ||
    normalized.includes('EXPIRED') ||
    normalized.includes('WARNING')
  ) {
    return 'warning';
  }

  if (
    normalized.includes('UPDATED') ||
    normalized.includes('CHANGED') ||
    normalized.includes('CREATED') ||
    normalized.includes('ACCEPTED') ||
    normalized.includes('SUCCESS')
  ) {
    return 'success';
  }

  return 'info';
};

const routeByTypePrefix = [
  { prefix: 'AUTH_', route: '/settings/notifications' },
  { prefix: 'INVITATION_', route: '/settings/team' },
  { prefix: 'MEMBER_', route: '/settings/team' },
  { prefix: 'BILLING_', route: '/billing' },
  { prefix: 'INGESTION_', route: '/integrations' },
  { prefix: 'GRAPH_', route: '/graph' },
  { prefix: 'AI_', route: '/query' },
];

const resolveRouteFromType = (type = '') => {
  const normalized = String(type || '').toUpperCase();
  const match = routeByTypePrefix.find((entry) => normalized.startsWith(entry.prefix));
  return match?.route || '/notifications';
};

export const serializeNotification = (notification) => ({
  id: notification?._id?.toString() || notification?.id,
  user_id: notification?.user_id,
  org_id: notification?.org_id,
  type: notification?.type,
  severity: notification?.severity || 'info',
  message: notification?.message,
  route: notification?.route || '/notifications',
  read: Boolean(notification?.read),
  metadata: notification?.metadata || {},
  createdAt: notification?.createdAt
    ? new Date(notification.createdAt).toISOString()
    : null,
});

const getDefaultTypePreferences = () => ({
  ...defaultNotificationTypePreferences,
});

export const serializeNotificationPreference = (preference) => ({
  user_id: preference?.user_id,
  typePreferences: {
    ...getDefaultTypePreferences(),
    ...(preference?.typePreferences || {}),
  },
  emailDigestFrequency: preference?.emailDigestFrequency || 'instant',
});

export const normalizeNotificationEvent = (event = {}) => {
  const userId = String(event.user_id || '').trim();
  const message = String(event.message || '').trim();

  if (!userId) {
    throw new AppError('Notification target user is required', 400);
  }

  if (!message) {
    throw new AppError('Notification message is required', 400);
  }

  const rawType = String(event.type || 'SYSTEM_EVENT').trim();
  const normalizedType = rawType || 'SYSTEM_EVENT';

  const requestedSeverity = String(event.severity || '').toLowerCase().trim();
  const severity = ALLOWED_SEVERITIES.has(requestedSeverity)
    ? requestedSeverity
    : normalizeSeverityFromType(normalizedType);

  return {
    user_id: userId,
    org_id: String(event.org_id || 'global').trim() || 'global',
    type: normalizedType,
    severity,
    message,
    route:
      typeof event.route === 'string' && event.route.trim().length > 0
        ? event.route.trim()
        : resolveRouteFromType(normalizedType),
    metadata: event.metadata && typeof event.metadata === 'object' ? event.metadata : {},
  };
};

export const getOrCreateNotificationPreference = async (userId) => {
  const preference = await NotificationPreference.findOneAndUpdate(
    { user_id: userId },
    { $setOnInsert: { user_id: userId } },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  ).lean();

  return serializeNotificationPreference(preference);
};

export const createNotificationRecord = async (event) => {
  const normalized = normalizeNotificationEvent(event);

  const preference = await getOrCreateNotificationPreference(normalized.user_id);
  const isEnabled = preference.typePreferences?.[normalized.severity] !== false;

  if (!isEnabled) {
    return {
      skipped: true,
      reason: 'disabled-by-user-preference',
      notification: null,
      preference,
    };
  }

  const created = await Notification.create(normalized);

  return {
    skipped: false,
    notification: serializeNotification(created),
    preference,
  };
};

const buildVisibilityFilter = ({ userId, orgId, unreadOnly = false }) => {
  const filter = { user_id: userId };

  if (orgId) {
    filter.org_id = { $in: [orgId, 'global'] };
  }

  if (unreadOnly) {
    filter.read = false;
  }

  return filter;
};

export const listNotificationsForUser = async ({
  userId,
  orgId = null,
  page = 1,
  limit = 10,
  unreadOnly = false,
}) => {
  const safePage = clamp(toInteger(page, 1), 1, 10_000);
  const safeLimit = clamp(toInteger(limit, 10), 1, 50);

  const filter = buildVisibilityFilter({ userId, orgId, unreadOnly });
  const unreadFilter = buildVisibilityFilter({ userId, orgId, unreadOnly: true });

  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments(unreadFilter),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / safeLimit));

  return {
    data: items.map(serializeNotification),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
      hasNext: safePage < totalPages,
      hasPrev: safePage > 1,
    },
    unreadCount,
  };
};

export const markNotificationReadForUser = async ({ userId, notificationId }) => {
  const updated = await Notification.findOneAndUpdate(
    {
      _id: notificationId,
      user_id: userId,
    },
    {
      $set: {
        read: true,
      },
    },
    {
      new: true,
    }
  ).lean();

  if (!updated) {
    throw new AppError('Notification not found', 404);
  }

  return serializeNotification(updated);
};

export const markAllNotificationsReadForUser = async ({
  userId,
  orgId = null,
}) => {
  const filter = buildVisibilityFilter({ userId, orgId, unreadOnly: true });
  const result = await Notification.updateMany(filter, {
    $set: { read: true },
  });

  return {
    updatedCount: result.modifiedCount || 0,
  };
};

export const getNotificationPreferencesForUser = async (userId) => {
  return getOrCreateNotificationPreference(userId);
};

export const updateNotificationPreferencesForUser = async ({ userId, payload }) => {
  const updates = {};
  const typePreferenceUpdates = {};

  if (payload?.typePreferences && typeof payload.typePreferences === 'object') {
    ['info', 'success', 'warning', 'error'].forEach((key) => {
      if (typeof payload.typePreferences[key] === 'boolean') {
        typePreferenceUpdates[`typePreferences.${key}`] = payload.typePreferences[key];
      }
    });
  }

  Object.assign(updates, typePreferenceUpdates);

  if (typeof payload?.emailDigestFrequency === 'string') {
    const normalizedFrequency = payload.emailDigestFrequency.trim().toLowerCase();

    if (!ALLOWED_DIGEST_FREQUENCIES.has(normalizedFrequency)) {
      throw new AppError('Invalid email digest frequency', 400);
    }

    updates.emailDigestFrequency = normalizedFrequency;
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError(
      'At least one notification preference field must be provided',
      400
    );
  }

  const updated = await NotificationPreference.findOneAndUpdate(
    { user_id: userId },
    {
      $set: updates,
      $setOnInsert: {
        user_id: userId,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    }
  ).lean();

  return serializeNotificationPreference(updated);
};
