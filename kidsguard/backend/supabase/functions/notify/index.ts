// Edge Function: notify  (Fase 3.1 — entrega de alertas)
// Varre alertas pendentes de e-mail, envia via Resend ao e-mail do pai e marca 'sent'.
// Chamada pelo cron (a cada 1 min) com Bearer service-role.
import { corsHeaders, json } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";

const SEV_LABEL: Record<string, string> = {
  low: "Baixo", medium: "Médio", high: "Alto", critical: "CRÍTICO",
};

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) throw new Error("RESEND_API_KEY não configurada");
  const from = Deno.env.get("RESEND_FROM") ?? "KidsGuard <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const db = serviceClient();

    const { data: alerts } = await db
      .from("alerts")
      .select("id, flag_id, child_id")
      .eq("channel", "email")
      .eq("status", "pending")
      .limit(50);

    let sent = 0, failed = 0;
    for (const a of alerts ?? []) {
      try {
        const { data: flag } = await db
          .from("flags")
          .select("category, severity, matched_excerpt, explanation")
          .eq("id", a.flag_id).single();
        const { data: child } = await db
          .from("children")
          .select("name, parent_id")
          .eq("id", a.child_id).single();
        if (!flag || !child) { failed++; continue; }
        const { data: parent } = await db
          .from("parents")
          .select("email")
          .eq("id", child.parent_id).single();
        if (!parent?.email) { failed++; continue; }

        const sev = SEV_LABEL[flag.severity] ?? flag.severity;
        const html =
          `<h2>🚨 Alerta KidsGuard — ${child.name}</h2>` +
          `<p><b>Categoria:</b> ${flag.category} &nbsp; <b>Gravidade:</b> ${sev}</p>` +
          `<p>${flag.explanation ?? ""}</p>` +
          (flag.matched_excerpt ? `<blockquote>“${flag.matched_excerpt}”</blockquote>` : "") +
          `<hr><p style="color:#888;font-size:12px">Você recebeu este alerta porque monitora ${child.name} no KidsGuard.</p>`;

        await sendEmail(parent.email, `🚨 Alerta KidsGuard — ${child.name} (${sev})`, html);
        await db.from("alerts").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", a.id);
        sent++;
      } catch (e) {
        console.error("Falha ao enviar alerta", a.id, String(e));
        await db.from("alerts").update({ status: "failed" }).eq("id", a.id);
        failed++;
      }
    }

    return json({ ok: true, sent, failed });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
