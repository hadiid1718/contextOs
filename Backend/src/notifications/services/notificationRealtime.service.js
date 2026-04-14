import { Server } from 'socket.io';

import { env } from '../../config/env.js';
import logger from '../../config/loggers.js';
import { verifyAccessToken } from '../../utils/token.js';

let ioServer = null;

const toUserRoom = userId => `user:${userId}`;
const toOrgRoom = orgId => `org:${orgId}`;

const extractHandshakeToken = socket => {
  const authToken = socket?.handshake?.auth?.token;

  if (typeof authToken === 'string' && authToken.trim().length > 0) {
    return authToken.trim();
  }

  const authorizationHeader = socket?.handshake?.headers?.authorization;

  if (
    typeof authorizationHeader === 'string' &&
    authorizationHeader.startsWith('Bearer ')
  ) {
    return authorizationHeader.slice(7).trim();
  }

  return null;
};

export const initializeNotificationRealtime = httpServer => {
  if (ioServer) {
    return ioServer;
  }

  ioServer = new Server(httpServer, {
    cors: {
      origin: env.appOrigin,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  ioServer.use((socket, next) => {
    const token = extractHandshakeToken(socket);

    if (!token) {
      next(new Error('Authentication required for realtime notifications'));
      return;
    }

    try {
      const payload = verifyAccessToken(token);
      socket.data.auth = payload;
      next();
    } catch {
      next(new Error('Invalid or expired realtime token'));
    }
  });

  ioServer.on('connection', socket => {
    const auth = socket.data?.auth || {};

    if (auth.sub) {
      socket.join(toUserRoom(auth.sub));
    }

    if (auth.org_id) {
      socket.join(toOrgRoom(auth.org_id));
    }

    socket.on('notification:subscribe-org', orgId => {
      if (typeof orgId !== 'string') {
        return;
      }

      const normalized = orgId.trim();
      if (!normalized || normalized !== auth.org_id) {
        return;
      }

      socket.join(toOrgRoom(normalized));
    });
  });

  logger.info('Notification realtime server initialized');

  return ioServer;
};

export const emitNotificationRealtime = notification => {
  if (!ioServer || !notification) {
    return false;
  }

  if (notification.user_id) {
    ioServer
      .to(toUserRoom(notification.user_id))
      .emit('notification:new', notification);
    return true;
  }

  if (notification.org_id) {
    ioServer
      .to(toOrgRoom(notification.org_id))
      .emit('notification:new', notification);
    return true;
  }

  return false;
};

export const shutdownNotificationRealtime = async () => {
  if (!ioServer) {
    return;
  }

  await ioServer.close();
  ioServer = null;
};
