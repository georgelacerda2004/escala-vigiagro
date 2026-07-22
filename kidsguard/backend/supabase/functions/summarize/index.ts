// Edge Function: summarize
// Gera o resumo diário e grava em daily_summaries.
//   { "child_id": "...", "date": "2026-07-21" }  -> uma criança
//   { "date": "2026-07-21" }  ou  {}              -> TODAS as crianças (usado pelo cron)
import { corsHeaders, json } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { summarizeDay } from "../_shared/claude.ts";

async function summarizeChild(
  db: ReturnType<typeof serviceClient>,
  childId: string,
  childName: string,
  day: string,
) {
  const start = `${day}T00:00:00Z`;
  const end = `${day}T23:59:59Z`;

  const { data: events } = await db
    .from("activity_events")
    .select("app, event_type, video_title, channel, content_text")
    .eq("child_id", childId)
    .gte("occurred_at", start)
    .lte("occurred_at", end)
    .limit(500);

  const { data: flags } = await db
    .from("flags")
    .select("category, severity, explanation")
    .eq("child_id", childId)
    .gte("created_at", start)
    .lte("created_at", end);

  const summaryText = await summarizeDay(childName, events ?? [], flags ?? []);
  const counts = { eventos: events?.length ?? 0, alertas: flags?.length ?? 0 };

  const { data: saved } = await db
    .from("daily_summaries")
    .upsert(
      { child_id: childId, summary_date: day, summary_text: summaryText, counts },
      { onConflict: "child_id,summary_date" },
    )
    .select("id")
    .single();

  return { child_id: childId, summary_id: saved?.id, counts };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const childId: string | undefined = body?.child_id;
    const day: string = body?.date ?? new Date().toISOString().slice(0, 10);

    const db = serviceClient();

    // Uma criança específica
    if (childId) {
      const { data: child } = await db.from("children").select("name").eq("id", childId).single();
      if (!child) return json({ error: "criança não encontrada" }, 404);
      const result = await summarizeChild(db, childId, child.name, day);
      return json({ ok: true, ...result });
    }

    // Todas as crianças (cron)
    const { data: children } = await db.from("children").select("id, name");
    const results = [];
    for (const c of children ?? []) {
      results.push(await summarizeChild(db, c.id, c.name, day));
    }
    return json({ ok: true, date: day, count: results.length, results });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
