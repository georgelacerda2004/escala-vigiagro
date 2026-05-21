import { useMemo } from 'react';
import dayjs from 'dayjs';

const WD = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function groupByDay(items) {
  const m = new Map();
  for (const it of items || []) {
    const k = dayjs(it.date).format('YYYY-MM-DD');
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(it);
  }
  for (const arr of m.values()) arr.sort((a, b) => a.pessoa.localeCompare(b.pessoa));
  return m;
}

function groupNotesByDay(notes) {
  const m = new Map();
  for (const n of notes || []) {
    if (!m.has(n.date)) m.set(n.date, []);
    m.get(n.date).push(n);
  }
  return m;
}

// Servidores K9 escalados no dia (codigo do plantao != ausencia).
const ABSENT_CODES = new Set(['f', 'l', 'v', 'c']);
function k9Operators(list) {
  if (!list) return [];
  return list.filter(
    (p) => /K9/i.test(p.sigla || '') && !ABSENT_CODES.has((p.codigo || '').toLowerCase())
  );
}

function Chip({ p, small }) {
  const is12 = p.regime === '12h';
  return (
    <span
      title={`${p.pessoa} · ${p.sigla || ''} · ${p.tipo} · ${p.horario}`}
      className={`block truncate rounded px-1 ${small ? 'text-[10px] leading-4' : 'text-[11px] leading-5'} font-medium`}
      style={{
        backgroundColor: (p.cor || '#94a3b8') + '33',
        borderLeft: `3px solid ${is12 ? '#d97706' : p.cor || '#1f7a3d'}`,
      }}
    >
      {p.pessoa}
      {p.sigla ? <span className="opacity-60"> · {p.sigla}</span> : null}
      {is12 ? <b className="text-amber-600"> 12h</b> : null}
    </span>
  );
}

const todayStr = () => dayjs().format('YYYY-MM-DD');

