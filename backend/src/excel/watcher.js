import fs from 'node:fs';
import path from 'node:path';
import chokidar from 'chokidar';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { syncFromFile } from './sync.js';

const isXlsx = (f) => /\.xlsx$/i.test(f) && !path.basename(f).startsWith('~$');

function newestXlsx(dir) {
  if (!fs.existsSync(dir)) return null;
  const files = fs
    .readdirSync(dir)
    .filter(isXlsx)
    .map((f) => path.join(dir, f))
    .map((p) => ({ p, m: fs.statSync(p).mtimeMs }))
    .sort((a, b) => b.m - a.m);
  return files[0]?.p ?? null;
}

let queued = false;
let timer = null;

function scheduleSync(filePath) {
  // Debounce: o Excel grava em varias etapas; espera estabilizar.
  clearTimeout(timer);
  queued = true;
  timer = setTimeout(async () => {
    queued = false;
    try {
      await syncFromFile(filePath);
    } catch {
      /* erro ja registrado no sync */
    }
  }, env.excel.stabilityMs);
}

export function startExcelWatcher() {
  const dir = env.excel.watchDir;
  fs.mkdirSync(dir, { recursive: true });

  // Importacao inicial: arquivo fixo (EXCEL_FILE) ou o mais recente da pasta.
  const initial = env.excel.file && fs.existsSync(env.excel.file) ? env.excel.file : newestXlsx(dir);
  if (initial) {
    logger.info(`[watcher] importacao inicial: ${initial}`);
    syncFromFile(initial).catch(() => {});
  } else {
    logger.warn(`[watcher] nenhum .xlsx encontrado em ${dir} (aguardando)`);
  }

  const watcher = chokidar.watch(dir, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: env.excel.stabilityMs, pollInterval: 200 },
    depth: 0,
  });

  const onChange = (filePath) => {
    if (!isXlsx(filePath)) return;
    logger.info(`[watcher] alteracao detectada: ${path.basename(filePath)}`);
    scheduleSync(filePath);
  };

  watcher.on('add', onChange).on('change', onChange);
  watcher.on('error', (e) => logger.error(`[watcher] ${e.message}`));
  logger.info(`[watcher] monitorando ${dir}`);
  return watcher;
}

export function isQueued() {
  return queued;
}
