import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { prisma } from './config/prisma.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';
import { initIO } from './realtime/io.js';
import { startExcelWatcher } from './excel/watcher.js';
import { startBackupCron } from './cron/backup.js';
import { openapiSpec } from './docs/openapi.js';

const app = express();
app.set('trust proxy', 1);
app.use(
  helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false })
);
// origin refletida: SPA servido pelo proprio backend (inclusive via tunel Cloudflare)
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '45mb' })); // upload da planilha em base64
app.use(
  rateLimit({
    windowMs: env.rateLimit.windowMs,
    max: env.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.originalUrl}`);
  next();
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));
app.use('/api', routes);

// Logo/brasao institucional (pasta brand/ na raiz) - nao precisa rebuild.
const brandDir = path.resolve(env.backendRoot, '..', 'brand');
fs.mkdirSync(brandDir, { recursive: true });

// /brand/logo -> serve a PRIMEIRA imagem encontrada em brand/ (qualquer nome).
const IMG_RE = /\.(png|jpe?g|webp|gif|svg)$/i;
const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
};
app.get('/brand/logo', (_req, res) => {
  let files = [];
  try {
    files = fs.readdirSync(brandDir).filter((f) => IMG_RE.test(f));
  } catch {
    /* pasta pode nao existir ainda */
  }
  if (!files.length) return res.status(404).end();
  // prioriza nomes com "logo"/"vigiagro"/"brasao"; senao o primeiro
  files.sort((a, b) => {
    const score = (n) => (/logo|vigiagro|brasao|brasão/i.test(n) ? 0 : 1);
    return score(a) - score(b) || a.localeCompare(b);
  });
  const file = path.join(brandDir, files[0]);
  res.type(MIME[path.extname(files[0]).toLowerCase()] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-cache');
  fs.createReadStream(file).pipe(res);
});

app.use('/brand', express.static(brandDir));

// Serve o front-end buildado (frontend/dist), se existir.
const distDir = path.resolve(env.backendRoot, '..', 'frontend', 'dist');
if (fs.existsSync(path.join(distDir, 'index.html'))) {
  app.use(express.static(distDir));
  app.get(/^\/(?!api|brand).*/, (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
  logger.info('[http] SPA servida a partir de frontend/dist');
}

app.use(notFound);
app.use(errorHandler);

const server = http.createServer(app);
initIO(server);

async function start() {
  try {
    await prisma.$connect();
    logger.info('[db] conectado');
  } catch (e) {
    logger.error(`[db] falha de conexao: ${e.message}`);
  }

  server.listen(env.port, () => {
    logger.info(`[http] API em http://localhost:${env.port}/api (docs: /api/docs)`);
    startExcelWatcher();
    startBackupCron();
  });
}

start();

const shutdown = async (sig) => {
  logger.info(`[sys] ${sig} recebido, encerrando...`);
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (r) => logger.error(`[sys] unhandledRejection: ${r}`));
