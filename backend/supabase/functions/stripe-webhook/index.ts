// Edge Function: stripe-webhook  (Fase 3.4)
// Recebe eventos do Stripe e atualiza a tabela subscriptions.
// verify_jwt=false — a autenticidade é validada pela ASSINATURA do Stripe.
import Stripe from "npm:stripe@16.12.0";
import { serviceClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("sem assinatura", { status: 400 });

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body, sig, Deno.env.get("STRIPE_WEBHOOK_SECRET")!,
    );
  } catch (e) {
    return new Response(`assinatura inválida: ${e}`, { status: 400 });
  }

  const db = serviceClient();

  async function upsert(parentId: string, fields: Record<string, unknown>) {
    if (!parentId) return;
    await db.from("subscriptions").upsert(
      { parent_id: parentId, updated_at: new Date().toISOString(), ...fields },
      { onConflict: "parent_id" },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        await upsert(s.metadata?.parent_id ?? "", {
          stripe_customer_id: s.customer as string,
          stripe_subscription_id: s.subscription as string,
          status: "active",
        });
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await upsert(sub.metadata?.parent_id ?? "", {
          stripe_customer_id: sub.customer as string,
          stripe_subscription_id: sub.id,
          status: sub.status,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        });
        break;
      }
    }
  } catch (e) {
    console.error("Erro ao processar webhook:", e);
    return new Response("erro interno", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "content-type": "application/json" },
  });
});