function DayCell({ date, list, notes, minH = 90, onClick, selected }) {
  const d = dayjs(date);
  const isToday = date === todayStr();
  // Foco principal: plantonistas que NAO sao da equipe K9.
  const principais = (list || []).filter((p) => !/K9/i.test(p.sigla || ''));
  const operadoresK9 = k9Operators(list);
  const k9Notes = (notes || []).filter((n) => /K9/i.test(n.teamSigla || ''));
  const temK9 = operadoresK9.length > 0 || k9Notes.length > 0;
  const Wrapper = onClick ? 'button' : 'div';
  const ringCls = selected
    ? 'border-amber-500 ring-2 ring-amber-400/60'
    : isToday
      ? 'border-brand-600 ring-2 ring-brand-500/40'
      : 'border-slate-200 dark:border-slate-800';
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick ? () => onClick(date) : undefined}
      className={`w-full rounded-lg border p-1.5 text-left ${ringCls} ${onClick ? 'cursor-pointer transition hover:border-brand-500 hover:shadow' : ''}`}
      style={{ minHeight: minH }}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className={`text-xs font-bold ${isToday ? 'text-brand-700 dark:text-brand-400' : ''}`}>
          {d.format('DD')}
        </span>
        <span className="text-[9px] uppercase text-slate-400">{WD[d.day()]}</span>
      </div>
      <div className={temK9 ? 'flex gap-1.5' : ''}>
        <div className={`flex-1 space-y-0.5 ${temK9 ? 'min-w-0' : ''}`}>
          {principais.length ? (
            principais.map((p) => <Chip key={p.id} p={p} />)
          ) : (
            <span className="text-[10px] text-slate-300">—</span>
          )}
        </div>
        {temK9 && (
          <div
            className="w-[42%] shrink-0 rounded border-l border-amber-300 bg-amber-50/60 px-1 py-0.5 text-[9px] leading-3 text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-200"
            title={
              (operadoresK9.length ? `K9: ${operadoresK9.map((p) => p.pessoa).join(', ')}\n` : '') +
              k9Notes.map((n) => n.text).join('\n')
            }
          >
            <div className="mb-0.5 font-bold uppercase tracking-wide opacity-70">K9</div>
            {operadoresK9.map((p) => (
              <div key={p.id} className="truncate font-semibold">
                {p.pessoa}
              </div>
            ))}
            {k9Notes.map((n) =>
              n.text.split('\n').map((line, idx) => (
                <div key={`${n.id}-${idx}`} className="truncate opacity-80">
                  {line}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Wrapper>
  );
}

export default function TeamCalendar({ items, dayNotes, mode, cursor, onPickMonth, onDayClick, selectedDate }) {
  const byDay = useMemo(() => groupByDay(items), [items]);
  const notesByDay = useMemo(() => groupNotesByDay(dayNotes), [dayNotes]);

  if (mode === 'semana') {
    const start = cursor.startOf('week');
    const days = Array.from({ length: 7 }, (_, i) => start.add(i, 'day'));
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {days.map((d) => {
          const k = d.format('YYYY-MM-DD');
          return (
            <DayCell
              key={k}
              date={k}
              list={byDay.get(k)}
              notes={notesByDay.get(k)}
              minH={140}
              onClick={onDayClick}
              selected={selectedDate === k}
            />
          );
        })}
      </div>
    );
  }

  if (mode === 'mes') {
    const first = cursor.startOf('month');
    const lead = first.day();
    const dim = cursor.daysInMonth();
    const cells = [
      ...Array.from({ length: lead }, () => null),
      ...Array.from({ length: dim }, (_, i) => first.add(i, 'day')),
    ];
    return (
      <div className="scroll-x">
        <div className="min-w-[860px]">
          <div className="mb-2 grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase text-slate-400">
            {WD.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {cells.map((d, i) => {
              if (!d) return <div key={`e${i}`} />;
              const k = d.format('YYYY-MM-DD');
              return (
                <DayCell
                  key={k}
                  date={k}
                  list={byDay.get(k)}
                  notes={notesByDay.get(k)}
                  onClick={onDayClick}
                  selected={selectedDate === k}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // mode === 'ano' : 12 mini-meses
  const year = cursor.year();
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {MESES.map((nome, mi) => {
        const first = dayjs(new Date(year, mi, 1));
        const lead = first.day();
        const dim = first.daysInMonth();
        const cells = [
          ...Array.from({ length: lead }, () => null),
          ...Array.from({ length: dim }, (_, i) => first.add(i, 'day')),
        ];
        return (
          <div key={nome} className="rounded-lg border border-slate-200 p-2 dark:border-slate-800">
            <button
              onClick={() => onPickMonth?.(first)}
              className="mb-2 w-full rounded bg-slate-100 py-1 text-sm font-semibold hover:bg-brand-600 hover:text-white dark:bg-slate-800"
            >
              {nome}
            </button>
            <div className="grid grid-cols-7 gap-0.5 text-center text-[8px] text-slate-400">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((w, i) => (
                <div key={i}>{w}</div>
              ))}
            </div>
            <div className="mt-0.5 grid grid-cols-7 gap-0.5">
              {cells.map((d, i) => {
                if (!d) return <div key={`e${i}`} />;
                const k = d.format('YYYY-MM-DD');
                const list = byDay.get(k);
                const isToday = k === todayStr();
                return (
                  <div
                    key={k}
                    title={list ? list.map((p) => p.pessoa).join(', ') : ''}
                    className={`flex h-5 items-center justify-center rounded text-[9px] ${
                      isToday ? 'ring-1 ring-brand-600' : ''
                    }`}
                    style={
                      list && list.length
                        ? { backgroundColor: (list[0].cor || '#1f7a3d') + '55' }
                        : undefined
                    }
                  >
                    {d.format('D')}
                    {list && list.length > 1 ? (
                      <sup className="ml-0.5 text-[7px] text-brand-700">{list.length}</sup>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
