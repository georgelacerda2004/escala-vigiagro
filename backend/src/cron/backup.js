import cron from 'node-cron';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { runBackup } from '../services/backupService.js';

export function startBackupCron() {
  if (!cron.validate(env.backup.cron)) {
    logger.error(`[backup] expressao cron invalida: ${env.backup.cron}`);
    return null;
  }
  const task = cron.schedule(env.backup.cron, async () => {
    try {
      await runBackup();
    } catch (e) {
      logger.error(`[backup] falhou: ${e.message}`);
    }
  });
  logger.info(`[backup] agendado (${env.backup.cron}), retencao ${env.backup.keep}`);
  return task;
}
