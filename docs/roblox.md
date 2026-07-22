# Fase 2 — Monitoramento do Roblox

## Por que é diferente do YouTube

No YouTube, o app lê o texto da tela pelos **nós de acessibilidade**. No Roblox isso
**não funciona**: o chat é desenhado pelo **motor do jogo** (uma superfície gráfica),
não por componentes nativos do Android. Logo, a única forma de ler o chat é
**capturar a tela e extrair o texto**.

## Como o KidsGuard faz (OCR no aparelho)

1. **Detecta o Roblox em primeiro plano** — o `YouTubeAccessibilityService` recebe
   eventos do pacote `com.roblox.client` e "pinga" o serviço de captura.
2. **Captura a tela** — `ScreenCaptureService` (Foreground Service, tipo
   `mediaProjection`) tira 1 screenshot a cada ~5s, **só enquanto o Roblox está ativo**
   (para de amostrar 15s após o Roblox sair do foreground).
3. **OCR offline** — **ML Kit Text Recognition** lê o texto do frame **no próprio
   aparelho** (grátis, sem enviar imagem pra nuvem).
4. **Pré-filtro + envio** — linhas novas passam pelo `Prefilter`; o que é suspeito
   sobe para a `ingest` como `app="roblox", event_type="chat"` → **mesma esteira**:
   IA classifica, grava `flags`, dispara alerta, entra no resumo.

## Privacidade e desempenho

- **Nenhum screenshot é armazenado.** O frame é processado e descartado na hora.
- Só o **texto suspeito** (pós pré-filtro) vai para a nuvem.
- Resolução reduzida à metade e amostragem só com o Roblox aberto → economia de
  bateria e dados.
- O Android exibe o **consentimento de captura** e um **indicador de gravação de tela**
  enquanto ativo — transparência exigida pelas lojas (nada oculto).

## Limitações desta fase (a refinar)

- O OCR depende da nitidez/fonte do chat. Fontes estilizadas ou sobreposição podem
  falhar → ver "Escalonamento por visão" abaixo.
- Detecção de foreground por heurística (ping + timeout de 15s). Refino possível:
  `UsageStatsManager` ou ampliar a detecção de app ativo.
- Sem recorte fixo da região do chat ainda — hoje faz OCR do frame todo e filtra por
  linha. Próximo passo: recortar a área do chat para reduzir ruído.
- Notificação do Foreground Service: no Android 13+ pode exigir a permissão
  `POST_NOTIFICATIONS` concedida em runtime para aparecer.

## Escalonamento por visão (Fase 2.1, opcional)

Para os casos que o OCR erra, dá para enviar o frame ao **Claude com visão**:
- `_shared/claude.ts` → função `classifyImage(base64)` (bloco `image` + mesmo schema).
- `functions/classify-image/index.ts` → recebe base64, classifica, **não guarda a
  imagem**. Usar só quando o OCR marcar dúvida, para conter custo e exposição.

## Base de segurança: controles parentais OFICIAIS do Roblox

O monitoramento é **complemento**, não substituto. Orientar o responsável a ativar
no Roblox (e vender isso como parte do produto):

- **Vincular a conta** do responsável à conta da criança (Parent/Teen linking).
- **Restrição de chat por idade** e definição de conta como conta de criança (<13).
- **PIN de responsável** para travar as configurações.
- **Limite de tempo de tela** e **controles de gastos** (Robux).
- **Filtros de conteúdo/maturidade** por faixa etária.

Esses controles reduzem o risco na origem; o KidsGuard entra observando e avisando.
