// Edge Function: classify-image  (Fase 2.1 — reforço por visão)
// Recebe um screenshot (base64) do app da criança, classifica com o Claude (visão)
// e, se for conteúdo de risco, grava activity_event + flag + alert (igual à ingest).
// A imagem NÃO é armazenada — é processada e descartada.
//   header: x-device-token
//   body:   { "image_base64": "...", "media_type": "image/jpeg" }
import { corsHeaders, json } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { classifyImage } from "../_shared/claude.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const deviceToken = req.headers.get("x-device-token");
    if (!deviceToken) return json({ error: "x-device-token ausente" }, 401);

    const { image_base64, media_type } = await req.json();
    if (!image_base64) return json({ error: "image_base64 obrigatório" }, 400);

    const db = serviceClient();

    const { data: device, error: devErr } = await db
      .from("devices")
      .select("id, child_id, vision_enabled")
      .eq("device_token", deviceToken)
      .single();
    if (devErr || !device) return json({ error: "device_token inválido" }, 401);

    // Opt-in de privacidade: a visão (envio da tela) só roda se o pai autorizou.
    if (!device.vision_enabled) {
      return json({ ok: true, skipped: "vision_disabled" }, 200);
    }

    await db.from("devices").update({ last_seen_at: new Date().toISOString() }).eq("id", device.id);

    const cls = await classifyImage(image_base64, media_type ?? "image/jpeg", { app: "roblox" });

    let flagged = false;
    if (cls.is_concerning && cls.category !== "none") {
      flagged = true;

      const { data: ev } = await db
        .from("activity_events")
        .insert({
          child_id: device.child_id,
          device_id: device.id,
          app: "roblox",
          event_type: "chat",
          content_text: cls.matched_excerpt || "(detectado por visão na tela)",
        })
        .select("id")
        .single();

      if (ev) {
        const { data: flag } = await db
          .from("flags")
          .insert({
            event_id: ev.id,
            child_id: device.child_id,
            category: cls.category,
            severity: cls.severity,
            matched_excerpt: cls.matched_excerpt,
            explanation: cls.explanation,
            model: "claude-opus-4-8 (visão)",
          })
          .select("id")
          .single();

        if (flag && (cls.severity === "high" || cls.severity === "critical")) {
          await db.from("alerts").insert([
            { flag_id: flag.id, child_id: device.child_id, channel: "push" },
            { flag_id: flag.id, child_id: device.child_id, channel: "email" },
          ]);
        }
      }
    }

    return json({ ok: true, flagged, classification: cls });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
