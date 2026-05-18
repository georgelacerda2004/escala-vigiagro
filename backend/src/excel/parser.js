import crypto from 'node:crypto';
import xlsx from 'xlsx';
import { excelSerialToDate, isPlausibleDateSerial } from '../utils/excelDate.js';
import { logger } from '../config/logger.js';

const MONTHS = [
  'JANEIRO', 'FEVEREIRO', 'MARCO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO',
];

// Rotulos que NUNCA sao pessoas, mesmo aparecendo na coluna A.
const NON_PERSON = new Set([
  'TOTAL', 'TOTAL DE HORAS', 'LEGENDA', 'DATA INICIAL', 'DATA FINAL',
  'FERIADOS', 'OBS', 'OBSERVACOES', 'OBSERVAÇÕES', 'BANCO DE HORAS',
]);

const norm = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
const upper = (v) => norm(v).toUpperCase();

function sha1(s) {
  return crypto.createHash('sha1').update(s).digest('hex');
}

/** Le a aba LEGENDA: TIPO(A) | COR(B) | SIGLA(C) | HORAS(D) */
function parseLegend(wb, legendSheetName) {
  const sheet = wb.Sheets[legendSheetName] || wb.Sheets[wb.SheetNames.find((n) => upper(n) === upper(legendSheetName))];
  const out = [];
  if (!sheet) {
    logger.warn(`[excel] aba de legenda "${legendSheetName}" nao encontrada`);
    return out;
  }
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] || [];
    const label = norm(r[0]);
    const color = norm(r[1]) || null;
    const codeRaw = r[2];
    const hoursRaw = r[3];
    if (codeRaw === null || codeRaw === undefined || norm(codeRaw) === '') continue;
    const code = norm(codeRaw);
    const hours = typeof hoursRaw === 'number' ? hoursRaw : Number(hoursRaw) || 0;
    out.push({ code, label: label || code, color, hours });
  }
  return out;
}

/** Acha a linha (indice 0-based) que contem mais seriais de data plausiveis. */
function findDateRow(rows) {
  let best = { idx: -1, count: 0 };
  const limit = Math.min(rows.length, 30); // cabecalho fica no topo da aba
  for (let i = 0; i < limit; i++) {
    const r = rows[i] || [];
    let count = 0;
    for (let c = 1; c < r.length; c++) {
      if (isPlausibleDateSerial(r[c])) count++;
    }
    if (count > best.count) best = { idx: i, count };
  }
  return best.count >= 5 ? best : null;
}

function rowIsDateRow(row, dateCols) {
  let hits = 0;
  for (const c of dateCols) if (isPlausibleDateSerial(row[c])) hits++;
  return hits >= Math.max(3, Math.floor(dateCols.length * 0.5));
}

function rowHasDayValues(row, dateCols) {
  for (const c of dateCols) {
    const v = row[c];
    if (v === null || v === undefined) continue;
    if (typeof v === 'string' && norm(v) === '') continue;
    return true;
  }
  return false;
}

/** Parseia uma aba mensal (matriz pessoa x dia). */
function parseMonthSheet(wb, sheetName, legendByCode) {
  const sheet = wb.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });

  const dateRow = findDateRow(rows);
  if (!dateRow) {
    logger.warn(`[excel] aba "${sheetName}": linha de datas nao encontrada, ignorada`);
    return { assignments: [], teams: new Set(), people: new Set() };
  }

  const headerRow = rows[dateRow.idx];
  const colDate = new Map(); // colIndex -> Date
  for (let c = 1; c < headerRow.length; c++) {
    if (isPlausibleDateSerial(headerRow[c])) {
      const d = excelSerialToDate(headerRow[c]);
      if (d) colDate.set(c, d);
    }
  }
  const dateCols = [...colDate.keys()];

  const assignments = [];
  const teams = new Set();
  const people = new Set();
  let currentTeam = null;

  for (let i = dateRow.idx + 1; i < rows.length; i++) {
    const r = rows[i] || [];
    const a = norm(r[0]);

    // pula linhas de data duplicadas
    if (rowIsDateRow(r, dateCols)) continue;

    const hasValues = rowHasDayValues(r, dateCols);

    if (a && !hasValues) {
      // cabecalho de grupo/equipe (ex.: "AFFA MV") ou rotulo de resumo
      if (!NON_PERSON.has(upper(a))) currentTeam = a;
      continue;
    }
    if (!a) continue; // sem nome -> ignora
    if (NON_PERSON.has(upper(a))) continue;

    const personName = a;
    people.add(personName);
    if (currentTeam) teams.add(currentTeam);

    for (const c of dateCols) {
      const raw = r[c];
      if (raw === null || raw === undefined) continue;
      if (typeof raw === 'string' && norm(raw) === '') continue;

      const code = norm(raw);
      const legend = legendByCode.get(code) || legendByCode.get(code.toLowerCase()) || legendByCode.get(code.toUpperCase());
      let hours = 0;
      if (legend) hours = legend.hours;
      else if (typeof raw === 'number') hours = raw;

      const date = colDate.get(c);
      assignments.push({
        personName,
        teamName: currentTeam,
        date,
        rawValue: code,
        code,
        hours,
        monthSheet: sheetName,
        contentHash: sha1(`${code}|${hours}|${legend ? legend.code : ''}`),
      });
    }
  }

  return { assignments, teams, people };
}

/**
 * Parseia o workbook inteiro.
 * @returns {{legend:Array, assignments:Array, teams:string[], people:string[], months:string[], stats:object}}
 */
export function parseWorkbook(filePath, legendSheetName = 'LEGENDA') {
  const wb = xlsx.readFile(filePath, { cellDates: false, cellFormula: false });

  const legend = parseLegend(wb, legendSheetName);
  const legendByCode = new Map();
  for (const l of legend) legendByCode.set(l.code, l);

  const monthNames = wb.SheetNames.filter(
    (n) => upper(n) !== upper(legendSheetName) && MONTHS.includes(upper(n))
  );
  // fallback: se nenhum nome bater, usa todas exceto a legenda
  const sheetsToParse = monthNames.length
    ? monthNames
    : wb.SheetNames.filter((n) => upper(n) !== upper(legendSheetName));

  const allAssignments = [];
  const teams = new Set();
  const people = new Set();

  for (const name of sheetsToParse) {
    try {
      const res = parseMonthSheet(wb, name, legendByCode);
      allAssignments.push(...res.assignments);
      res.teams.forEach((t) => teams.add(t));
      res.people.forEach((p) => people.add(p));
    } catch (err) {
      logger.error(`[excel] falha ao parsear aba "${name}": ${err.message}`);
    }
  }

  return {
    legend,
    assignments: allAssignments,
    teams: [...teams],
    people: [...people],
    months: sheetsToParse,
    stats: {
      sheets: sheetsToParse.length,
      assignments: allAssignments.length,
      people: people.size,
      teams: teams.size,
      legendEntries: legend.length,
    },
  };
}

export default { parseWorkbook };
