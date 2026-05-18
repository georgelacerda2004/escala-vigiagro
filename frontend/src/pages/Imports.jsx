import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { RefreshCw, FileUp, Upload } from 'lucide-react';
import { api } from '../api/client.js';
import { getSocket } from '../lib/socket.js';
import { Spinner, EmptyState } from '../components/ui.jsx';

export default function Imports() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data: files, isLoading } = useQuery({
    queryKey: ['import-files'],
    queryFn: async () => (await api.get('/import/files')).data,
  });
  const { data: logs } = useQuery({
    queryKey: ['sync-logs'],
    queryFn: async () => (await api.get('/logs/sync', { params: { limit: 20 } })).data,
  });

  useEffect(() => {
    const s = getSocket();
    const refresh = () => {
      qc.invalidateQueries({ queryKey: ['sync-logs'] });
      qc.invalidateQueries({ queryKey: ['import-files'] });
    };
    s.on('sync:done', refresh);
    s.on('sync:error', refresh);
    return () => {
      s.off('sync:done', refresh);
      s.off('sync:error', refresh);
    };
  }, [qc]);

  const runImport = async (file) => {
    setBusy(true);
    try {
      const { data } = await api.post('/import/excel', file ? { file } : {});
      toast.success(`Importado: +${data.importados} ~${data.atualizados} -${data.removidos}`);
      qc.invalidateQueries({ queryKey: ['sync-logs'] });
    } catch {
      /* tratado no interceptor */
    } finally {
      setBusy(false);
    }
  };

  const uploadFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!/\.xlsx$/i.test(f.name)) return toast.error('Selecione um arquivo .xlsx');
    setBusy(true);
    try {
      const contentBase64 = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = reject;
        r.readAsDataURL(f);
      });
      const { data } = await api.post('/import/upload', { filename: f.name, contentBase64 });
      toast.success(`Planilha enviada: +${data.importados} ~${data.atualizados} -${data.removidos}`);
      qc.invalidateQueries({ queryKey: ['sync-logs'] });
      qc.invalidateQueries({ queryKey: ['import-files'] });
    } catch {
      /* tratado no interceptor */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Importações</h1>
        <div className="flex flex-wrap gap-2">
          <label className="btn-ghost cursor-pointer">
            <Upload size={16} /> Enviar planilha (.xlsx)
            <input
              type="file"
              accept=".xlsx"
              className="hidden"
              disabled={busy}
              onChange={uploadFile}
            />
          </label>
          <button className="btn-primary" disabled={busy} onClick={() => runImport(null)}>
            <RefreshCw size={16} className={busy ? 'animate-spin' : ''} /> Importar mais recente
          </button>
        </div>
      </div>

      <div className="card text-xs text-slate-500">
        <b>Enviar planilha</b>: use quando o sistema estiver na nuvem (sem acesso
        ao Z:). O arquivo é enviado pelo navegador e importado na hora.
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">Arquivos na pasta monitorada</h2>
        <p className="mb-3 text-xs text-slate-400">{files?.dir}</p>
        {isLoading ? (
          <Spinner />
        ) : !files?.files?.length ? (
          <EmptyState>Nenhum .xlsx na pasta. Coloque a planilha em /excel.</EmptyState>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Arquivo</th>
                <th className="th">Tamanho</th>
                <th className="th">Modificado</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {files.files.map((f) => (
                <tr key={f.file}>
                  <td className="td font-medium">{f.file}</td>
                  <td className="td">{(f.size / 1024).toFixed(0)} KB</td>
                  <td className="td">{dayjs(f.modifiedAt).format('DD/MM/YYYY HH:mm')}</td>
                  <td className="td">
                    <button className="btn-ghost" disabled={busy} onClick={() => runImport(f.file)}>
                      <FileUp size={14} /> Importar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">Historico de sincronizacao</h2>
        {!logs?.items?.length ? (
          <EmptyState>Sem sincronizacoes ainda.</EmptyState>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Data</th>
                <th className="th">Arquivo</th>
                <th className="th">Status</th>
                <th className="th">+ / ~ / -</th>
                <th className="th">Mensagem</th>
              </tr>
            </thead>
            <tbody>
              {logs.items.map((l) => (
                <tr key={l.id}>
                  <td className="td">{dayjs(l.dataSync).format('DD/MM/YYYY HH:mm:ss')}</td>
                  <td className="td">{l.fileName || '-'}</td>
                  <td className="td">
                    <span
                      className={
                        l.status === 'OK'
                          ? 'text-emerald-500'
                          : l.status === 'ERRO'
                            ? 'text-rose-500'
                            : 'text-amber-500'
                      }
                    >
                      {l.status}
                    </span>
                  </td>
                  <td className="td">
                    {l.registrosImportados}/{l.registrosAtualizados}/{l.registrosRemovidos}
                  </td>
                  <td className="td text-xs text-slate-400">{l.mensagem}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
