import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(import.meta.env.VITE_API_URL || '/', {
      auth: { token: localStorage.getItem('token') },
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}
