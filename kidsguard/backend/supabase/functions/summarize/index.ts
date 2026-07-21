// Edge Function: summarize
// Gera o resumo diário de uma criança e grava em daily_summaries.
// Chamar via cron (uma vez por dia) ou manualmente: { "child_id": "...", "date": "2026-07-21" }
import { corsHeaders, json } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { summarizeDay } from "../_shared/claude.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const { child_id, date } = await req.json();
    if (!child_id) return json({ error: "child_id obrigatório" }, 400);
    const day = (date as string) ?? new Date().toISOString().slice(0, 10);

    const db = serviceClient();

    const { data: child } = await db.from("children").select("name").eq("id", child_id).single();
    if (!child) return json({ error: "criança não encontrada" }, 404);

    const start = `${day}T00:00:00Z`;
    const end = `${day}T23:59:59Z`;

    const { data: events } = await db
      .from("activity_events")
      .select("app, event_type, video_title, channel, content_text")
      .eq("child_id", child_id)
      .gte("occurred_at", start)
      .lte("occurred_at", end)
      .limit(500);

    const { data: flags } = await db
      .from("flags")
      .select("category, severity, explanation")
      .eq("child_id", child_id)
      .gte("created_at", start)
      .lte("created_at", end);

    const summaryText = await summarizeDay(child.name, events ?? [], flags ?? []);

    const counts = {
      eventos: events?.length ?? 0,
      alertas: flags?.length ?? 0,
    };

    const { data: saved } = await db
      .from("daily_summaries")
      .upsert(
        { child_id, summary_date: day, summary_text: summaryText, counts },
        { onConflict: "child_id,summary_date" },
      )
      .select("id")
      .single();

    return json({ ok: true, summary_id: saved?.id, summary_text: summaryText, counts });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
