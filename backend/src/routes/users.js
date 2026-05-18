import { Router } from 'express';
import { z } from 'zod';
import { authRequired, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncH } from '../middleware/error.js';
import { prisma } from '../config/prisma.js';
import { hashPassword, publicUser } from '../services/userService.js';
import { audit } from '../services/audit.js';

const router = Router();

router.get(
  '/',
  authRequired,
  requireRole('ADMIN'),
  asyncH(async (_req, res) => {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
    res.json({ items: users.map(publicUser) });
  })
);

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'SUPERVISOR', 'OPERATOR']).default('OPERATOR'),
});

router.post(
  '/',
  authRequired,
  requireRole('ADMIN'),
  validate(createSchema),
  asyncH(async (req, res) => {
    const { name, email, password, role } = req.body;
    const user = await prisma.user.create({
      data: { name, email, role, passwordHash: await hashPassword(password) },
    });
    await audit({ userId: req.user.sub, action: 'UPDATE', entity: 'user', detail: `create ${email}`, ip: req.ip });
    res.status(201).json(publicUser(user));
  })
);

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(['ADMIN', 'SUPERVISOR', 'OPERATOR']).optional(),
  active: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

router.put(
  '/:id',
  authRequired,
  requireRole('ADMIN'),
  validate(updateSchema),
  asyncH(async (req, res) => {
    const id = Number(req.params.id);
    const data = { ...req.body };
    if (data.password) {
      data.passwordHash = await hashPassword(data.password);
      delete data.password;
    }
    const user = await prisma.user.update({ where: { id }, data });
    await audit({ userId: req.user.sub, action: 'UPDATE', entity: 'user', detail: `update ${id}`, ip: req.ip });
    res.json(publicUser(user));
  })
);

router.delete(
  '/:id',
  authRequired,
  requireRole('ADMIN'),
  asyncH(async (req, res) => {
    const id = Number(req.params.id);
    if (id === req.user.sub) return res.status(400).json({ error: 'Nao e possivel remover a si mesmo' });
    await prisma.user.delete({ where: { id } });
    await audit({ userId: req.user.sub, action: 'UPDATE', entity: 'user', detail: `delete ${id}`, ip: req.ip });
    res.json({ ok: true });
  })
);

export default router;
