"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface Flag {
  id: string;
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  matched_excerpt: string | null;
  explanation: string | null;
  created_at: string;
}
interface Summary {
  id: string;
  summary_date: string;
  summary_text: string | null;
  counts: { eventos?: number; alertas?: number };
}
interface Child { id: string; name: string }

export default function Painel() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<Child[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [summaries, setSummaries] = useState<Summary[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = "/login";
        return;
      }
      setEmail(session.user.email ?? null);

      const [{ data: kids }, { data: fl }, { data: sums }] = await Promise.all([
        supabase.from("children").select("id, name"),
        supabase.from("flags").select("id, category, severity, matched_excerpt, explanation, created_at")
          .order("created_at", { ascending: false }).limit(50),
        supabase.from("daily_summaries").select("id, summary_date, summary_text, counts")
          .order("summary_date", { ascending: false }).limit(14),
      ]);
      setChildren(kids ?? []);
      setFlags((fl ?? []) as Flag[]);
      setSummaries((sums ?? []) as Summary[]);
      setLoading(false);
    })();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (loading) return <main className="container"><p className="muted">Carregando…</p></main>;

  return (
    <main className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>🛡️ KidsGuard</h1>
        <span className="muted">
          <a href="/criancas">crianças</a> · {email} ·{" "}
          <a onClick={logout} style={{ cursor: "pointer" }}>sair</a>
        </span>
      </div>

      <p className="muted">
        Acompanhando {children.length} criança(s): {children.map((c) => c.name).join(", ") || "—"}
      </p>

      <h2>🚨 Alertas recentes</h2>
      {flags.length === 0 && <div className="card">Nenhum alerta. Tudo tranquilo por aqui. 😌</div>}
      {flags.map((f) => (
        <div key={f.id} className="card">
          <span className={`badge ${f.severity}`}>{f.severity.toUpperCase()}</span>{" "}
          <b>{f.category}</b>
          <div style={{ marginTop: 6 }}>{f.explanation}</div>
          {f.matched_excerpt && <div className="muted" style={{ marginTop: 4 }}>“{f.matched_excerpt}”</div>}
          <div className="muted" style={{ marginTop: 4 }}>{new Date(f.created_at).toLocaleString("pt-BR")}</div>
        </div>
      ))}

      <h2>📅 Resumos diários</h2>
      {summaries.length === 0 && <div className="card">Ainda sem resumos. Eles aparecem ao fim de cada dia.</div>}
      {summaries.map((s) => (
        <div key={s.id} className="card">
          <b>{new Date(s.summary_date).toLocaleDateString("pt-BR")}</b>
          <span className="muted"> · {s.counts?.eventos ?? 0} eventos · {s.counts?.alertas ?? 0} alertas</span>
          <div style={{ marginTop: 6 }}>{s.summary_text}</div>
        </div>
      ))}
    </main>
  );
}
