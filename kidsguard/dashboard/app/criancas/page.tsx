"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { supabase } from "@/lib/supabaseClient";

interface Child { id: string; name: string; birth_date: string | null }
interface Device {
  id: string; child_id: string; platform: string; device_name: string | null;
  device_token: string; paired_at: string | null; vision_enabled: boolean;
}

export default function Criancas() {
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<Child[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [newName, setNewName] = useState("");
  const [newBirth, setNewBirth] = useState("");
  const [qr, setQr] = useState<Record<string, string>>({}); // device_id -> dataURL

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.href = "/login"; return; }
    const [{ data: kids }, { data: devs }] = await Promise.all([
      supabase.from("children").select("id, name, birth_date").order("name"),
      supabase.from("devices").select("id, child_id, platform, device_name, device_token, paired_at, vision_enabled"),
    ]);
    setChildren((kids ?? []) as Child[]);
    setDevices((devs ?? []) as Device[]);
    setLoading(false);
    // gera QR de cada device
    for (const d of devs ?? []) genQr(d as Device);
  }

  async function genQr(d: Device) {
    const payload = JSON.stringify({ url: baseUrl, token: d.device_token });
    const dataUrl = await QRCode.toDataURL(payload, { width: 180, margin: 1 });
    setQr((prev) => ({ ...prev, [d.id]: dataUrl }));
  }

  useEffect(() => { load(); }, []);

  async function addChild(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from("children").insert({
      parent_id: session.user.id,
      name: newName.trim(),
      birth_date: newBirth || null,
    });
    setNewName(""); setNewBirth("");
    load();
  }

  async function addDevice(childId: string, platform: string) {
    await supabase.from("devices").insert({
      child_id: childId, platform, device_name: `Aparelho (${platform})`,
    });
    load();
  }

  async function toggleVision(d: Device) {
    await supabase.from("devices").update({ vision_enabled: !d.vision_enabled }).eq("id", d.id);
    load();
  }

  if (loading) return <main className="container"><p className="muted">Carregando…</p></main>;

  return (
    <main className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>👨‍👩‍👧 Crianças e aparelhos</h1>
        <a href="/">← painel</a>
      </div>

      <form onSubmit={addChild} className="card">
        <b>Adicionar criança</b>
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <input placeholder="Nome" value={newName} onChange={(e) => setNewName(e.target.value)}
                 style={{ flex: 1, minWidth: 160 }} />
          <input type="date" value={newBirth} onChange={(e) => setNewBirth(e.target.value)}
                 style={{ width: 160 }} />
          <button type="submit">Adicionar</button>
        </div>
      </form>

      {children.length === 0 && <div className="card">Nenhuma criança ainda. Adicione acima.</div>}

      {children.map((c) => {
        const devs = devices.filter((d) => d.child_id === c.id);
        return (
          <div key={c.id} className="card">
            <h2 style={{ marginTop: 0 }}>{c.name}</h2>

            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button onClick={() => addDevice(c.id, "android")}>+ Aparelho Android</button>
              <button onClick={() => addDevice(c.id, "ios")}
                      style={{ background: "#555" }}>+ iPhone (light)</button>
            </div>

            {devs.length === 0 && <p className="muted">Nenhum aparelho pareado.</p>}

            {devs.map((d) => (
              <div key={d.id} style={{ borderTop: "1px solid #2a313c", paddingTop: 12, marginTop: 12 }}>
                <b>{d.device_name}</b>{" "}
                <span className="muted">
                  {d.paired_at ? "· pareado" : "· aguardando pareamento"}
                </span>
                <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {qr[d.id] && d.platform === "android" && (
                    <img src={qr[d.id]} alt="QR de pareamento" width={160} height={160}
                         style={{ background: "#fff", borderRadius: 8, padding: 4 }} />
                  )}
                  <div>
                    <div className="muted">Escaneie o QR no app KidsGuard do aparelho,</div>
                    <div className="muted">ou digite o código manualmente:</div>
                    <code style={{ userSelect: "all" }}>{d.device_token}</code>
                    <div style={{ marginTop: 8 }}>
                      <label className="muted" style={{ cursor: "pointer" }}>
                        <input type="checkbox" checked={d.vision_enabled}
                               onChange={() => toggleVision(d)} /> permitir análise por
                        visão do Roblox (envia a tela quando o OCR falha)
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </main>
  );
}
