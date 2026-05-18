import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../auth/AuthContext.jsx';
import Brand from '../components/Brand.jsx';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email.trim().toLowerCase(), password);
      toast.success('Bem-vindo(a)!');
      nav('/');
    } catch {
      /* erro tratado no interceptor */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-b from-brand-50 via-white to-brand-100 p-4 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-brand-100 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:p-8"
      >
        <div className="mb-6 flex flex-col items-center gap-3">
          <Brand size={72} stacked />
          <p className="text-center text-xs text-slate-500">
            Escala de Plantões — Aeroporto de Guarulhos (GRU)
          </p>
        </div>
        <label className="label">Usuário</label>
        <input
          className="input mb-3"
          type="text"
          inputMode="text"
          autoCapitalize="none"
          placeholder="ex.: george"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
        <label className="label">Senha</label>
        <input
          className="input mb-5"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Entrando...' : 'Entrar'}
        </button>
        <p className="mt-4 text-center text-[11px] text-slate-400">
          1º acesso: usuário = seu nome · senha = nome + 123
        </p>
      </form>
    </div>
  );
}
