import crypto from 'node:crypto';
import xlsx from 'xlsx';
import { excelSerialToDate, isPlausibleDateSerial } from '../utils/excelDate.js';
import { logger } from '../config/logger.js';
import { mapTeam } from '../services/teamSigla.js';

const MONTHS = [
  'JANEIRO', 'FEVEREIRO', 'MARCO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO',
];

// Rotulos que NUNCA sao pessoas, mesmo aparecendo na coluna A.
const NON_PERSON = new Set([
  'TOTAL', 'TOTAL DE HORAS', 'LEGENDA', 'DATA INICIAL', 'DATA FINAL',
  'FERIADOS', 'OBS', 'OBSERVACOES', 'OBSERVAÇÕES', 'BANCO DE HORAS',
  'VOOS SUGERIDOS', 'VOOS REALIZADOS',
]);

// Marcadores que indicam fim do bloco util de pessoas em uma aba.
// Ao encontrar qualquer um deles na coluna A, paramos de processar linhas
// (evita capturar "Voos sugeridos", "1)", "2)" etc. como pessoas/atribuicoes).
const STOP_LABELS = new Set([
  'VOOS SUGERIDOS', 'VOOS REALIZADOS', 'OBSERVACOES', 'OBSERVAÇÕES',
]);

// Marcador que inicia o bloco de "Voos sugeridos" (observacoes por dia).
const NOTES_START_RE = /^VOOS\s+SUGERIDOS\b/i;
// Marcador que encerra esse bloco (qualquer rotulo abaixo).
const NOTES_END_RE = /^VOOS\s+REALIZADOS\b|^OBSERVA|^TOTAL\b/i;

// Padroes que indicam cabecalho de equipe (mesmo que a linha tenha valores
// digitados por engano nos dias). Cobre "EQUIPE- K9", "AFFA-K9", "AFFA MV" etc.
const TEAM_HINT_RE = /^(EQUIPE\b|AFF?A\b)|\bK9\b/i;

const norm = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
const upper = (v) => norm(v).toUpperCase();

function sha1(s) {
  return crypto.createHash('sha1').update(s).digest('hex');
}

/**
 * Le a aba LEGENDA aceitando dois formatos:
 *  - ALA: TIPO(A) | COR(B) | SIGLA(C) | HORAS(D)            (codigo em C)
 *  - K9 : Legenda(A) | Valor(B) | Horas(C) | Cor(D)         (codigo em A)
 * O formato e detectado pelo cabecalho (linha 0).
 */
