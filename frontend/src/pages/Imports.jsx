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
    const onDone = (payload) => {
      const i = payload?.importados ?? 0;
      const a = payload?.atualizados ?? 0;
      const r = payload?.removidos ?? 0;
      toast.success(`ImportaÃ§Ã£o concluÃ­da: +${i} ~${a} -${r}`);
      qc.invalidateQueries({ queryKey: ['sync-logs'] });
      qc.invalidateQueries({ queryKey: ['import-files'] });
    };
    const onErr = (payload) => {
      toast.error(`Falha na importaÃ§Ã£o: ${payload?.error || 'erro desconhecido'}`);
      qc.invalidateQueries({ queryKey: ['sync-logs'] });
    };
    s.on('sync:done', onDone);
    s.on('sync:error', onErr);
    return () => {
      s.off('sync:done', onDone);
      s.off('sync:error', onErr);
    };
  }, [qc]);

  const runImport = async (file) => {
    setBusy(true);
    try {
      await api.post('/import/excel', file ? { file } : {});
      toast.success('ImportaÃ§Ã£o iniciada â€” vocÃª serÃ¡ notificado ao concluir.');
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
      await api.post('/import/upload', { filename: f.name, contentBase64 });
      toast.success('Planilha enviada â€” processando em segundo plano. VocÃª serÃ¡ notificado.');
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
        <h1 className="text-2xl font-bold">ImportaÃ§Ãµes</h1>
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
        ao Z:). O arquivo Ã© enviado pelo navegador e importado na hora.
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