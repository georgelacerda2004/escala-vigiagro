// Edge Function: weekly-summary
// Gera o resumo SEMANAL e grava em weekly_summaries.
//   { "child_id": "...", "week_start": "2026-07-13" }  -> uma criança
//   { "week_start": "2026-07-13" }  ou  {}             -> TODAS (usado pelo cron)
// week_start é a segunda-feira da semana; a janela cobre 7 dias (seg..dom).
import { corsHeaders, json } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { summarizeWeek } from "../_shared/claude.ts";

// Segunda-feira da semana que contém (ref - 7 dias). Sem argumento, usa a semana
// anterior completa (para o cron de domingo/segunda resumir a semana que fechou).
function lastWeekStart(ref = new Date()): string {
  const d = new Date(ref);
  d.setUTCDate(d.getUTCDate() - 7);
  const dow = (d.getUTCDay() + 6) % 7; // 0 = segunda
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

async function summarizeChildWeek(
  db: ReturnType<typeof serviceClient>,
  childId: string,
  childName: string,
  weekStart: string,
) {
  const startDate = new Date(`${weekStart}T00:00:00Z`);
  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + 6);
  const weekEnd = endDate.toISOString().slice(0, 10);
  const start = `${weekStart}T00:00:00Z`;
  const end = `${weekEnd}T23:59:59Z`;

  const { data: events } = await db
    .from("activity_events")
    .select("app, event_type, video_title, channel, content_text")
    .eq("child_id", childId)
    .gte("occurred_at", start)
    .lte("occurred_at", end)
    .limit(1000);

  const { data: flags } = await db
    .from("flags")
    .select("category, severity, explanation")
    .eq("child_id", childId)
    .gte("created_at", start)
    .lte("created_at", end);

  const summaryText = await summarizeWeek(childName, weekStart, weekEnd, events ?? [], flags ?? []);
  const counts = { eventos: events?.length ?? 0, alertas: flags?.length ?? 0 };

  const { data: saved } = await db
    .from("weekly_summaries")
    .upsert(
      { child_id: childId, week_start: weekStart, summary_text: summaryText, counts },
      { onConflict: "child_id,week_start" },
    )
    .select("id")
    .single();

  return { child_id: childId, summary_id: saved?.id, week_start: weekStart, counts };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const childId: string | undefined = body?.child_id;
    const weekStart: string = body?.week_start ?? lastWeekStart();

    const db = serviceClient();

    if (childId) {
      const { data: child } = await db.from("children").select("name").eq("id", childId).single();
      if (!child) return json({ error: "criança não encontrada" }, 404);
      const result = await summarizeChildWeek(db, childId, child.name, weekStart);
      return json({ ok: true, ...result });
    }

    const { data: children } = await db.from("children").select("id, name");
    const results = [];
    for (const c of children ?? []) {
      results.push(await summarizeChildWeek(db, c.id, c.name, weekStart));
    }
    return json({ ok: true, week_start: weekStart, count: results.length, results });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
