import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import { asyncH } from '../middleware/error.js';
import { calendarMonth } from '../services/shiftService.js';
import { prisma } from '../config/prisma.js';

const router = Router();

// GET /api/calendar?personId=&month=YYYY-MM
// OPERATOR so enxerga a propria pessoa; ADMIN/SUPERVISOR qualquer uma.
router.get(
  '/',
  authRequired,
  asyncH(async (req, res) => {
    const me = await prisma.user.findUnique({ where: { id: req.user.sub } });
    let personId = req.query.personId ? Number(req.query.personId) : me?.personId;

    if (me?.role === 'OPERATOR') {
      if (!me.personId) return res.status(404).json({ error: 'Usuario nao vinculado a um servidor' });
      personId = me.personId; // trava no proprio
    }
    if (!personId) return res.status(400).json({ error: 'Informe personId' });

    const data = await calendarMonth(personId, req.query.month);
    if (!data) return res.status(404).json({ error: 'Servidor nao encontrado' });
    res.json(data);
  })
);

export default router;
