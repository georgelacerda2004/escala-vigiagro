import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const isSqlite = () => (env.databaseUrl || '').startsWith('file:');

// Caminho real do arquivo SQLite (Prisma resolve relativo a pasta do schema).
function sqliteFilePath() {
  const raw = env.databaseUrl.replace(/^file:/, '');
  return path.isAbsolute(raw) ? raw : path.resolve(env.backendRoot, 'prisma', raw);
}

function parseDbUrl(url) {
  const u = new URL(url);
  return {
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    host: u.hostname,
    port: u.port || '5432',
    database: u.pathname.replace(/^\//, ''),
  };
}

function backupSqlite(dir, day) {
  const src = sqliteFilePath();
  if (!fs.existsSync(src)) throw new Error(`Arquivo SQLite nao encontrado: ${src}`);
  const out = path.join(dir, `backup-${day}.db`);
  fs.copyFileSync(src, out);
  return out;
}

function backupPostgres(dir, day) {
  return new Promise((resolve, reject) => {
    const out = path.join(dir, `backup-${day}.sql`);
    let cfg;
    try {
      cfg = parseDbUrl(env.databaseUrl);
    } catch (e) {
      return reject(new Error(`DATABASE_URL invalida: ${e.message}`));
    }
    const args = [
      '-h', cfg.host, '-p', cfg.port, '-U', cfg.user, '-d', cfg.database,
      '-F', 'p', '-f', out, '--no-owner', '--no-privileges',
    ];
    const child = spawn(env.backup.pgDumpBin, args, {
      env: { ...process.env, PGPASSWORD: cfg.password },
    });
    let stderr = '';
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', (e) =>
      reject(new Error(`Falha ao executar ${env.backup.pgDumpBin}: ${e.message}`))
    );
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(`pg_dump saiu com codigo ${code}: ${stderr}`));
      resolve(out);
    });
  });
}

export async function runBackup() {
  const dir = env.backup.dir;
  fs.mkdirSync(dir, { recursive: true });
  const day = new Date().toISOString().slice(0, 10);

  const outFile = isSqlite() ? backupSqlite(dir, day) : await backupPostgres(dir, day);

  pruneOld(dir, env.backup.keep);
  logger.info(`[backup] gerado ${outFile}`);
  return outFile;
}

function pruneOld(dir, keep) {
  const files = fs
    .readdirSync(dir)
    .filter((f) => /^backup-\d{4}-\d{2}-\d{2}\.(sql|db)$/.test(f))
    .map((f) => ({ f, m: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m);
  for (const old of files.slice(keep)) {
    fs.unlinkSync(path.join(dir, old.f));
    logger.info(`[backup] removido antigo ${old.f}`);
  }
}

export function listBackups() {
  const dir = env.backup.dir;
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /^backup-.*\.(sql|db)$/.test(f))
    .map((f) => {
      const st = fs.statSync(path.join(dir, f));
      return { file: f, size: st.size, createdAt: st.mtime };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}
