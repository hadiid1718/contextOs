import { io } from 'socket.io-client';

let socket;

export const getSocketClient = () => {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:4001', {
      autoConnect: false,
      transports: ['websocket'],
    });
  }
  return socket;
};

