import { Router } from 'express';
import { z } from 'zod';
import { authRequired, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncH } from '../middleware/error.js';
import { listShifts } from '../services/shiftService.js';
import { prisma } from '../config/prisma.js';
import { audit } from '../services/audit.js';
import { emitEvent } from '../realtime/io.js';
import { SIGLA_LEGENDA } from '../services/teamSigla.js';

const router = Router();

router.get(
  '/',
  authRequired,
  asyncH(async (req, res) => {
    res.json(await listShifts(req.query));
  })
);

const bodySchema = z.object({
  personId: z.number().int(),
  date: z.string(),
  rawValue: z.string().min(1),
  hours: z.number().optional(),
  shiftTypeId: z.number().int().nullable().optional(),
  monthSheet: z.string().optional(),
});

router.post(
  '/',
  authRequired,
  requireRole('SUPERVISOR'),
  validate(bodySchema),
  asyncH(async (req, res) => {
    const b = req.body;
    const created = await prisma.shiftAssignment.create({
      data: {
        personId: b.personId,
        date: new Date(b.date),
        rawValue: b.rawValue,
        hours: b.hours ?? 0,
        shiftTypeId: b.shiftTypeId ?? null,
        monthSheet: b.monthSheet ?? 'MANUAL',
        contentHash: `manual-${Date.now()}`,
      },
    });
    await audit({ userId: req.user.sub, action: 'UPDATE', entity: 'shift', detail: `create ${created.id}`, ip: req.ip });
    emitEvent('shift:changed', { id: created.id, op: 'create' });
    res.status(201).json(created);
  })
);

router.put(
  '/:id',
  authRequired,
  requireRole('SUPERVISOR'),
  asyncH(async (req, res) => {
    const id = Number(req.params.id);
    const b = req.body;
    const updated = await prisma.shiftAssignment.update({
      where: { id },
      data: {
        rawValue: b.rawValue,
        hours: b.hours,
        shiftTypeId: b.shiftTypeId ?? undefined,
        contentHash: `manual-${Date.now()}`,
      },
    });
    await audit({ userId: req.user.sub, action: 'UPDATE', entity: 'shift', detail: `update ${id}`, ip: req.ip });
    emitEvent('shift:changed', { id, op: 'update' });
    res.json(updated);
  })
);

router.delete(
  '/:id',
  authRequired,
  requireRole('ADMIN'),
  asyncH(async (req, res) => {
    const id = Number(req.params.id);
    await prisma.shiftAssignment.delete({ where: { id } });
    await audit({ userId: req.user.sub, action: 'UPDATE', entity: 'shift', detail: `delete ${id}`, ip: req.ip });
    emitEvent('shift:changed', { id, op: 'delete' });
    res.json({ ok: true });
  })
);

// Auxiliares p/ filtros do front
router.get(
  '/meta',
  authRequired,
  asyncH(async (_req, res) => {
    const [teams, types, people] = await Promise.all([
      prisma.team.findMany({ orderBy: { name: 'asc' } }),
      prisma.shiftType.findMany({ orderBy: { label: 'asc' } }),
      prisma.person.findMany({ orderBy: { name: 'asc' }, include: { team: true } }),
    ]);
    res.json({ teams, types, people, siglaLegenda: SIGLA_LEGENDA });
  })
);

export default router;
