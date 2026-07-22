// Cliente mínimo para a API do Claude (Anthropic) via HTTP direto (Deno).
// Usamos structured outputs para receber JSON validado contra um schema.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-opus-4-8";

export interface Classification {
  is_concerning: boolean;
  category:
    | "bullying" | "sexual" | "grooming" | "violence" | "self_harm"
    | "profanity" | "personal_info" | "drugs" | "hate" | "scam" | "other" | "none";
  severity: "low" | "medium" | "high" | "critical";
  matched_excerpt: string;
  explanation: string; // PT-BR, para o pai
}

const CLASSIFICATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    is_concerning: {
      type: "boolean",
      description: "true se o conteúdo é inadequado/preocupante para uma criança",
    },
    category: {
      type: "string",
      enum: [
        "bullying", "sexual", "grooming", "violence", "self_harm",
        "profanity", "personal_info", "drugs", "hate", "scam", "other", "none",
      ],
    },
    severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
    matched_excerpt: {
      type: "string",
      description: "trecho exato do texto que motivou o alerta (vazio se nenhum)",
    },
    explanation: {
      type: "string",
      description: "explicação curta em português (pt-BR) para o pai/mãe entender o risco",
    },
  },
  required: ["is_concerning", "category", "severity", "matched_excerpt", "explanation"],
};

const SYSTEM_PROMPT =
  `Você é um analista de segurança infantil. Recebe um trecho de texto capturado ` +
  `do celular de uma criança (chat do Roblox, comentário/título de vídeo do YouTube, ` +
  `ou notificação). Classifique o risco para a criança.\n\n` +
  `Categorias de risco: bullying, conteúdo sexual, aliciamento/grooming (adulto tentando ` +
  `ganhar confiança, pedir foto, marcar encontro, pedir dados), violência, autoagressão, ` +
  `palavrão, compartilhamento de dados pessoais/contato, drogas, discurso de ódio, golpe/scam.\n\n` +
  `Regras:\n` +
  `- Se o conteúdo é normal/inofensivo para a idade, use is_concerning=false, category="none", severity="low".\n` +
  `- grooming e sexual envolvendo criança são sempre severity="critical".\n` +
  `- Seja calibrado: não alarme por gíria de jogo ("te matei", "morri") em contexto de jogo.\n` +
  `- A explanation deve ser curta, em português do Brasil, dirigida ao pai/mãe.`;

export async function classifyText(
  text: string,
  ctx?: { app?: string; kind?: string },
): Promise<Classification> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada");

  const userContent =
    `App: ${ctx?.app ?? "desconhecido"} | Tipo: ${ctx?.kind ?? "texto"}\n` +
    `Texto capturado:\n"""\n${text}\n"""`;

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: CLASSIFICATION_SCHEMA },
      },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${body}`);
  }

  const data = await res.json();
  const block = data.content?.find((b: { type: string }) => b.type === "text");
  if (!block?.text) throw new Error("Resposta da IA sem bloco de texto");
  return JSON.parse(block.text) as Classification;
}

// Classificação por VISÃO — analisa um screenshot (ex.: chat do Roblox que o OCR
// não conseguiu ler). Recebe a imagem em base64 (sem o prefixo data:).
export async function classifyImage(
  base64: string,
  mediaType = "image/png",
  ctx?: { app?: string },
): Promise<Classification> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada");

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: CLASSIFICATION_SCHEMA },
      },
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64 },
          },
          {
            type: "text",
            text: `App: ${ctx?.app ?? "roblox"}. Esta é uma captura de tela do jogo/` +
              `app da criança. Leia QUALQUER texto de chat/mensagem visível e ` +
              `classifique o risco. Se não houver texto de risco, use is_concerning=false.`,
          },
        ],
      }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const block = data.content?.find((b: { type: string }) => b.type === "text");
  if (!block?.text) throw new Error("Resposta da IA (visão) sem bloco de texto");
  return JSON.parse(block.text) as Classification;
}

// Resumo diário em linguagem natural (pt-BR).
export async function summarizeDay(
  childName: string,
  events: Array<{ app: string; event_type: string; video_title?: string; channel?: string; content_text?: string }>,
  flags: Array<{ category: string; severity: string; explanation: string }>,
): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada");

  const userContent =
    `Gere um resumo diário curto (pt-BR) para o pai/mãe sobre a atividade de ${childName}.\n\n` +
    `Eventos (${events.length}):\n${JSON.stringify(events).slice(0, 8000)}\n\n` +
    `Alertas (${flags.length}):\n${JSON.stringify(flags).slice(0, 4000)}\n\n` +
    `Escreva 1 parágrafo amigável: o que a criança fez, principais canais/jogos, ` +
    `e destaque com clareza qualquer alerta importante. Se não houve nada preocupante, tranquilize.`;

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      output_config: { effort: "low" },
      messages: [{ role: "user", content: userContent }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const block = data.content?.find((b: { type: string }) => b.type === "text");
  return block?.text ?? "";
}
