"use client";
import { createClient } from "@supabase/supabase-js";

// Client do navegador: usa a anon key. RLS garante que o pai só vê os próprios filhos.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
