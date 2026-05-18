import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { UserPlus, Trash2, KeyRound } from 'lucide-react';
import { api } from '../api/client.js';
import { Spinner, EmptyState } from '../components/ui.jsx';

const empty = { name: '', email: '', password: '', role: 'OPERATOR' };

export default function Users() {
  const qc = useQueryClient();
  const [form, setForm] = useState(empty);

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users')).data,
  });

  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', form);
      toast.success('Usuario criado');
      setForm(empty);
      qc.invalidateQueries({ queryKey: ['users'] });
    } catch {
      /* tratado */
    }
  };

  const changeRole = async (u, role) => {
    await api.put(`/users/${u.id}`, { role });
    qc.invalidateQueries({ queryKey: ['users'] });
  };

  const toggleActive = async (u) => {
    await api.put(`/users/${u.id}`, { active: !u.active });
    qc.invalidateQueries({ queryKey: ['users'] });
  };

  const remove = async (u) => {
    if (!confirm(`Remover ${u.name}?`)) return;
    await api.delete(`/users/${u.id}`);
    toast.success('Removido');
    qc.invalidateQueries({ queryKey: ['users'] });
  };

  const resetPassword = async (u) => {
    const nova = prompt(`Nova senha para ${u.name} (mín. 6 caracteres):`);
    if (nova == null) return;
    if (nova.length < 6) {
      toast.error('Senha muito curta (mín. 6)');
      return;
    }
    try {
      await api.put(`/users/${u.id}`, { password: nova });
      toast.success(`Senha de ${u.name} redefinida`);
    } catch {
      /* tratado */
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Usuarios</h1>

      <form onSubmit={create} className="card grid grid-cols-1 gap-3 md:grid-cols-5">
        <div>
          <label className="label">Nome</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="label">E-mail</label>
          <input
            className="input"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="label">Senha</label>
          <input
            className="input"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={6}
          />
        </div>
        <div>
          <label className="label">Perfil</label>
          <select
            className="input"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="OPERATOR">Operador</option>
            <option value="SUPERVISOR">Supervisor</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </div>
        <div className="flex items-end">
          <button className="btn-primary w-full">
            <UserPlus size={16} /> Criar
          </button>
        </div>
      </form>

      <div className="card">
        {isLoading ? (
          <Spinner />
        ) : !data?.items?.length ? (
          <EmptyState>Nenhum usuario.</EmptyState>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Nome</th>
                <th className="th">E-mail</th>
                <th className="th">Perfil</th>
                <th className="th">Ativo</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((u) => (
                <tr key={u.id}>
                  <td className="td font-medium">{u.name}</td>
                  <td className="td">{u.email}</td>
                  <td className="td">
                    <select
                      className="input py-1"
                      value={u.role}
                      onChange={(e) => changeRole(u, e.target.value)}
                    >
                      <option value="OPERATOR">Operador</option>
                      <option value="SUPERVISOR">Supervisor</option>
                      <option value="ADMIN">Administrador</option>
                    </select>
                  </td>
                  <td className="td">
                    <button className="btn-ghost py-1" onClick={() => toggleActive(u)}>
                      {u.active ? 'Sim' : 'Nao'}
                    </button>
                  </td>
                  <td className="td">
                    <div className="flex gap-1">
                      <button
                        className="btn-ghost py-1 text-xs"
                        onClick={() => resetPassword(u)}
                        title="Redefinir senha"
                      >
                        <KeyRound size={14} /> Senha
                      </button>
                      <button className="btn-ghost py-1 text-rose-500" onClick={() => remove(u)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
