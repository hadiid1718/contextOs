import { io } from 'socket.io-client';

let socket;

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

