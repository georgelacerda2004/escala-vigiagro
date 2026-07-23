"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface Flag {
  id: string;
  child_id: string;
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  matched_excerpt: string | null;
  explanation: string | null;
  created_at: string;
}
interface Summary {
  id: string;
  child_id: string;
  summary_date: string;
  summary_text: string | null;
  counts: { eventos?: number; alertas?: number };
}
interface WeeklySummary {
  id: string;
  child_id: string;
  week_start: string;
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
  const [weekly, setWeekly] = useState<WeeklySummary[]>([]);
  const [childFilter, setChildFilter] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = "/login";
        return;
      }
      setEmail(session.user.email ?? null);

      const [{ data: kids }, { data: fl }, { data: sums }, { data: wk }] = await Promise.all([
        supabase.from("children").select("id, name"),
        supabase.from("flags").select("id, child_id, category, severity, matched_excerpt, explanation, created_at")
          .order("created_at", { ascending: false }).limit(50),
        supabase.from("daily_summaries").select("id, child_id, summary_date, summary_text, counts")
          .order("summary_date", { ascending: false }).limit(14),
        supabase.from("weekly_summaries").select("id, child_id, week_start, summary_text, counts")
          .order("week_start", { ascending: false }).limit(8),
      ]);
      setChildren(kids ?? []);
      setFlags((fl ?? []) as Flag[]);
      setSummaries((sums ?? []) as Summary[]);
      setWeekly((wk ?? []) as WeeklySummary[]);
      setLoading(false);
    })();
  }, []);

  const nameOf = useMemo(() => {
    const m = new Map(children.map((c) => [c.id, c.name]));
    return (id: string) => m.get(id) ?? "—";
  }, [children]);

  const showAll = childFilter === "all";
  const shownFlags = showAll ? flags : flags.filter((f) => f.child_id === childFilter);
  const shownSummaries = showAll ? summaries : summaries.filter((s) => s.child_id === childFilter);
  const shownWeekly = showAll ? weekly : weekly.filter((w) => w.child_id === childFilter);

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
          <a href="/criancas">crianças</a> · <a href="/assinatura">assinatura</a> · {email} ·{" "}
          <a onClick={logout} style={{ cursor: "pointer" }}>sair</a>
        </span>
      </div>

      <p className="muted">
        Acompanhando {children.length} criança(s): {children.map((c) => c.name).join(", ") || "—"}
      </p>

      {children.length > 0 && (
        <div style={{ margin: "12px 0" }}>
          <label className="muted" style={{ marginRight: 8 }}>Filtrar por criança:</label>
          <select
            value={childFilter}
            onChange={(e) => setChildFilter(e.target.value)}
            style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #2a313c", background: "#12161c", color: "var(--text)" }}
          >
            <option value="all">Todas</option>
            {children.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      <h2>🚨 Alertas recentes</h2>
      {shownFlags.length === 0 && <div className="card">Nenhum alerta. Tudo tranquilo por aqui. 😌</div>}
      {shownFlags.map((f) => (
        <div key={f.id} className="card">
          <span className={`badge ${f.severity}`}>{f.severity.toUpperCase()}</span>{" "}
          <b>{f.category}</b>
          {showAll && <span className="muted"> · {nameOf(f.child_id)}</span>}
          <div style={{ marginTop: 6 }}>{f.explanation}</div>
          {f.matched_excerpt && <div className="muted" style={{ marginTop: 4 }}>“{f.matched_excerpt}”</div>}
          <div className="muted" style={{ marginTop: 4 }}>{new Date(f.created_at).toLocaleString("pt-BR")}</div>
        </div>
      ))}

      <h2>🗓️ Resumos semanais</h2>
      {shownWeekly.length === 0 && <div className="card">Ainda sem resumo semanal. Ele é gerado toda segunda-feira.</div>}
      {shownWeekly.map((w) => (
        <div key={w.id} className="card">
          <b>Semana de {new Date(w.week_start).toLocaleDateString("pt-BR")}</b>
          {showAll && <span className="muted"> · {nameOf(w.child_id)}</span>}
          <span className="muted"> · {w.counts?.eventos ?? 0} eventos · {w.counts?.alertas ?? 0} alertas</span>
          <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{w.summary_text}</div>
        </div>
      ))}

      <h2>📅 Resumos diários</h2>
      {shownSummaries.length === 0 && <div className="card">Ainda sem resumos. Eles aparecem ao fim de cada dia.</div>}
      {shownSummaries.map((s) => (
        <div key={s.id} className="card">
          <b>{new Date(s.summary_date).toLocaleDateString("pt-BR")}</b>
          {showAll && <span className="muted"> · {nameOf(s.child_id)}</span>}
          <span className="muted"> · {s.counts?.eventos ?? 0} eventos · {s.counts?.alertas ?? 0} alertas</span>
          <div style={{ marginTop: 6 }}>{s.summary_text}</div>
        </div>
      ))}

      <p className="muted" style={{ marginTop: 32 }}>
        <a href="/privacidade">Política de Privacidade</a> · <a href="/termos">Termos de Uso</a>
      </p>
    </main>
  );
}
