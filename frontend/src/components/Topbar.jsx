import { useEffect, useState } from 'react';
import { Menu, Moon, Sun, LogOut, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import { getSocket } from '../lib/socket.js';

export default function Topbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [online, setOnline] = useState(false);

  useEffect(() => {
    const s = getSocket();
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    s.on('connect', on);
    s.on('disconnect', off);
    setOnline(s.connected);
    return () => {
      s.off('connect', on);
      s.off('disconnect', off);
    };
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
  };

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900 sm:px-4">
      <button className="btn-ghost md:hidden" onClick={onToggleSidebar} aria-label="menu">
        <Menu size={18} />
      </button>
      <div className="hidden items-center gap-2 text-xs text-slate-500 sm:flex">
        {online ? (
          <span className="flex items-center gap-1 text-emerald-500">
            <Wifi size={14} /> Tempo real
          </span>
        ) : (
          <span className="flex items-center gap-1 text-slate-400">
            <WifiOff size={14} /> Offline
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <button className="btn-ghost" onClick={toggleTheme} aria-label="tema">
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <div className="max-w-[40vw] truncate text-right text-sm sm:max-w-none">
          <div className="truncate font-medium">{user?.name}</div>
          <div className="text-xs text-slate-400">{user?.role}</div>
        </div>
        <button className="btn-ghost" onClick={logout} title="Sair" aria-label="Sair">
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
