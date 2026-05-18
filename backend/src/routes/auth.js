import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { authRequired } from '../middleware/auth.js';
import { asyncH } from '../middleware/error.js';
import {
  verifyCredentials,
  signToken,
  publicUser,
  changeOwnPassword,
} from '../services/userService.js';
import { prisma } from '../config/prisma.js';
import { audit } from '../services/audit.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().min(3),
  password: z.string().min(1),
});

router.post(
  '/login',
  validate(loginSchema),
  asyncH(async (req, res) => {
    const { email, password } = req.body;
    const user = await verifyCredentials(email, password);
    if (!user) {
      await audit({ action: 'LOGIN', detail: `falha: ${email}`, ip: req.ip });
      return res.status(401).json({ error: 'Credenciais invalidas' });
    }
    const token = signToken(user);
    await audit({ userId: user.id, action: 'LOGIN', ip: req.ip });
    res.json({ token, user: publicUser(user) });
  })
);

router.get(
  '/me',
  authRequired,
  asyncH(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' });
    res.json({ user: publicUser(user) });
  })
);

router.post(
  '/logout',
  authRequired,
  asyncH(async (req, res) => {
    await audit({ userId: req.user.sub, action: 'LOGOUT', ip: req.ip });
    res.json({ ok: true });
  })
);

const changePwdSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, 'A nova senha deve ter ao menos 6 caracteres'),
});

router.post(
  '/change-password',
  authRequired,
  validate(changePwdSchema),
  asyncH(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const r = await changeOwnPassword(req.user.sub, currentPassword, newPassword);
    if (!r.ok) return res.status(400).json({ error: r.error });
    await audit({ userId: req.user.sub, action: 'UPDATE', entity: 'senha', ip: req.ip });
    res.json({ ok: true });
  })
);

export default router;
