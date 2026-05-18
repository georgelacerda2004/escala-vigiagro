import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { DatabaseBackup, KeyRound } from 'lucide-react';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { Spinner, EmptyState } from '../components/ui.jsx';

export default function Settings() {
  const { user, can } = useAuth();
  const qc = useQueryClient();

  const backups = useQuery({
    queryKey: ['backups'],
    queryFn: async () => (await api.get('/dashboard/backups')).data,
    enabled: can('ADMIN'),
  });

  const runBackup = async () => {
    try {
      await api.post('/dashboard/backups/run');
      toast.success('Backup gerado');
      qc.invalidateQueries({ queryKey: ['backups'] });
    } catch {
      /* tratado */
    }
  };

  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [savingPwd, setSavingPwd] = useState(false);
  const changePassword = async (e) => {
    e.preventDefault();
    if (pwd.newPassword.length < 6) return toast.error('Nova senha: mínimo 6 caracteres');
    if (pwd.newPassword !== pwd.confirm) return toast.error('A confirmação não confere');
    setSavingPwd(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: pwd.currentPassword,
        newPassword: pwd.newPassword,
      });
      toast.success('Senha alterada com sucesso');
      setPwd({ currentPassword: '', newPassword: '', confirm: '' });
    } catch {
      /* erro tratado no interceptor */
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Configuracoes</h1>

      <div className="card">
        <h2 className="mb-2 font-semibold">Conta</h2>
        <p className="text-sm">
          {user?.name} · usuário <b>{user?.email}</b> · perfil <b>{user?.role}</b>
        </p>
        {user?.role === 'OPERATOR' && (
          <p className="mt-1 text-xs text-slate-500">
            Seu acesso é <b>somente leitura</b> (consulta da escala). Apenas o
            administrador altera dados.
          </p>
        )}
      </div>

      <form onSubmit={changePassword} className="card max-w-md">
        <h2 className="mb-3 flex items-center gap-2 font-semibold">
          <KeyRound size={18} /> Alterar minha senha
        </h2>
        <label className="label">Senha atual</label>
        <input
          className="input mb-3"
          type="password"
          value={pwd.currentPassword}
          onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })}
          required
        />
        <label className="label">Nova senha (mín. 6)</label>
        <input
          className="input mb-3"
          type="password"
          value={pwd.newPassword}
          onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })}
          required
          minLength={6}
        />
        <label className="label">Confirmar nova senha</label>
        <input
          className="input mb-4"
          type="password"
          value={pwd.confirm}
          onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
          required
        />
        <button className="btn-primary w-full" disabled={savingPwd}>
          {savingPwd ? 'Salvando...' : 'Alterar senha'}
        </button>
      </form>

      {can('ADMIN') && (
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Backups do banco</h2>
            <button className="btn-primary" onClick={runBackup}>
              <DatabaseBackup size={16} /> Gerar agora
            </button>
          </div>
          {backups.isLoading ? (
            <Spinner />
          ) : !backups.data?.items?.length ? (
            <EmptyState>Nenhum backup ainda. Backups automaticos rodam diariamente as 00:00.</EmptyState>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Arquivo</th>
                  <th className="th">Tamanho</th>
                  <th className="th">Data</th>
                </tr>
              </thead>
              <tbody>
                {backups.data.items.map((b) => (
                  <tr key={b.file}>
                    <td className="td font-medium">{b.file}</td>
                    <td className="td">{(b.size / 1024).toFixed(0)} KB</td>
                    <td className="td">{dayjs(b.createdAt).format('DD/MM/YYYY HH:mm')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="card text-sm text-slate-500">
        <h2 className="mb-2 font-semibold text-slate-700 dark:text-slate-200">Sobre a sincronizacao</h2>
        A escala e lida automaticamente da planilha Excel na pasta monitorada. Qualquer
        alteracao no arquivo dispara reimportacao e atualiza esta interface em tempo real
        via WebSocket.
      </div>
    </div>
  );
}
