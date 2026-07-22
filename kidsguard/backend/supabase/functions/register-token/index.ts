// Edge Function: register-token  (Fase 3.2)
// O app da criança registra seu token FCM (para receber push).
//   header: x-device-token
//   body:   { "fcm_token": "..." }
import { corsHeaders, json } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const deviceToken = req.headers.get("x-device-token");
    if (!deviceToken) return json({ error: "x-device-token ausente" }, 401);

    const { fcm_token } = await req.json();
    if (!fcm_token) return json({ error: "fcm_token obrigatório" }, 400);

    const db = serviceClient();
    const { error } = await db
      .from("devices")
      .update({ fcm_token, last_seen_at: new Date().toISOString() })
      .eq("device_token", deviceToken);
    if (error) return json({ error: error.message }, 400);

    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
