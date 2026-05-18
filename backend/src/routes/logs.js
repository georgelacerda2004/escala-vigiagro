import { Router } from 'express';
import { authRequired, requireRole } from '../middleware/auth.js';
import { asyncH } from '../middleware/error.js';
import { prisma } from '../config/prisma.js';

const router = Router();

router.get(
  '/sync',
  authRequired,
  asyncH(async (req, res) => {
    const take = Math.min(Number(req.query.limit) || 50, 500);
    const items = await prisma.syncLog.findMany({ orderBy: { dataSync: 'desc' }, take });
    res.json({ items });
  })
);

router.get(
  '/audit',
  authRequired,
  requireRole('SUPERVISOR'),
  asyncH(async (req, res) => {
    const take = Math.min(Number(req.query.limit) || 100, 500);
    const items = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      include: { user: { select: { name: true, email: true } } },
    });
    res.json({ items });
  })
);

export default router;
