import path from 'node:path';
import { prisma } from '../config/prisma.js';
import { logger } from '../config/logger.js';
import { emitEvent } from '../realtime/io.js';
import { parseWorkbook } from './parser.js';
import { env } from '../config/env.js';
import { mapTeam } from '../services/teamSigla.js';
import { ensureUsersForPeople } from '../services/userProvision.js';

let running = false;

export async function syncFromFile(filePath) {
  if (running) {
    logger.warn('[sync] ja em execucao, ignorando chamada concorrente');
    return { skipped: true };
  }
  running = true;
  const started = Date.now();
  const fileName = path.basename(filePath);
  let importados = 0;
  let atualizados = 0;
  let removidos = 0;

  try {
    logger.info(`[sync] lendo ${fileName}`);
    const data = parseWorkbook(filePath, env.excel.legendSheet);

    for (const l of data.legend) {
      await prisma.shiftType.upsert({
        where: { code: l.code },
        update: { label: l.label, color: l.color, hours: l.hours },
        create: { code: l.code, label: l.label, color: l.color, hours: l.hours },
      });
    }
    const shiftTypes = await prisma.shiftType.findMany();
    const typeByCode = new Map(shiftTypes.map((t) => [t.code, t]));

    const teamByName = new Map();
    for (const name of data.teams) {
      const { sigla, descricao } = mapTeam(name);
      const t = await prisma.team.upsert({
        where: { name },
        update: { sigla, descricao },
        create: { name, sigla, descricao },
      });
      teamByName.set(name, t.id);
    }

    const personByName = new Map();
    for (const a of data.assignments) {
      if (personByName.has(a.personName)) continue;
      const teamId = a.teamName ? teamByName.get(a.teamName) ?? null : null;
      const p = await prisma.person.upsert({
        where: { name: a.personName },
        update: { teamId, active: true },
        create: { name: a.personName, teamId },
      });
      personByName.set(a.personName, p.id);
    }

    const novosUsuarios = await ensureUsersForPeople();
    if (novosUsuarios) logger.info(`[sync] ${novosUsuarios} novo(s) usuario(s) de servidor criado(s)`);

    const existing = await prisma.shiftAssignment.findMany({
      select: { id: true, personId: true, date: true, contentHash: true },
    });
    const key = (pid, d) => `${pid}|${d.toISOString().slice(0, 10)}`;
    const existingMap = new Map(existing.map((e) => [key(e.personId, e.date), e]));
    const seen = new Set();
    const toCreate = [];
    const toUpdate = [];

    for (const a of data.assignments) {
      const personId = personByName.get(a.personName);
      if (!personId || !a.date) continue;
      const k = key(personId, a.date);
      if (seen.has(k)) continue;
      seen.add(k);
      const shiftTypeId = typeByCode.get(a.code)?.id ?? null;
      const prev = existingMap.get(k);
      const row = {
        personId,
        date: a.date,
        rawValue: a.rawValue,
        hours: a.hours,
        shiftTypeId,
        monthSheet: a.monthSheet,
        contentHash: a.contentHash,
      };
      if (!prev) {
        toCreate.push(row);
      } else if (prev.contentHash !== a.contentHash) {
        toUpdate.push({ id: prev.id, data: row });
      }
    }

    const CHUNK = 500;
    for (let i = 0; i < toCreate.length; i += CHUNK) {
      const chunk = toCreate.slice(i, i + CHUNK);
      const r = await prisma.shiftAssignment.createMany({ data: chunk, skipDuplicates: true });
      importados += r.count;
    }

    for (const u of toUpdate) {
      await prisma.shiftAssignment.update({ where: { id: u.id }, data: u.data });
      atualizados++;
    }

    const toRemove = existing.filter((e) => !seen.has(key(e.personId, e.date))).map((e) => e.id);
    if (toRemove.length) {
      const del = await prisma.shiftAssignment.deleteMany({ where: { id: { in: toRemove } } });
      removidos = del.count;
    }

    const durationMs = Date.now() - started;
    const status = 'OK';
    const mensagem = `Abas: ${data.stats.sheets} | pessoas: ${data.stats.people} | equipes: ${data.stats.teams}`;

    await prisma.syncLog.create({
      data: {
        fileName,
        registrosImportados: importados,
        registrosAtualizados: atualizados,
        registrosRemovidos: removidos,
        status,
        mensagem,
        durationMs,
      },
    });
    await prisma.settings.upsert({
      where: { key: 'lastSyncAt' },
      update: { value: new Date().toISOString() },
      create: { key: 'lastSyncAt', value: new Date().toISOString() },
    });

    logger.info(
      `[sync] OK ${fileName} (+${importados} ~${atualizados} -${removidos}) ${durationMs}ms`
    );
    emitEvent('sync:done', {
      fileName,
      importados,
      atualizados,
      removidos,
      status,
      at: new Date().toISOString(),
    });

    return { importados, atualizados, removidos, status, durationMs };
  } catch (err) {
    const durationMs = Date.now() - started;
    logger.error(`[sync] ERRO ${fileName}: ${err.stack || err.message}`);
    await prisma.syncLog
      .create({
        data: {
          fileName,
          status: 'ERRO',
          mensagem: err.message?.slice(0, 500),
          durationMs,
        },
      })
      .catch(() => {});
    emitEvent('sync:error', { fileName, error: err.message });
    throw err;
  } finally {
    running = false;
  }
}

export default { syncFromFile };