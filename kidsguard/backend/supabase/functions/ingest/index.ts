// Edge Function: ingest
// O app da criança (Android) envia eventos capturados aqui.
// Fluxo: valida device_token -> grava activity_events -> pré-filtro ->
//        IA classifica -> grava flags -> cria alerts (severidade alta).
import { corsHeaders, json } from "../_shared/cors.ts";
import { serviceClient, shouldClassify } from "../_shared/supabase.ts";
import { classifyText } from "../_shared/claude.ts";

interface IncomingEvent {
  app: "youtube" | "roblox" | "other";
  event_type: "video" | "comment" | "chat" | "notification" | "search";
  content_text?: string;
  video_id?: string;
  video_title?: string;
  channel?: string;
  url?: string;
  occurred_at?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const deviceToken = req.headers.get("x-device-token");
    if (!deviceToken) return json({ error: "x-device-token ausente" }, 401);

    const body = await req.json();
    const events: IncomingEvent[] = Array.isArray(body?.events) ? body.events : [];
    if (events.length === 0) return json({ error: "nenhum evento" }, 400);

    const db = serviceClient();

    // Valida o aparelho e descobre a qual criança pertence.
    const { data: device, error: devErr } = await db
      .from("devices")
      .select("id, child_id")
      .eq("device_token", deviceToken)
      .single();
    if (devErr || !device) return json({ error: "device_token inválido" }, 401);

    await db.from("devices").update({ last_seen_at: new Date().toISOString() }).eq("id", device.id);

    const results: Array<{ event_id: string; flagged: boolean }> = [];

    for (const ev of events) {
      // 1) grava o evento
      const { data: inserted, error: insErr } = await db
        .from("activity_events")
        .insert({
          child_id: device.child_id,
          device_id: device.id,
          app: ev.app,
          event_type: ev.event_type,
          content_text: ev.content_text ?? null,
          video_id: ev.video_id ?? null,
          video_title: ev.video_title ?? null,
          channel: ev.channel ?? null,
          url: ev.url ?? null,
          occurred_at: ev.occurred_at ?? new Date().toISOString(),
        })
        .select("id")
        .single();
      if (insErr || !inserted) continue;

      // 2) pré-filtro: junta os textos relevantes do evento
      const analysable = [ev.content_text, ev.video_title, ev.channel]
        .filter(Boolean)
        .join(" — ");
      let flagged = false;

      if (shouldClassify(analysable)) {
        // 3) IA classifica
        const cls = await classifyText(analysable, { app: ev.app, kind: ev.event_type });
        if (cls.is_concerning && cls.category !== "none") {
          flagged = true;
          const { data: flag } = await db
            .from("flags")
            .insert({
              event_id: inserted.id,
              child_id: device.child_id,
              category: cls.category,
              severity: cls.severity,
              matched_excerpt: cls.matched_excerpt,
              explanation: cls.explanation,
              model: "claude-opus-4-8",
            })
            .select("id")
            .single();

          // 4) alerta para severidade alta/crítica
          if (flag && (cls.severity === "high" || cls.severity === "critical")) {
            await db.from("alerts").insert([
              { flag_id: flag.id, child_id: device.child_id, channel: "push" },
              { flag_id: flag.id, child_id: device.child_id, channel: "email" },
            ]);
          }
        }
      }

      results.push({ event_id: inserted.id, flagged });
    }

    return json({ ok: true, processed: results.length, results });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
