import { Router } from 'express';
import { authRequired, requireRole } from '../middleware/auth.js';
import { asyncH } from '../middleware/error.js';
import { dashboardSummary } from '../services/shiftService.js';
import { listBackups, runBackup } from '../services/backupService.js';
import { audit } from '../services/audit.js';

const router = Router();

router.get(
  '/summary',
  authRequired,
  asyncH(async (req, res) => {
    res.json(await dashboardSummary(req.query.date));
  })
);

router.get(
  '/backups',
  authRequired,
  requireRole('ADMIN'),
  asyncH(async (_req, res) => {
    res.json({ items: listBackups() });
  })
);

router.post(
  '/backups/run',
  authRequired,
  requireRole('ADMIN'),
  asyncH(async (req, res) => {
    const file = await runBackup();
    await audit({ userId: req.user.sub, action: 'UPDATE', entity: 'backup', detail: file, ip: req.ip });
    res.json({ ok: true, file });
  })
);

export default router;
