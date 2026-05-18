import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  CalendarRange,
  FileUp,
  ScrollText,
  Users,
  Settings,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import Brand from './Brand.jsx';

const items = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/meu-calendario', label: 'Meu Calendário', icon: CalendarDays },
  { to: '/escala', label: 'Escala', icon: CalendarRange },
  { to: '/importacoes', label: 'Importações', icon: FileUp, role: 'SUPERVISOR' },
  { to: '/logs', label: 'Logs', icon: ScrollText, role: 'SUPERVISOR' },
  { to: '/usuarios', label: 'Usuários', icon: Users, role: 'ADMIN' },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
];

export default function Sidebar({ open, onClose }) {
  const { can } = useAuth();
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 w-64 transform border-r border-slate-200 bg-white transition-transform duration-200 dark:border-slate-800 dark:bg-slate-900 md:static md:translate-x-0 ${
        open ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
      }`}
    >
      <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800">
        <Brand size={40} />
        <div className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-brand-600">
          Escala de Plantões · GRU
        </div>
      </div>
      <nav className="p-3">
        {items
          .filter((i) => !i.role || can(i.role))
          .map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `mb-1 flex items-center gap-3 rounded-lg px-3 py-3 text-sm ${
                  isActive
                    ? 'bg-brand-600 font-semibold text-white'
                    : 'text-slate-600 hover:bg-brand-50 dark:text-slate-300 dark:hover:bg-slate-800'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
      </nav>
    </aside>
  );
}
