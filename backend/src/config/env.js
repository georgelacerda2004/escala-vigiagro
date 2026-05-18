import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '..', '..');

function resolveDir(value, fallback) {
  const v = value && value.trim() ? value.trim() : fallback;
  return path.isAbsolute(v) ? v : path.resolve(backendRoot, v);
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  databaseUrl: process.env.DATABASE_URL,

  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',

  admin: {
    name: process.env.ADMIN_NAME || 'Administrador',
    email: process.env.ADMIN_EMAIL || 'admin@escala.local',
    password: process.env.ADMIN_PASSWORD || 'admin123',
  },

  excel: {
    watchDir: resolveDir(process.env.EXCEL_WATCH_DIR, '../excel'),
    file: process.env.EXCEL_FILE ? resolveDir(process.env.EXCEL_FILE, '') : '',
    legendSheet: process.env.EXCEL_LEGEND_SHEET || 'LEGENDA',
    stabilityMs: Number(process.env.EXCEL_STABILITY_MS || 2500),
  },

  backup: {
    dir: resolveDir(process.env.BACKUP_DIR, '../backups'),
    cron: process.env.BACKUP_CRON || '0 0 * * *',
    keep: Number(process.env.BACKUP_KEEP || 30),
    pgDumpBin: process.env.PG_DUMP_BIN || 'pg_dump',
  },

  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    max: Number(process.env.RATE_LIMIT_MAX || 300),
  },

  backendRoot,
};

export default env;
