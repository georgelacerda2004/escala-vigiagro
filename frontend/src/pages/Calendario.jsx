import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { Spinner, EmptyState } from '../components/ui.jsx';

const WD = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function Calendario() {
  const { user, can } = useAuth();
  const [cursor, setCursor] = useState(dayjs());
  const [personId, setPersonId] = useState('');

  const month = cursor.format('YYYY-MM');
  const isManager = can('SUPERVISOR');

  const { data: meta } = useQuery({
    queryKey: ['meta'],
    queryFn: async () => (await api.get('/shifts/meta')).data,
    enabled: isManager,
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['calendar', month, personId || user?.personId || 'me'],
    queryFn: async () => {
      const params = { month };
      if (isManager && personId) params.personId = personId;
      return (await api.get('/calendar', { params })).data;
    },
  });

  const cells = useMemo(() => {
    if (!data) return [];
    const first = dayjs(`${data.month}-01`);
    const lead = first.day(); // 0=Dom
    const arr = Array.from({ length: lead }, () => null);
    return arr.concat(data.days);
  }, [data]);

  const naoVinculado =
    isError && (error?.response?.status === 404) && !isManager;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">
          {isManager ? 'Calendário' : 'Meu Calendário'}
        </h1>
        <div className="flex items-center gap-2">
          {isManager && (
            <select
              className="input"
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
            >
              <option value="">{user?.personId ? 'Eu' : 'Selecione um servidor'}</option>
              {meta?.people?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.team?.sigla ? `(${p.team.sigla})` : ''}
                </option>
              ))}
            </select>
          )}
          <button className="btn-ghost" onClick={() => setCursor(cursor.subtract(1, 'month'))}>
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-[150px] text-center font-semibold capitalize">
            {cursor.format('MMMM [de] YYYY')}
          </span>
          <button className="btn-ghost" onClick={() => setCursor(cursor.add(1, 'month'))}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {naoVinculado ? (
        <EmptyState>
          Seu usuário ainda não está vinculado a um servidor da escala. Peça ao administrador.
        </EmptyState>
      ) : isLoading ? (
        <Spinner />
      ) : !data ? (
        <EmptyState>Selecione um servidor.</EmptyState>
      ) : (
        <>
          <div className="card flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-lg font-bold">{data.person.nome}</div>
              <div className="text-sm text-slate-500">
                {data.person.sigla ? `${data.person.sigla} · ` : ''}
                {data.person.funcao || ''} · regime{' '}
                <b className={data.person.regime === '12h' ? 'text-amber-600' : 'text-brand-700'}>
                  {data.person.regime}
                </b>
              </div>
            </div>
            <div className="flex gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-brand-700 dark:text-brand-400">
                  {data.resumo.diasTrabalhados}
                </div>
                <div className="text-xs text-slate-400">dias</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-brand-700 dark:text-brand-400">
                  {data.resumo.totalHoras}h
                </div>
                <div className="text-xs text-slate-400">no mês</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="scroll-x">
            <div className="min-w-[680px]">
            <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase text-slate-400">
              {WD.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {cells.map((c, idx) => {
                if (!c) return <div key={`e${idx}`} />;
                const hoje = c.date === dayjs().format('YYYY-MM-DD');
                const trabalha = c.horas > 0 && !c.ausencia;
                return (
                  <div
                    key={c.date}
                    className={`min-h-[78px] rounded-lg border p-2 text-sm ${
                      hoje
                        ? 'border-brand-600 ring-2 ring-brand-500/40'
                        : 'border-slate-200 dark:border-slate-800'
                    } ${trabalha ? '' : 'bg-slate-50 dark:bg-slate-900/40'}`}
                    style={trabalha && c.cor ? { backgroundColor: c.cor + '33' } : undefined}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-bold ${hoje ? 'text-brand-700 dark:text-brand-400' : ''}`}>
                        {c.day}
                      </span>
                      <span className="text-[10px] text-slate-400">{c.dow}</span>
                    </div>
                    {c.vazio ? (
                      <div className="mt-2 text-[11px] text-slate-300">—</div>
                    ) : c.ausencia ? (
                      <div className="mt-1 text-[11px] font-medium text-slate-500">{c.tipo}</div>
                    ) : (
                      <div className="mt-1">
                        <div className="text-[11px] font-semibold">{c.tipo}</div>
                        <div className="text-[10px] text-slate-500">{c.horario}</div>
                        <span
                          className={`mt-1 inline-block rounded px-1 text-[9px] font-bold ${
                            c.regime === '12h'
                              ? 'bg-amber-200 text-amber-900'
                              : 'bg-brand-200 text-brand-900'
                          }`}
                        >
                          {c.regime}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
