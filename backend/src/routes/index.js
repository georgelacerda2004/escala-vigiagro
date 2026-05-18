import { Router } from 'express';
import authRoutes from './auth.js';
import shiftRoutes from './shifts.js';
import importRoutes from './imports.js';
import logRoutes from './logs.js';
import userRoutes from './users.js';
import dashboardRoutes from './dashboard.js';
import calendarRoutes from './calendar.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));
router.use('/auth', authRoutes);
router.use('/shifts', shiftRoutes);
router.use('/import', importRoutes);
router.use('/logs', logRoutes);
router.use('/users', userRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/calendar', calendarRoutes);

export default router;
