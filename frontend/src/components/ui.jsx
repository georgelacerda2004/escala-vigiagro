export function Spinner({ label = 'Carregando...' }) {
  return (
    <div className="flex items-center gap-3 p-6 text-slate-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
      {label}
    </div>
  );
}

export function Stat({ title, value, sub, accent = 'brand' }) {
  const ring = {
    brand: 'text-brand-600',
    green: 'text-emerald-500',
    red: 'text-rose-500',
    amber: 'text-amber-500',
  }[accent];
  return (
    <div className="card">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      <div className={`mt-1 text-3xl font-bold ${ring}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export function Badge({ children, color }) {
  return (
    <span
      className="rounded px-2 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: color ? color + '33' : '#64748b33',
        color: color || '#64748b',
        border: `1px solid ${color || '#64748b'}55`,
      }}
    >
      {children}
    </span>
  );
}

export function EmptyState({ children }) {
  return <div className="p-8 text-center text-sm text-slate-400">{children}</div>;
}
