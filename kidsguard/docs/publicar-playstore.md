# Publicar na Google Play — checklist do KidsGuard

App de **controle parental**: a Play permite, mas exige transparência total
(nada de stealth), justificativa das permissões sensíveis e o formulário
**Segurança dos dados** preenchido com honestidade. Este doc reúne tudo.

> Apps de monitoramento só podem ser usados para **um responsável monitorar o
> próprio filho menor**. A listagem e o app deixam isso explícito (consentimento
> no app + Termos/Política no painel).

---

## 1. O que já está pronto no código

- **Consentimento do responsável no app** (`MainActivity` + `Prefs.hasConsent`):
  os monitores (Acessibilidade, Roblox, Notificações) **não ligam** sem o aceite.
- **Sem stealth:** ícone visível, notificação persistente do Foreground Service e
  o indicador de gravação de tela do Android durante a captura do Roblox.
- **Política de Privacidade e Termos** publicáveis: páginas `/privacidade` e
  `/termos` no painel (revisar com advogado antes de ir ao ar).
- **Minimização:** pré-filtro no aparelho; expurgo de eventos após 30 dias
  (migration `0004_retention`); visão (envio de tela) **opt-in** e desligada por padrão.

## 2. Formulário "Segurança dos dados" (Data safety) — respostas sugeridas

| Pergunta | Resposta |
|---|---|
| O app coleta ou compartilha dados? | **Sim** |
| Os dados são criptografados em trânsito? | **Sim** (HTTPS) |
| Dá para pedir exclusão dos dados? | **Sim** (pelo responsável, via contato/painel) |

**Tipos de dados coletados** (marcar):
- **E-mail** do responsável — *Funcionalidade do app / Comunicação*. Não compartilhado para terceiros de marketing.
- **Mensagens no app / outro conteúdo do usuário** (chat do Roblox, títulos do YouTube, notificações) — *Funcionalidade do app (segurança infantil)*. Compartilhado com processadores (IA) para classificar risco.
- **IDs do dispositivo** (device token) — *Funcionalidade do app*.
- **Fotos/vídeos:** capturas de tela **só se o responsável ativar a visão**; **não são armazenadas** (processadas e descartadas). Declarar como *processado efêmero*.

**Finalidade:** segurança da criança (detecção de risco) e comunicação de alertas.
**Não** para publicidade, **não** vendemos dados.

## 3. Permissões sensíveis — justificativas (para o formulário e a revisão)

- **AccessibilityService** — ler título/canal e comentários visíveis no **YouTube**
  para detectar conteúdo impróprio. É a única forma de ler esse conteúdo na tela.
  (A Play exige o formulário de **uso de acessibilidade**; descrever exatamente isto.)
- **MediaProjection (captura de tela) + `FOREGROUND_SERVICE_MEDIA_PROJECTION`** —
  ler o **chat do Roblox**, que é desenhado pelo motor do jogo e não é acessível por
  outra API. Amostrada só com o Roblox em foreground; imagens não armazenadas.
- **NotificationListenerService** — ler notificações de apps monitorados (DMs do
  Roblox e mensagens de outros apps) para detectar risco. Complemento ao OCR.
- **`PACKAGE_USAGE_STATS` (Acesso de uso)** — detectar com precisão quando o Roblox
  está em primeiro plano, para amostrar a tela **só** durante o jogo (economia + privacidade).
- **Device Admin** — resistência à desinstalação pela criança (opcional, o responsável ativa).
- **`POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`, `FOREGROUND_SERVICE`** — avisos,
  retomada após reinício e o serviço de captura persistente/visível.

> A Play trata Acessibilidade e Notification Listener como **permissões de alto risco**.
> Um app de controle parental é um uso **permitido**, mas exige a **declaração de
> permissões** no console explicando o uso, um vídeo/descrição do fluxo, e a Política.

## 4. Ficha da loja (listing)

- Categoria: **Parental / Ferramentas**.
- Descrição honesta: Android = completo; iPhone = limitado (restrições da Apple).
  Deixar claro que a captura do Roblox **não é 100%** (o chat se auto-oculta) e que
  o app **complementa** os controles parentais oficiais do Roblox/YouTube.
- Link para a **Política de Privacidade** (obrigatório): a URL de `/privacidade`.
- Público-alvo: o app é **operado pelo responsável** (adulto), instalado no aparelho
  da criança. Responder o questionário de público/conteúdo de acordo.

## 5. O que VOCÊ precisa providenciar (fora do código)

- [ ] **Conta Google Play Developer** (US$ 25, pagamento único).
- [ ] **Revisão jurídica** da Política e dos Termos + definir **DPO/contato** (LGPD).
- [ ] **Domínio verificado no Resend** para enviar e-mail de qualquer remetente
      (hoje o teste só entrega para o e-mail dono da conta Resend).
- [ ] **Firebase** (push/FCM) se quiser alerta por push além do e-mail.
- [ ] **Stripe** (conta + produtos/planos) para cobrança.
- [ ] **Ativo gráfico:** ícone do app (hoje usa o ícone padrão do sistema), banner e prints.
- [ ] **Testar em Android real** (fluxo de consentimento + captura do Roblox).
- [ ] Preencher a **declaração de permissões** no console (Acessibilidade + Notification Listener).

## 6. Pendências técnicas conhecidas antes de submeter

- Ícone/branding próprio (substituir `@android:drawable/sym_def_app_icon`).
- FCM está desativado (sem `google-services.json`) — reativar quando houver Firebase.
- Confirmar o alvo `targetSdk` conforme o exigido pela Play no momento da submissão.
- Rodar o app assinado (release keystore) e testar o fluxo completo pareado.
