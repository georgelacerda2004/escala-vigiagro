// Edge Function: classify
// Endpoint direto para TESTAR a IA: manda um texto, recebe a classificação.
// Ex.: curl -X POST .../classify -d '{"text":"quantos anos vc tem? manda foto"}'
import { corsHeaders, json } from "../_shared/cors.ts";
import { classifyText } from "../_shared/claude.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const { text, app, kind } = await req.json();
    if (!text || typeof text !== "string") return json({ error: "campo 'text' obrigatório" }, 400);
    const result = await classifyText(text, { app, kind });
    return json({ ok: true, classification: result });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
