import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  FileDown, FileSpreadsheet, Printer, Search, CalendarRange, Table2,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { api } from '../api/client.js';
import { getSocket } from '../lib/socket.js';
import { Spinner, Badge, EmptyState } from '../components/ui.jsx';
import { exportExcel, exportPDF, printElement } from '../lib/exporters.js';
import TeamCalendar from '../components/TeamCalendar.jsx';

export default function Escala() {
  const qc = useQueryClient();
  const [view, setView] = useState('cal'); // cal | tabela
  const [calMode, setCalMode] = useState('mes'); // semana | mes | ano
  const [cursor, setCursor] = useState(dayjs());
  const [filters, setFilters] = useState({ person: '', team: '', shiftCode: '' });
  const [search, setSearch] = useState('');

  const { data: meta } = useQuery({
    queryKey: ['meta'],
    queryFn: async () => (await api.get('/shifts/meta')).data,
  });

  const range = (() => {
    if (calMode === 'semana') return [cursor.startOf('week'), cursor.endOf('week')];
    if (calMode === 'ano') return [cursor.startOf('year'), cursor.endOf('year')];
    return [cursor.startOf('month'), cursor.endOf('month')];
  })();

  const params = useMemo(() => {
    const p = {
      from: range[0].format('YYYY-MM-DD'),
      to: range[1].format('YYYY-MM-DD'),
      limit: 5000,
    };
    if (filters.person) p.person = filters.person;
    if (filters.team) p.team = filters.team;
    if (filters.shiftCode) p.shiftCode = filters.shiftCode;
    return p;
  }, [range, filters]);

  const { data, isLoading } = useQuery({
    queryKey: ['shifts', params],
    queryFn: async () => (await api.get('/shifts', { params })).data,
  });

  useEffect(() => {
    const s = getSocket();
    const refresh = () => qc.invalidateQueries({ queryKey: ['shifts'] });
    s.on('sync:done', refresh);
    s.on('shift:changed', refresh);
    return () => {
      s.off('sync:done', refresh);
      s.off('shift:changed', refresh);
    };
  }, [qc]);

  const items = data?.items || [];
  const dayNotes = data?.dayNotes || [];
  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(
      (i) =>
        i.pessoa?.toLowerCase().includes(q) ||
        i.sigla?.toLowerCase().includes(q) ||
        i.tipo?.toLowerCase().includes(q)
    );
  }, [items, search]);

  const rows = filtered.map((i) => ({
    Data: dayjs(i.date).format('DD/MM/YYYY'),
    Servidor: i.pessoa,
    Funcao: i.sigla || '-',
    Turno: i.tipo,
    Regime: i.regime || '-',
    Horario: i.horario || '-',
    Horas: i.horas,
  }));

  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));
  const step = (d) => {
    const u = calMode === 'semana' ? 'week' : calMode === 'ano' ? 'year' : 'month';
    setCursor((c) => c.add(d, u));
  };
  const titulo =
    calMode === 'semana'
      ? `Semana de ${range[0].format('DD/MM')} a ${range[1].format('DD/MM/YYYY')}`
      : calMode === 'ano'
        ? `Ano de ${cursor.year()}`
        : cursor.format('MMMM [de] YYYY');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Escala da equipe</h1>
        <div className="flex gap-2">
          <div className="flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700">
            <button
              onClick={() => setView('cal')}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm ${view === 'cal' ? 'bg-brand-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              <CalendarRange size={15} /> Calendário
            </button>
            <button
              onClick={() => setView('tabela')}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm ${view === 'tabela' ? 'bg-brand-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              <Table2 size={15} /> Tabela
            </button>
          </div>
          {view === 'tabela' && (
            <>
              <button className="btn-ghost" onClick={() => exportExcel(rows, 'escala-vigiagro.xlsx')}>
                <FileSpreadsheet size={16} /> Excel
              </button>
              <button
                className="btn-ghost"
                onClick={() =>
                  exportPDF(
                    [
                      { header: 'Data', key: 'Data' },
                      { header: 'Servidor', key: 'Servidor' },
                      { header: 'Função', key: 'Funcao' },
                      { header: 'Turno', key: 'Turno' },
                      { header: 'Horário', key: 'Horario' },
                    ],
                    rows,
                    `Escala VIGIAGRO ${titulo}`
                  )
                }
              >
                <FileDown size={16} /> PDF
              </button>
              <button
                className="btn-ghost"
                onClick={() => {
                  const html =
                    '<table><thead><tr><th>Data</th><th>Servidor</th><th>Função</th><th>Turno</th><th>Horário</th></tr></thead><tbody>' +
                    rows
                      .map(
                        (r) =>
                          `<tr><td>${r.Data}</td><td>${r.Servidor}</td><td>${r.Funcao}</td><td>${r.Turno}</td><td>${r.Horario}</td></tr>`
                      )
                      .join('') +
                    '</tbody></table>';
                  printElement(html, `Escala VIGIAGRO ${titulo}`);
                }}
              >
                <Printer size={16} /> Imprimir
              </button>
            </>
          )}
        </div>
      </div>

      {meta?.siglaLegenda && (
        <div className="card flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
          <span className="font-semibold text-slate-600 dark:text-slate-300">Legenda:</span>
          {meta.siglaLegenda.map((s) => (
            <span key={s.sigla}>
              <b className="text-brand-700 dark:text-brand-400">{s.sigla}</b> = {s.descricao}
            </span>
          ))}
          <span>
            <b>24h</b>: inicia 21h do dia e sai 21h do dia seguinte ·{' '}
            <b className="text-amber-600">12h</b> (Damata/Thiago): 09h–21h
          </span>
        </div>
      )}

      <div className="card grid grid-cols-2 gap-3 md:grid-cols-4">
        <div>
          <label className="label">Servidor</label>
          <select className="input" value={filters.person} onChange={set('person')}>
            <option value="">Todos</option>
            {meta?.people?.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Equipe</label>
          <select className="input" value={filters.team} onChange={set('team')}>
            <option value="">Todas</option>
            {meta?.teams?.map((t) => (
              <option key={t.id} value={t.name}>
                {t.sigla || t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Turno</label>
          <select className="input" value={filters.shiftCode} onChange={set('shiftCode')}>
            <option value="">Todos</option>
            {meta?.types?.map((t) => (
              <option key={t.id} value={t.code}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Pesquisa rápida</label>
          <div className="flex items-center gap-2">
            <Search size={16} className="text-slate-400" />
            <input
              className="input"
              placeholder="servidor, função, turno"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {view === 'cal' ? (
        <div className="card">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700">
              {[
                ['semana', 'Semana'],
                ['mes', 'Mês'],
                ['ano', 'Todos os meses'],
              ].map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setCalMode(v)}
                  className={`px-3 py-1.5 text-sm ${calMode === v ? 'bg-brand-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <button className="btn-ghost" onClick={() => step(-1)}>
                <ChevronLeft size={16} />
              </button>
              <span className="min-w-[180px] text-center text-sm font-semibold capitalize">
                {titulo}
              </span>
              <button className="btn-ghost" onClick={() => step(1)}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          {isLoading ? (
            <Spinner />
          ) : (
            <TeamCalendar
              items={filtered}
              dayNotes={dayNotes}
              mode={calMode}
              cursor={cursor}
              onPickMonth={(d) => {
                setCursor(d);
                setCalMode('mes');
              }}
            />
          )}
        </div>
      ) : (
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button className="btn-ghost" onClick={() => step(-1)}>
                <ChevronLeft size={16} />
              </button>
              <span className="min-w-[180px] text-center text-sm font-semibold capitalize">
                {titulo}
              </span>
              <button className="btn-ghost" onClick={() => step(1)}>
                <ChevronRight size={16} />
              </button>
            </div>
            <span className="text-xs text-slate-400">{filtered.length} registros</span>
          </div>
          {isLoading ? (
            <Spinner />
          ) : filtered.length === 0 ? (
            <EmptyState>Nenhum plantão no período.</EmptyState>
          ) : (
            <div className="max-h-[60vh] overflow-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-white dark:bg-slate-900">
                  <tr>
                    <th className="th">Data</th>
                    <th className="th">Servidor</th>
                    <th className="th">Função</th>
                    <th className="th">Turno</th>
                    <th className="th">Regime</th>
                    <th className="th">Horário</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((i) => (
                    <tr key={i.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="td">{dayjs(i.date).format('DD/MM/YYYY')}</td>
                      <td className="td font-medium">{i.pessoa}</td>
                      <td className="td">{i.sigla || '-'}</td>
                      <td className="td">
                        <Badge color={i.cor}>{i.tipo}</Badge>
                      </td>
                      <td className="td">
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs font-bold ${i.regime === '12h' ? 'bg-amber-100 text-amber-800' : 'bg-brand-100 text-brand-800'}`}
                        >
                          {i.regime || '-'}
                        </span>
                      </td>
                      <td className="td text-sm">{i.horario || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
