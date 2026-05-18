import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { Spinner, EmptyState } from '../components/ui.jsx';

export default function Logs() {
  const { can } = useAuth();
  const [tab, setTab] = useState('sync');

  const sync = useQuery({
    queryKey: ['sync-logs-full'],
    queryFn: async () => (await api.get('/logs/sync', { params: { limit: 100 } })).data,
  });
  const audit = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => (await api.get('/logs/audit', { params: { limit: 200 } })).data,
    enabled: can('SUPERVISOR'),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Logs</h1>
      <div className="flex gap-2">
        <button
          className={tab === 'sync' ? 'btn-primary' : 'btn-ghost'}
          onClick={() => setTab('sync')}
        >
          Sincronizacao
        </button>
        {can('SUPERVISOR') && (
          <button
            className={tab === 'audit' ? 'btn-primary' : 'btn-ghost'}
            onClick={() => setTab('audit')}
          >
            Auditoria
          </button>
        )}
      </div>

      {tab === 'sync' && (
        <div className="card">
          {sync.isLoading ? (
            <Spinner />
          ) : !sync.data?.items?.length ? (
            <EmptyState>Sem registros.</EmptyState>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Data</th>
                  <th className="th">Arquivo</th>
                  <th className="th">Status</th>
                  <th className="th">Dur.</th>
                  <th className="th">Mensagem</th>
                </tr>
              </thead>
              <tbody>
                {sync.data.items.map((l) => (
                  <tr key={l.id}>
                    <td className="td">{dayjs(l.dataSync).format('DD/MM/YY HH:mm:ss')}</td>
                    <td className="td">{l.fileName || '-'}</td>
                    <td className="td">{l.status}</td>
                    <td className="td">{l.durationMs}ms</td>
                    <td className="td text-xs text-slate-400">{l.mensagem}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'audit' && can('SUPERVISOR') && (
        <div className="card">
          {audit.isLoading ? (
            <Spinner />
          ) : !audit.data?.items?.length ? (
            <EmptyState>Sem registros.</EmptyState>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Data</th>
                  <th className="th">Usuario</th>
                  <th className="th">Acao</th>
                  <th className="th">Entidade</th>
                  <th className="th">Detalhe</th>
                  <th className="th">IP</th>
                </tr>
              </thead>
              <tbody>
                {audit.data.items.map((l) => (
                  <tr key={l.id}>
                    <td className="td">{dayjs(l.createdAt).format('DD/MM/YY HH:mm:ss')}</td>
                    <td className="td">{l.user?.name || '-'}</td>
                    <td className="td">{l.action}</td>
                    <td className="td">{l.entity || '-'}</td>
                    <td className="td text-xs text-slate-400">{l.detail}</td>
                    <td className="td text-xs">{l.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
