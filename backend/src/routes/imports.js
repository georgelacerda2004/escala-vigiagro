import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import { authRequired, requireRole } from '../middleware/auth.js';
import { asyncH } from '../middleware/error.js';
import { env } from '../config/env.js';
import { syncFromFile } from '../excel/sync.js';
import { audit } from '../services/audit.js';
import { logger } from '../config/logger.js';

const router = Router();

const isXlsx = (f) => /\.xlsx$/i.test(f) && !path.basename(f).startsWith('~$');

function runSyncInBackground(filePath) {
  setImmediate(() => {
    syncFromFile(filePath).catch((err) => {
      logger.error(`[import] background sync falhou: ${err.message}`);
    });
  });
}

router.get(
  '/files',
  authRequired,
  asyncH(async (_req, res) => {
    const dir = env.excel.watchDir;
    if (!fs.existsSync(dir)) return res.json({ dir, files: [] });
    const files = fs
      .readdirSync(dir)
      .filter(isXlsx)
      .map((f) => {
        const st = fs.statSync(path.join(dir, f));
        return { file: f, size: st.size, modifiedAt: st.mtime };
      })
      .sort((a, b) => b.modifiedAt - a.modifiedAt);
    res.json({ dir, files });
  })
);

router.post(
  '/excel',
  authRequired,
  requireRole('SUPERVISOR'),
  asyncH(async (req, res) => {
    const dir = env.excel.watchDir;
    let target = req.body?.file ? path.join(dir, path.basename(req.body.file)) : null;
    if (!target) {
      const files = fs
        .readdirSync(dir)
        .filter(isXlsx)
        .map((f) => ({ p: path.join(dir, f), m: fs.statSync(path.join(dir, f)).mtimeMs }))
        .sort((a, b) => b.m - a.m);
      target = files[0]?.p;
    }
    if (!target || !fs.existsSync(target)) {
      return res.status(404).json({ error: 'Nenhum arquivo .xlsx encontrado' });
    }
    await audit({
      userId: req.user.sub,
      action: 'IMPORT',
      entity: 'excel',
      detail: path.basename(target),
      ip: req.ip,
    });
    runSyncInBackground(target);
    res.status(202).json({ ok: true, queued: true, file: path.basename(target) });
  })
);

router.post(
  '/upload',
  authRequired,
  requireRole('SUPERVISOR'),
  asyncH(async (req, res) => {
    const { filename, contentBase64 } = req.body || {};
    if (!filename || !contentBase64) {
      return res.status(400).json({ error: 'Envie filename e contentBase64' });
    }
    const safe = path.basename(String(filename)).replace(/[^\w.\- ]/g, '_');
    if (!/\.xlsx$/i.test(safe)) {
      return res.status(400).json({ error: 'O arquivo deve ser .xlsx' });
    }
    const buf = Buffer.from(String(contentBase64).split(',').pop(), 'base64');
    if (!buf.length || buf.length > 30 * 1024 * 1024) {
      return res.status(400).json({ error: 'Arquivo vazio ou maior que 30MB' });
    }
    fs.mkdirSync(env.excel.watchDir, { recursive: true });
    const dest = path.join(env.excel.watchDir, safe);
    fs.writeFileSync(dest, buf);
    await audit({
      userId: req.user.sub,
      action: 'IMPORT',
      entity: 'excel-upload',
      detail: safe,
      ip: req.ip,
    });
    runSyncInBackground(dest);
    res.status(202).json({ ok: true, queued: true, file: safe });
  })
);

export default router;