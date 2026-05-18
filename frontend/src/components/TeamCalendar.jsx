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

function DayCell({ date, list, minH = 90 }) {
  const d = dayjs(date);
  const isToday = date === todayStr();
  return (
    <div
      className={`rounded-lg border p-1.5 ${
        isToday
          ? 'border-brand-600 ring-2 ring-brand-500/40'
          : 'border-slate-200 dark:border-slate-800'
      }`}
      style={{ minHeight: minH }}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className={`text-xs font-bold ${isToday ? 'text-brand-700 dark:text-brand-400' : ''}`}>
          {d.format('DD')}
        </span>
        <span className="text-[9px] uppercase text-slate-400">{WD[d.day()]}</span>
      </div>
      <div className="space-y-0.5">
        {list && list.length ? (
          list.map((p) => <Chip key={p.id} p={p} />)
        ) : (
          <span className="text-[10px] text-slate-300">—</span>
        )}
      </div>
    </div>
  );
}

export default function TeamCalendar({ items, mode, cursor, onPickMonth }) {
  const byDay = useMemo(() => groupByDay(items), [items]);

  if (mode === 'semana') {
    const start = cursor.startOf('week');
    const days = Array.from({ length: 7 }, (_, i) => start.add(i, 'day'));
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {days.map((d) => (
          <DayCell
            key={d.format('YYYY-MM-DD')}
            date={d.format('YYYY-MM-DD')}
            list={byDay.get(d.format('YYYY-MM-DD'))}
            minH={120}
          />
        ))}
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
        <div className="min-w-[680px]">
          <div className="mb-2 grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase text-slate-400">
            {WD.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {cells.map((d, i) =>
              d ? (
                <DayCell
                  key={d.format('YYYY-MM-DD')}
                  date={d.format('YYYY-MM-DD')}
                  list={byDay.get(d.format('YYYY-MM-DD'))}
                />
              ) : (
                <div key={`e${i}`} />
              )
            )}
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
