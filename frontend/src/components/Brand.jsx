import { useState } from 'react';

// Carrega o brasao oficial de /brand/logo-vigiagro.png (servido pelo backend,
// nao precisa rebuild). Se nao existir, mostra um selo verde de fallback.
export default function Brand({ size = 40, stacked = false, subtitle = true }) {
  const [ok, setOk] = useState(true);
  return (
    <div className={`flex ${stacked ? 'flex-col items-center text-center' : 'items-center'} gap-3`}>
      {ok ? (
        <img
          src="/brand/logo"
          alt="VIGIAGRO"
          width={size}
          height={size}
          onError={() => setOk(false)}
          style={{ width: size, height: size, objectFit: 'contain' }}
        />
      ) : (
        <div
          className="flex items-center justify-center rounded-full border-4 border-brand-600 bg-white text-center font-black leading-none text-brand-700"
          style={{ width: size, height: size, fontSize: size * 0.26 }}
          title="VIGIAGRO"
        >
          VA
        </div>
      )}
      <div>
        <div
          className="font-extrabold leading-tight tracking-tight text-brand-700 dark:text-brand-400"
          style={{ fontSize: stacked ? 20 : 16 }}
        >
          VIGIAGRO
        </div>
        {subtitle && (
          <div className="text-[10px] uppercase leading-tight tracking-wide text-slate-500">
            Vigilância Agropecuária Internacional
          </div>
        )}
      </div>
    </div>
  );
}
