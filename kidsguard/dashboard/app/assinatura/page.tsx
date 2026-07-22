"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface Sub { status: string; plan: string | null; current_period_end: string | null }

const ACTIVE = ["active", "trialing"];

export default function Assinatura() {
  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState<Sub | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.href = "/login"; return; }
    const { data } = await supabase
      .from("subscriptions")
      .select("status, plan, current_period_end")
      .maybeSingle();
    setSub((data ?? null) as Sub | null);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function subscribe() {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("create-checkout", { body: {} });
    setBusy(false);
    if (error) { alert("Erro ao iniciar assinatura: " + error.message); return; }
    if (data?.url) window.location.href = data.url;
  }

  if (loading) return <main className="container"><p className="muted">Carregando…</p></main>;

  const isActive = sub && ACTIVE.includes(sub.status);

  return (
    <main className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>💳 Assinatura</h1>
        <a href="/">← painel</a>
      </div>

      {isActive ? (
        <div className="card">
          <span className="badge low">ATIVA</span>
          <p>Sua assinatura está <b>{sub!.status}</b>.</p>
          {sub!.current_period_end && (
            <p className="muted">
              Renova em {new Date(sub!.current_period_end).toLocaleDateString("pt-BR")}.
            </p>
          )}
        </div>
      ) : (
        <div className="card">
          <p>Você ainda não tem uma assinatura ativa.</p>
          <p className="muted">
            Assine para monitorar YouTube e Roblox, receber alertas por e-mail/push e o
            resumo diário do seu filho.
          </p>
          <button onClick={subscribe} disabled={busy}>
            {busy ? "Abrindo…" : "Assinar agora"}
          </button>
        </div>
      )}
    </main>
  );
}
