import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token ausente' });
  try {
    req.user = jwt.verify(token, env.jwtSecret);
    return next();
  } catch {
    return res.status(401).json({ error: 'Token invalido ou expirado' });
  }
}

// Hierarquia: ADMIN > SUPERVISOR > OPERATOR
const RANK = { OPERATOR: 1, SUPERVISOR: 2, ADMIN: 3 };

export function requireRole(minRole) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Nao autenticado' });
    if ((RANK[req.user.role] || 0) < (RANK[minRole] || 99)) {
      return res.status(403).json({ error: 'Permissao insuficiente' });
    }
    return next();
  };
}
