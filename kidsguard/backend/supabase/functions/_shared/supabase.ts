// Cliente Supabase com service_role (ignora RLS) para uso nas Edge Functions.
import { createClient } from "jsr:@supabase/supabase-js@2";

export function serviceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes");
  return createClient(url, key, { auth: { persistSession: false } });
}

// Pré-filtro leve on-server: termos que quase sempre merecem classificação da IA.
// (No app Android, um pré-filtro parecido roda no aparelho antes de enviar.)
const HINT_TERMS = [
  "foto", "nudes", "pelado", "pelada", "sexo", "sexy", "namorad", "encontr",
  "endereço", "onde você mora", "quantos anos", "idade", "whatsapp", "telefone",
  "segredo", "não conta", "nao conta", "burro", "idiota", "morre", "se mata",
  "matar", "arma", "droga", "maconha", "discord", "manda no pv", "chama no",
];

// Retorna true se o texto deve ser enviado à IA (pré-filtro barato).
export function shouldClassify(text: string | null | undefined): boolean {
  if (!text) return false;
  const t = text.toLowerCase();
  return HINT_TERMS.some((term) => t.includes(term));
}
