import { prisma } from '../config/prisma.js';
import { logger } from '../config/logger.js';

export async function audit({ userId = null, action, entity = null, detail = null, ip = null }) {
  try {
    await prisma.auditLog.create({
      data: { userId, action, entity, detail: detail ? String(detail).slice(0, 1000) : null, ip },
    });
  } catch (e) {
    logger.warn(`[audit] falha ao registrar: ${e.message}`);
  }
}
