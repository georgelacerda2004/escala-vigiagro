import { prisma } from '../config/prisma.js';
import { shiftWindow, regimeOf, next21, is12h } from './shiftRules.js';

const ABSENT = new Set(['f', 'l', 'v', 'c']); // ferias / licenca / viagem / compromisso

// Rotulo amigavel por codigo de ausencia para exibir no calendario.
const ABSENT_LABEL = { f: 'Férias', l: 'Licença', v: 'Viagem', c: 'Compromisso' };

// Data "pura" YYYY-MM-DD a partir dos componentes UTC (a data e salva como
// meia-noite UTC). Evita o deslocamento de -1 dia no fuso do Brasil (UTC-3).
function ymd(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
    d.getUTCDate()
  ).padStart(2, '0')}`;
}

function isRealShift(a) {
  if (!a) return false;
  if (a.hours && a.hours > 0) return true;
  return !ABSENT.has(a.shiftType?.code);
}

// Acrescenta regime/horario/sigla a uma atribuicao.
function enrich(a) {
  const w = shiftWindow(a.person.name, a.date);
  const code = (a.shiftType?.code || a.rawValue || '').toLowerCase();
  const ausente = ABSENT.has(code);
  return {
    id: a.id,
    date: ymd(a.date), // string YYYY-MM-DD (sem fuso)
    pessoa: a.person.name,
    personId: a.personId,
    equipe: a.person.team?.name || null,
    sigla: a.person.team?.sigla || null,
    funcao: a.person.team?.descricao || null,
    codigo: a.rawValue,
    tipo: a.shiftType?.label || a.rawValue,
    cor: a.shiftType?.color || null,
    horas: a.hours,
    regime: w.regime,
    horario: w.horario,
    inicio: w.start,
    fim: w.end,
    ausente,
    motivoAusencia: ausente ? ABSENT_LABEL[code] || 'Ausente' : null,
  };
}

function dateRange(from, to) {
  const where = {};
  if (from) where.gte = new Date(from);
  if (to) where.lte = new Date(to);
  return Object.keys(where).length ? where : undefined;
}

/** Lista atribuicoes com filtros: servidor, data, turno, equipe, mes. */
export async function listShifts(q = {}) {
  const where = {};
  const dr = dateRange(q.from, q.to);
  if (dr) where.date = dr;
  if (q.date) where.date = new Date(q.date);
  if (q.monthSheet) where.monthSheet = String(q.monthSheet).toUpperCase();
  if (q.shiftTypeId) where.shiftTypeId = Number(q.shiftTypeId);
  if (q.shiftCode) where.shiftType = { code: String(q.shiftCode) };

  if (q.personId) where.personId = Number(q.personId);
  if (q.person) where.person = { name: { contains: String(q.person) } };
  if (q.teamId) where.person = { ...(where.person || {}), teamId: Number(q.teamId) };
  if (q.team)
    where.person = { ...(where.person || {}), team: { name: { contains: String(q.team) } } };

  const take = Math.min(Number(q.limit) || 1000, 5000);
  const skip = Number(q.offset) || 0;

  const noteWhere = dr ? { date: dr } : q.date ? { date: new Date(q.date) } : {};

  const [rows, total, notes] = await Promise.all([
    prisma.shiftAssignment.findMany({
      where,
      include: { person: { include: { team: true } }, shiftType: true },
      orderBy: [{ date: 'asc' }, { personId: 'asc' }],
      take,
      skip,
    }),
    prisma.shiftAssignment.count({ where }),
    prisma.dayNote.findMany({
      where: noteWhere,
      orderBy: [{ date: 'asc' }, { teamSigla: 'asc' }],
    }),
  ]);
  const dayNotes = notes.map((n) => ({
    id: n.id,
    date: ymd(n.date),
    teamSigla: n.teamSigla,
    text: n.text,
  }));
  return { items: rows.map(enrich), dayNotes, total, take, skip };
}

export async function dashboardSummary() {
  const now = new Date();
  const isoToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;

  // janela ampla cobrindo plantoes que cruzam a meia-noite
  const lo = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const hi = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 2));

  const [around, peopleCount, teamCount, lastSync] = await Promise.all([
    prisma.shiftAssignment.findMany({
      where: { date: { gte: lo, lte: hi } },
      include: { person: { include: { team: true } }, shiftType: true },
    }),
    prisma.person.count({ where: { active: true } }),
    prisma.team.count(),
    prisma.settings.findUnique({ where: { key: 'lastSyncAt' } }),
  ]);

  const reais = around.filter(isRealShift).map(enrich);
  const proxTroca = next21(now);

  const isK9 = (r) => /K9/i.test(r.sigla || '');

  const plantaoAtual = reais
    .filter((r) => now >= r.inicio && now < r.fim && !isK9(r))
    .sort((a, b) => a.pessoa.localeCompare(b.pessoa));

  const entram21h = reais
    .filter((r) => r.regime === '24h' && !isK9(r) && r.inicio.getTime() === proxTroca.getTime())
    .sort((a, b) => a.pessoa.localeCompare(b.pessoa));

  // 12h (Damata/Thiago) que iniciam na proxima manha 09h
  const prox09 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0, 0);
  if (now >= prox09) prox09.setDate(prox09.getDate() + 1);
  const entram09h = reais
    .filter((r) => r.regime === '12h' && !isK9(r) && r.inicio.getTime() === prox09.getTime())
    .sort((a, b) => a.pessoa.localeCompare(b.pessoa));

  const todayYmd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;

  const hojeReais = reais.filter((r) => r.date === todayYmd);

  // Servidores K9 escalados hoje (sem horario de troca, regime distinto)
  const plantaoK9 = hojeReais
    .filter(isK9)
    .sort((a, b) => a.pessoa.localeCompare(b.pessoa));

  // Voos / observacoes do K9 para hoje
  const todayDateUtc = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const voosHojeRaw = await prisma.dayNote.findMany({
    where: { date: todayDateUtc },
    orderBy: [{ teamSigla: 'asc' }],
  });
  const voosHoje = voosHojeRaw.map((n) => ({
    id: n.id,
    teamSigla: n.teamSigla,
    text: n.text,
  }));
  const ausencias = around.filter(
    (a) => ymd(a.date) === todayYmd && ABSENT.has(a.shiftType?.code)
  ).length;

  // distribuicao por tipo (plantonistas de hoje)
  const porTurnoMap = new Map();
  for (const r of hojeReais) {
    const k = r.tipo || r.codigo;
    porTurnoMap.set(k, (porTurnoMap.get(k) || 0) + 1);
  }

  return {
    date: isoToday,
    agora: now.toISOString(),
    proximaTroca: proxTroca.toISOString(),
    servidores: peopleCount,
    equipes: teamCount,
    plantoesHoje: hojeReais.length,
    ausencias,
    plantaoAtual,
    plantaoK9,
    voosHoje,
    entram21h,
    entram09h,
    porTurno: [...porTurnoMap.entries()].map(([tipo, total]) => ({ tipo, total })),
    ultimaSync: lastSync?.value || null,
  };
}

/** Calendario mensal de uma pessoa. month = "YYYY-MM". */
export async function calendarMonth(personId, month) {
  const m = /^(\d{4})-(\d{2})$/.exec(month || '');
  const now = new Date();
  const year = m ? Number(m[1]) : now.getFullYear();
  const mon = m ? Number(m[2]) : now.getMonth() + 1; // 1-12

  const person = await prisma.person.findUnique({
    where: { id: Number(personId) },
    include: { team: true },
  });
  if (!person) return null;

  const lo = new Date(Date.UTC(year, mon - 1, 1));
  const hi = new Date(Date.UTC(year, mon, 0)); // ultimo dia do mes
  const daysInMonth = hi.getUTCDate();

  const assigns = await prisma.shiftAssignment.findMany({
    where: { personId: person.id, date: { gte: lo, lte: hi } },
    include: { person: { include: { team: true } }, shiftType: true },
  });
  const byDay = new Map();
  for (const a of assigns) byDay.set(a.date.getUTCDate(), a);

  const dows = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const days = [];
  let totalHoras = 0;
  let diasTrabalhados = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const a = byDay.get(d);
    const dateUTC = new Date(Date.UTC(year, mon - 1, d));
    const base = {
      day: d,
      date: `${year}-${String(mon).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      dow: dows[dateUTC.getUTCDay()],
    };
    if (a && isRealShift(a)) {
      const w = shiftWindow(person.name, a.date);
      totalHoras += a.hours || 0;
      diasTrabalhados += 1;
      days.push({
        ...base,
        codigo: a.rawValue,
        tipo: a.shiftType?.label || a.rawValue,
        cor: a.shiftType?.color || null,
        horas: a.hours,
        regime: w.regime,
        horario: w.horario,
      });
    } else if (a) {
      days.push({
        ...base,
        codigo: a.rawValue,
        tipo: a.shiftType?.label || a.rawValue,
        cor: a.shiftType?.color || '#94a3b8',
        horas: 0,
        regime: null,
        horario: null,
        ausencia: true,
      });
    } else {
      days.push({ ...base, vazio: true });
    }
  }

  return {
    person: {
      id: person.id,
      nome: person.name,
      sigla: person.team?.sigla || null,
      funcao: person.team?.descricao || null,
      regime: is12h(person.name) ? '12h' : '24h',
    },
    month: `${year}-${String(mon).padStart(2, '0')}`,
    year,
    mon,
    days,
    resumo: { totalHoras, diasTrabalhados },
  };
}
