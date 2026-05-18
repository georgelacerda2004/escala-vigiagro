import { ZodError } from 'zod';
import { logger } from '../config/logger.js';

export function notFound(req, res) {
  res.status(404).json({ error: 'Rota nao encontrada' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Dados invalidos', issues: err.issues });
  }
  if (err?.code === 'P2002') {
    return res.status(409).json({ error: 'Registro duplicado' });
  }
  if (err?.code === 'P2025') {
    return res.status(404).json({ error: 'Registro nao encontrado' });
  }
  logger.error(err);
  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? 'Erro interno do servidor' : err.message,
  });
}

// Wrapper p/ controllers async
export const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
