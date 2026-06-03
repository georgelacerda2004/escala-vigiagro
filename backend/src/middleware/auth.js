import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';

export async function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token ausente' });
  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    return res.status(401).json({ error: 'Token invalido ou expirado' });
  }
  // Le a role ATUAL do banco, nao a que estava no JWT — assim, se o admin
  // promover/demover um usuario, a mudanca vale ja na proxima request
  // (sem precisar de logout/login).
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, role: true, active: true, personId: true },
    });
    if (!dbUser || !dbUser.active) {
      return res.status(401).json({ error: 'Usuario inativo ou removido' });
    }
    req.user = {
      sub: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      personId: dbUser.personId,
    };
    return next();
  } catch {
    return res.status(500).json({ error: 'Falha ao validar usuario' });
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
