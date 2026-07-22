// Envio de push via Firebase Cloud Messaging HTTP v1 (Deno).
// Usa uma conta de serviço do Firebase (JSON) guardada no secret FCM_SERVICE_ACCOUNT.
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

let cachedToken: { value: string; exp: number } | null = null;

function pemToBuffer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const bin = atob(body);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

function serviceAccount(): ServiceAccount {
  const raw = Deno.env.get("FCM_SERVICE_ACCOUNT");
  if (!raw) throw new Error("FCM_SERVICE_ACCOUNT não configurada");
  return JSON.parse(raw) as ServiceAccount;
}

async function accessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.value;

  const key = await crypto.subtle.importKey(
    "pkcs8", pemToBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"],
  );
  const jwt = await create(
    { alg: "RS256", typ: "JWT" },
    {
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: getNumericDate(0),
      exp: getNumericDate(3600),
    },
    key,
  );

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`OAuth FCM ${res.status}: ${await res.text()}`);
  const data = await res.json();
  cachedToken = { value: data.access_token, exp: now + (data.expires_in ?? 3600) };
  return cachedToken.value;
}

/** Envia uma notificação para um token de aparelho. Retorna true se ok. */
export async function sendPush(fcmToken: string, title: string, body: string): Promise<boolean> {
  const sa = serviceAccount();
  const token = await accessToken(sa);
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
    {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({
        message: { token: fcmToken, notification: { title, body } },
      }),
    },
  );
  if (!res.ok) {
    console.error(`FCM send ${res.status}: ${await res.text()}`);
    return false;
  }
  return true;
}
