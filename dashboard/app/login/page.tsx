"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
    });
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <main className="container">
      <h1>Entrar no KidsGuard</h1>
      <p className="muted">Enviamos um link mágico para o seu e-mail — sem senha.</p>
      {sent ? (
        <div className="card">✅ Link enviado para <b>{email}</b>. Confira sua caixa de entrada.</div>
      ) : (
        <form onSubmit={sendLink} className="card">
          <input
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div style={{ height: 12 }} />
          <button type="submit">Enviar link de acesso</button>
          {error && <p style={{ color: "var(--critical)" }}>{error}</p>}
        </form>
      )}
    </main>
  );
}
