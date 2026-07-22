// Edge Function: create-checkout  (Fase 3.4)
// Cria uma sessão de Checkout do Stripe para o pai autenticado assinar.
// verify_jwt=true → recebe o JWT do usuário; identificamos o pai por ele.
import Stripe from "npm:stripe@16.12.0";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return json({ error: "não autenticado" }, 401);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
    const dashUrl = Deno.env.get("DASHBOARD_URL") ?? "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: Deno.env.get("STRIPE_PRICE_ID")!, quantity: 1 }],
      customer_email: user.email ?? undefined,
      success_url: `${dashUrl}/assinatura?ok=1`,
      cancel_url: `${dashUrl}/assinatura?canceled=1`,
      metadata: { parent_id: user.id },
      subscription_data: { metadata: { parent_id: user.id } },
    });

    return json({ url: session.url });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
