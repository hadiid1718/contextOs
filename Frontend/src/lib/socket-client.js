import { io } from 'socket.io-client';

let socket;
let socketConsumerCount = 0;
let pendingDisconnectTimer = null;

const clearPendingDisconnect = () => {
  if (pendingDisconnectTimer) {
    clearTimeout(pendingDisconnectTimer);
    pendingDisconnectTimer = null;
  }
};

export const getSocketClient = () => {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:4001', {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 500,
      reconnectionDelayMax: 8000,
    });
  }
  return socket;
};

export const acquireSocketClient = () => {
  clearPendingDisconnect();
  socketConsumerCount += 1;
  return getSocketClient();
};

export const releaseSocketClient = () => {
  socketConsumerCount = Math.max(0, socketConsumerCount - 1);

  if (!socket || socketConsumerCount > 0) {
    return;
  }

  // In React StrictMode, effects mount/unmount twice in development.
  // Delay disconnect to avoid closing a websocket during the initial handshake.
  pendingDisconnectTimer = setTimeout(() => {
    pendingDisconnectTimer = null;
    if (socketConsumerCount === 0 && socket?.connected) {
      socket.disconnect();
    }
  }, 150);
};

