// Regras de horario de plantao.
//
// - DA MATTA e TIAGO (Damata/Tiago): escala de 12h -> 09:00 ate 21:00 do
//   proprio dia marcado na escala.
// - Demais servidores: escala de 24h -> inicia 21:00 do dia ANTERIOR ao dia
//   marcado e termina 21:00 do dia marcado.

const strip = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

// nomes (normalizados) que trabalham 12h
const TWELVE_H = new Set(['DAMATA', 'DAMATTA', 'TIAGO', 'THIAGO']);

export function is12h(personName) {
  return TWELVE_H.has(strip(personName));
}

export function regimeOf(personName) {
  return is12h(personName) ? '12h' : '24h';
}

// Constroi um Date que representa "hour:00 BRT" do dia (y,m,d).
// Brasil aboliu horario de verao em 2019, entao BRT = UTC-3 fixo.
// Em UTC esse instante e (hour + 3):00 do mesmo dia.
function brtAt(y, m, d, hour) {
  return new Date(Date.UTC(y, m, d, hour + 3, 0, 0, 0));
}

// Extrai Y/M/D do Date salvo (meia-noite UTC) e monta um Date em BRT,
// independente do fuso do processo (Render = UTC; dev local = BRT).
function localAt(dateUTC, day, hour) {
  const y = dateUTC.getUTCFullYear();
  const m = dateUTC.getUTCMonth();
  const d = dateUTC.getUTCDate();
  return brtAt(y, m, d + day, hour);
}

/**
 * Janela de trabalho do plantao.
 * @param {string} personName
 * @param {Date} dateUTC  data marcada na escala (meia-noite UTC)
 * @returns {{regime:string,start:Date,end:Date,horario:string}}
 */
export function shiftWindow(personName, dateUTC) {
  if (is12h(personName)) {
    return {
      regime: '12h',
      start: localAt(dateUTC, 0, 9),
      end: localAt(dateUTC, 0, 21),
      horario: '09h – 21h',
    };
  }
  // 24h: o dia marcado na escala e o dia em que o plantao COMECA as 21h
  // e termina as 21h do dia seguinte.
  return {
    regime: '24h',
    start: localAt(dateUTC, 0, 21), // 21h do dia marcado
    end: localAt(dateUTC, 1, 21), // 21h do dia seguinte
    horario: '21h – 21h (dia seguinte)',
  };
}

export function isWorkingAt(personName, dateUTC, now = new Date()) {
  const w = shiftWindow(personName, dateUTC);
  return now >= w.start && now < w.end;
}

// Proximo horario de troca de 21h BRT a partir de "now" (instante absoluto).
export function next21(now = new Date()) {
  const brt = new Date(now.getTime() - 3 * 3600 * 1000);
  const y = brt.getUTCFullYear();
  const m = brt.getUTCMonth();
  const d = brt.getUTCDate();
  let next = brtAt(y, m, d, 21);
  if (now >= next) next = brtAt(y, m, d + 1, 21);
  return next;
}

// Proxima 09h BRT a partir de "now" (instante absoluto). Usada para o turno 12h.
export function next09(now = new Date()) {
  const brt = new Date(now.getTime() - 3 * 3600 * 1000);
  const y = brt.getUTCFullYear();
  const m = brt.getUTCMonth();
  const d = brt.getUTCDate();
  let next = brtAt(y, m, d, 9);
  if (now >= next) next = brtAt(y, m, d + 1, 9);
  return next;
}