function parseLegend(wb, legendSheetName) {
  const sheet = wb.Sheets[legendSheetName] || wb.Sheets[wb.SheetNames.find((n) => upper(n) === upper(legendSheetName))];
  const out = [];
  if (!sheet) {
    logger.warn(`[excel] aba de legenda "${legendSheetName}" nao encontrada`);
    return out;
  }
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
  if (!rows.length) return out;

  // Detecta layout pelo cabecalho
  const header = (rows[0] || []).map((v) => upper(v));
  let codeCol = 2;
  let hoursCol = 3;
  let labelCol = 0;
  let colorCol = 1;
  if (header[0] === 'LEGENDA') {
    codeCol = 0;
    labelCol = 1;
    hoursCol = 2;
    colorCol = 3;
  } else if (header[2] !== 'SIGLA') {
    // Fallback heuristico: se col C nao for "SIGLA", procura coluna
    // com strings curtas (codigos) nas primeiras linhas de dados.
    const sample = rows.slice(1, 8);
    const isShortCode = (v) => {
      const s = norm(v);
      return s.length >= 1 && s.length <= 3;
    };
    const score = (c) => sample.reduce((acc, r) => acc + (r && isShortCode(r[c]) ? 1 : 0), 0);
    if (score(0) > score(2)) {
      codeCol = 0;
      labelCol = 1;
      hoursCol = 2;
      colorCol = 3;
    }
  }

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] || [];
    const codeRaw = r[codeCol];
    if (codeRaw === null || codeRaw === undefined || norm(codeRaw) === '') continue;
    const code = norm(codeRaw);
    const label = norm(r[labelCol]) || code;
    const color = norm(r[colorCol]) || null;
    const hoursRaw = r[hoursCol];
    const hours = typeof hoursRaw === 'number' ? hoursRaw : Number(hoursRaw) || 0;
    out.push({ code, label, color, hours });
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
function parseMonthSheet(wb, sheetName, legendByCode, peopleSeenGlobal) {
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
  // notesByCol[colIndex] = array de strings (1 por '1)', '2)', etc.)
  const notesByCol = new Map();
  let currentTeam = null;

  for (let i = dateRow.idx + 1; i < rows.length; i++) {
    const r = rows[i] || [];
    const a = norm(r[0]);

    // Bloco "Voos sugeridos": coleta valores por dia ate proximo marcador.
    if (a && NOTES_START_RE.test(a)) {
      for (let j = i + 1; j < rows.length; j++) {
        const rj = rows[j] || [];
        const lab = norm(rj[0]);
        if (lab && NOTES_END_RE.test(lab)) break;
        // Coleta linhas "N)" / "N" (numeradas) ou de continuacao (col A vazia).
        if (lab && !/^\d+\)?$/.test(lab)) continue;
        for (const c of dateCols) {
          const v = rj[c];
          if (v === null || v === undefined) continue;
          const s = norm(v);
          if (!s) continue;
          if (!notesByCol.has(c)) notesByCol.set(c, []);
          notesByCol.get(c).push(s);
        }
      }
      break;
    }
    if (a && STOP_LABELS.has(upper(a))) break;

    // pula linhas de data duplicadas
    if (rowIsDateRow(r, dateCols)) continue;

    const hasValues = rowHasDayValues(r, dateCols);

    if (a && !hasValues) {
      // Cabecalho de grupo/equipe (ex.: "AFFA MV") ou rotulo de resumo.
      // Nunca promovemos a "equipe" um nome ja conhecido como pessoa em
      // outra aba (evita que uma linha vazia da pessoa vire team fantasma).
      if (NON_PERSON.has(upper(a))) continue;
      if (peopleSeenGlobal && peopleSeenGlobal.has(a)) continue;
      currentTeam = a;
      continue;
    }
    // Linha com texto + valores que claramente e cabecalho de equipe
    // (ex.: "AFFA- K9" com "CP" digitado por engano em alguns dias).
    if (a && TEAM_HINT_RE.test(a) && !(peopleSeenGlobal && peopleSeenGlobal.has(a))) {
      currentTeam = a;
      continue;
    }
    if (!a) continue; // sem nome -> ignora
    if (NON_PERSON.has(upper(a))) continue;
    // Rejeita "pessoas" cujo nome e apenas numero/marcador (ex.: "1)", "10)")
    if (/^\d+\)?$/.test(a)) continue;

    const personName = a;
    people.add(personName);
    if (peopleSeenGlobal) peopleSeenGlobal.add(personName);
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

  // Consolida notas por dia para a equipe predominante da aba (usa o ultimo
  // currentTeam visto, mapeado para a sigla canonica).
  const dayNotes = [];
  if (notesByCol.size && currentTeam) {
    const teamSigla = mapTeam(currentTeam).sigla;
    for (const [c, lines] of notesByCol.entries()) {
      const date = colDate.get(c);
      if (!date || !lines.length) continue;
      dayNotes.push({
        date,
        teamSigla,
        text: lines.join('\n'),
        monthSheet: sheetName,
      });
    }
  }

  return { assignments, teams, people, dayNotes };
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
  const allDayNotes = [];
  const teams = new Set();
  const people = new Set();
  // Compartilhado entre abas: pessoas ja vistas nao podem ser promovidas a equipe.
  const peopleSeenGlobal = new Set();

  for (const name of sheetsToParse) {
    try {
      const res = parseMonthSheet(wb, name, legendByCode, peopleSeenGlobal);
      allAssignments.push(...res.assignments);
      if (res.dayNotes) allDayNotes.push(...res.dayNotes);
      res.teams.forEach((t) => teams.add(t));
      res.people.forEach((p) => people.add(p));
    } catch (err) {
      logger.error(`[excel] falha ao parsear aba "${name}": ${err.message}`);
    }
  }

  return {
    legend,
    assignments: allAssignments,
    dayNotes: allDayNotes,
    teams: [...teams],
    people: [...people],
    months: sheetsToParse,
    stats: {
      sheets: sheetsToParse.length,
      assignments: allAssignments.length,
      people: people.size,
      teams: teams.size,
      legendEntries: legend.length,
      dayNotes: allDayNotes.length,
    },
  };
}

export default { parseWorkbook };
