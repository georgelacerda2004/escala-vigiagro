import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

let io = null;

export function initIO(httpServer) {
  io = new Server(httpServer, {
    // origin refletida: o SPA e servido pelo mesmo backend (inclusive via tunel)
    cors: { origin: true, credentials: true },
  });

  // Autenticacao opcional do socket (token no handshake.auth.token)
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next();
    try {
      socket.user = jwt.verify(token, env.jwtSecret);
    } catch {
      // conexao anonima permitida apenas para leitura de eventos publicos
    }
    next();
  });

  io.on('connection', (socket) => {
    logger.debug(`[socket] conectado ${socket.id}`);
    socket.on('disconnect', () => logger.debug(`[socket] desconectado ${socket.id}`));
  });

  return io;
}

export function emitEvent(event, payload) {
  if (io) io.emit(event, payload);
}

export function getIO() {
  return io;
}
