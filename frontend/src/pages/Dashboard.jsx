import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Clock, ArrowRightLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../api/client.js';
import { getSocket } from '../lib/socket.js';
import { Spinner, EmptyState } from '../components/ui.jsx';
import TeamCalendar from '../components/TeamCalendar.jsx';

function PersonChip({ p }) {
  const is12 = p.regime === '12h';
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
        is12
          ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-300'
          : 'bg-brand-100 text-brand-800 ring-1 ring-brand-500/30'
      }`}
      title={`${p.funcao || ''} · ${p.horario}`}
    >
      {p.pessoa}
      {p.sigla && <span className="text-xs opacity-70">{p.sigla}</span>}
      <span className="rounded bg-black/10 px-1 text-[10px] font-bold">{is12 ? '12h' : '24h'}</span>
    </span>
  );
}

const listNames = (arr) => {
  const n = arr.map((x) => x.pessoa);
  if (!n.length) return 'ninguém';
  if (n.length === 1) return n[0];
  return `${n.slice(0, -1).join(', ')} e ${n[n.length - 1]}`;
};

export default function Dashboard() {
  const qc = useQueryClient();
  const [mode, setMode] = useState('semana'); // semana | mes | ano
  const [cursor, setCursor] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));

  const { data: sum } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get('/dashboard/summary')).data,
    refetchInterval: 60_000,
  });

  const range = (() => {
    if (mode === 'semana')
      return [cursor.startOf('week'), cursor.endOf('week')];
    if (mode === 'mes') return [cursor.startOf('month'), cursor.endOf('month')];
    return [cursor.startOf('year'), cursor.endOf('year')];
  })();

  const { data: sched, isLoading } = useQuery({
    queryKey: ['team-cal', range[0].format('YYYY-MM-DD'), range[1].format('YYYY-MM-DD')],
    queryFn: async () =>
      (
        await api.get('/shifts', {
          params: {
            from: range[0].format('YYYY-MM-DD'),
            to: range[1].format('YYYY-MM-DD'),
            limit: 5000,
          },
        })
      ).data,
  });

  useEffect(() => {
    const s = getSocket();
    const refresh = () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['team-cal'] });
    };
    s.on('sync:done', refresh);
    s.on('shift:changed', refresh);
    return () => {
      s.off('sync:done', refresh);
      s.off('shift:changed', refresh);
    };
  }, [qc]);

  const step = (dir) => {
    const unit = mode === 'semana' ? 'week' : mode === 'mes' ? 'month' : 'year';
    setCursor((c) => c.add(dir, unit));
  };

  // Detalhes do dia selecionado (filtra dos dados ja carregados)
  const dayItems = (sched?.items || []).filter((i) => i.date === selectedDate);
  const dayNonK9 = dayItems.filter((p) => !/K9/i.test(p.sigla || ''));
  const dayPrincipais = dayNonK9.filter((p) => !p.ausente);
  const dayAusentes = dayNonK9.filter((p) => p.ausente);
  const dayK9 = dayItems.filter((p) => /K9/i.test(p.sigla || '') && !p.ausente);
  const dayVoos = (sched?.dayNotes || []).filter(
    (n) => n.date === selectedDate && /K9/i.test(n.teamSigla || '')
  );
  const isSelectedToday = selectedDate === dayjs().format('YYYY-MM-DD');
  const selectedLabel = dayjs(selectedDate).format('dddd, DD/MM/YYYY');

  const titulo =
    mode === 'semana'
      ? `Semana de ${range[0].format('DD/MM')} a ${range[1].format('DD/MM/YYYY')}`
      : mode === 'mes'
        ? cursor.format('MMMM [de] YYYY')
        : `Ano de ${cursor.year()}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Painel de Plantões</h1>
        <p className="text-sm text-slate-500">
          {sum ? dayjs(sum.agora).format('dddd, DD/MM/YYYY HH:mm') : '...'} ·{' '}
          {sum?.ultimaSync ? `sincronizado ${dayjs(sum.ultimaSync).format('DD/MM HH:mm')}` : 'sem sincronização'}
        </p>
      </div>

      {/* Em plantao agora (24h + 12h + K9) */}
      <div className="card border-l-4 border-brand-600">
        <div className="mb-3 flex items-center gap-2 text-brand-700 dark:text-brand-400">
          <Clock size={20} />
          <h2 className="text-lg font-bold">Em plantão agora</h2>
        </div>
        {!sum ? (
          <Spinner />
        ) : (sum.plantaoAtual?.length || 0) === 0 && (!sum.plantaoK9 || sum.plantaoK9.length === 0) ? (
          <EmptyState>Ninguém em plantão neste momento.</EmptyState>
        ) : (
          <div className="flex flex-col gap-4 md:flex-row md:gap-6">
            <div className="flex-1">
              {(sum.plantaoAtual?.length || 0) === 0 ? (
                <p className="text-sm text-slate-400">Ninguém de 24h/12h em plantão agora.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {sum.plantaoAtual.map((p) => (
                    <PersonChip key={p.id} p={p} />
                  ))}
                </div>
              )}
            </div>
            {(sum.plantaoK9?.length > 0 || sum.voosHoje?.length > 0) && (
              <aside className="w-full shrink-0 rounded-lg border border-amber-300 bg-amber-50/60 px-3 py-2 text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-200 md:w-72">
                <div className="mb-1 text-[11px] font-bold uppercase tracking-wide opacity-80">
                  K9 hoje
                </div>
                {sum.plantaoK9?.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {sum.plantaoK9.map((p) => (
                      <span
                        key={p.id}
                        className="rounded-full bg-amber-200/70 px-2 py-0.5 text-xs font-medium dark:bg-amber-800/40"
                        title={`${p.funcao || ''} · ${p.horario || ''}`}
                      >
                        {p.pessoa}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs opacity-70">Sem escalado.</div>
                )}
                {sum.voosHoje?.length > 0 && (
                  <div className="mt-2 space-y-0.5 text-[11px] leading-4 opacity-90">
                    <div className="text-[10px] font-semibold uppercase tracking-wide opacity-60">
                      Voos sugeridos
                    </div>
                    {sum.voosHoje.flatMap((n) =>
                      n.text.split('\n').map((line, i) => (
                        <div key={`${n.id}-${i}`}>{line}</div>
                      ))
                    )}
                  </div>
                )}
              </aside>
            )}
          </div>
        )}
      </div>

      {/* Entram 21h */}
      <div className="card border-l-4 border-gov-yellow">
        <div className="mb-3 flex items-center gap-2 text-amber-600">
          <ArrowRightLeft size={20} />
          <h2 className="text-lg font-bold">
            Próxima troca{' '}
            {sum && (
              <span className="text-sm font-normal text-slate-400">
                ({(() => {
                  const t = dayjs(sum.proximaTroca);
                  const hoje = dayjs().startOf('day');
                  const diff = t.startOf('day').diff(hoje, 'day');
                  const quando =
                    diff === 0 ? 'hoje' : diff === 1 ? 'amanhã' : t.format('ddd DD/MM');
                  return `${quando} às ${t.format('HH:mm')}`;
                })()})
              </span>
            )}
          </h2>
        </div>
        {!sum ? (
          <Spinner />
        ) : sum.entram21h.length === 0 ? (
          <EmptyState>Ninguém de 24h marcado para a próxima troca.</EmptyState>
        ) : (
          <>
            <p className="mb-3 text-slate-600 dark:text-slate-300">
              Assumem às 21h: <b>{listNames(sum.entram21h)}</b>.
            </p>
            <div className="flex flex-wrap gap-2">
              {sum.entram21h.map((p) => (
                <PersonChip key={p.id} p={p} />
              ))}
            </div>
          </>
        )}
        {sum?.entram09h?.length > 0 && (
          <p className="mt-3 text-xs text-slate-500">
            Turno 12h (Damata/Tiago) — {dayjs().hour() >= 9 ? 'amanhã' : 'hoje'} às 09h:{' '}
            <b>{listNames(sum.entram09h)}</b> (sai às 21h).
          </p>
        )}
      </div>

      {/* Detalhes do dia selecionado */}
      <div id="detalhes-dia" className="card border-l-4 border-amber-500">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold capitalize">
              {isSelectedToday ? `Hoje · ${selectedLabel}` : selectedLabel}
            </h2>
            {!isSelectedToday && (
              <button
                className="rounded-full bg-slate-100 px-2 py-0.5 text-xs hover:bg-brand-100 dark:bg-slate-800 dark:hover:bg-brand-900"
                onClick={() => setSelectedDate(dayjs().format('YYYY-MM-DD'))}
              >
                ← voltar p/ hoje
              </button>
            )}
          </div>
          <span className="text-xs text-slate-400">
            clique em outro dia abaixo para trocar
          </span>
        </div>
        {dayItems.length === 0 && dayVoos.length === 0 ? (
          <EmptyState>Nenhum plantonista ou voo registrado neste dia.</EmptyState>
        ) : (
          <div className="flex flex-col gap-4 md:flex-row md:gap-6">
            <div className="flex-1">
              {dayPrincipais.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhum plantonista (24h/12h) neste dia.</p>
              ) : (
                <>
                  <p className="mb-2 text-sm text-slate-600 dark:text-slate-300">
                    Plantonistas:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {dayPrincipais.map((p) => (
                      <PersonChip key={p.id} p={p} />
                    ))}
                  </div>
                </>
              )}
              {dayAusentes.length > 0 && (
                <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold">Ausentes:</span>{' '}
                  {dayAusentes
                    .map((p) => `${p.pessoa} (${p.motivoAusencia || 'ausente'})`)
                    .join(', ')}
                </div>
              )}
            </div>
            {(dayK9.length > 0 || dayVoos.length > 0) && (
              <aside className="w-full shrink-0 rounded-lg border border-amber-300 bg-amber-50/60 px-3 py-2 text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-200 md:w-80">
                <div className="mb-1 text-[11px] font-bold uppercase tracking-wide opacity-80">
                  K9
                </div>
                {dayK9.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {dayK9.map((p) => (
                      <span
                        key={p.id}
                        className="rounded-full bg-amber-200/70 px-2 py-0.5 text-xs font-medium dark:bg-amber-800/40"
                        title={`${p.funcao || ''} · ${p.horario || ''}`}
                      >
                        {p.pessoa}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs opacity-70">Sem servidor escalado.</div>
                )}
                {dayVoos.length > 0 && (
                  <div className="mt-2 space-y-0.5 text-xs leading-5">
                    <div className="text-[10px] font-semibold uppercase tracking-wide opacity-60">
                      Voos sugeridos
                    </div>
                    {dayVoos.flatMap((n) =>
                      n.text.split('\n').map((line, i) => (
                        <div key={`${n.id}-${i}`}>• {line}</div>
                      ))
                    )}
                  </div>
                )}
              </aside>
            )}
          </div>
        )}
      </div>

      {/* Calendario da equipe */}
      <div className="card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Equipe na escala</h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700">
              {[
                ['semana', 'Semana'],
                ['mes', 'Mês'],
                ['ano', 'Todos os meses'],
              ].map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setMode(v)}
                  className={`px-3 py-1.5 text-sm ${
                    mode === v
                      ? 'bg-brand-600 text-white'
                      : 'bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <button className="btn-ghost" onClick={() => step(-1)}>
                <ChevronLeft size={16} />
              </button>
              <span className="min-w-[170px] text-center text-sm font-semibold capitalize">
                {titulo}
              </span>
              <button className="btn-ghost" onClick={() => step(1)}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <Spinner />
        ) : (
          <TeamCalendar
            items={sched?.items || []}
            dayNotes={sched?.dayNotes || []}
            mode={mode}
            cursor={cursor}
            selectedDate={selectedDate}
            onDayClick={(d) => {
              setSelectedDate(d);
              document.getElementById('detalhes-dia')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            onPickMonth={(d) => {
              setCursor(d);
              setMode('mes');
            }}
          />
        )}
        <p className="mt-3 text-[11px] text-slate-400">
          Cada dia mostra quem entra de plantão naquele dia. 24h: inicia 21h e
          sai 21h do dia seguinte. 12h (Damata/Tiago): 09h–21h.
        </p>
      </div>
    </div>
  );
}
