# Privacidade, LGPD & Políticas de Loja — KidsGuard

> Rascunho de posicionamento. **Não é aconselhamento jurídico** — validar com advogado
> antes de lançar comercialmente.

## Base legal (LGPD)

- Monitorar o **próprio filho menor** é responsabilidade parental legítima. O tratamento
  de dados da criança se apoia no exercício do poder familiar e no **consentimento
  específico do responsável** (art. 14 da LGPD — dado de criança/adolescente).
- **Dado de menor é sensível:** exige finalidade específica, minimização e segurança
  reforçada.

## Princípios do produto

1. **Transparência (sem stealth):** o app da criança exibe **notificação persistente**
   informando que está ativo. Nada de ícone oculto — exigência das lojas e postura ética.
2. **Minimização:** pré-filtro **no aparelho** envia à nuvem apenas trechos relevantes.
3. **Retenção curta:** eventos brutos com prazo curto (ex.: 30 dias) e expurgo automático;
   guardar preferencialmente os **alertas e resumos**, não todo o conteúdo.
4. **Criptografia:** TLS em trânsito; criptografia em repouso no Supabase; segredos
   (chave da IA) só no servidor.
5. **Acesso restrito:** RLS garante que cada pai só acessa os próprios filhos.
6. **Direitos do titular:** exclusão de conta apaga em cascata (FKs `on delete cascade`).

## Dados de terceiros (outras crianças no chat)

Chats capturam mensagens de **outras crianças**. Mitigações: processar para o fim de
proteção, não reter conteúdo além do necessário, e considerar anonimizar/descartar o
identificador do terceiro após a classificação.

## Políticas das lojas

- **Google Play:** apps de monitoramento parental são permitidos **se** forem claramente
  para monitorar crianças (não adultos/cônjuges), tiverem **notificação persistente** e
  **não** ocultarem o ícone. Seguir a política de "Stalkerware".
- **Apple App Store:** muito restritiva. Sem leitura de conteúdo de terceiros; foco em
  Screen Time / filtro. Validar cedo para evitar rejeição/remoção.

## Termos de uso das plataformas

Raspar YouTube/Roblox pode conflitar com os ToS deles. Preferir os **controles parentais
oficiais** quando existirem, e posicionar a captura como assistência ao responsável.

## Pendências antes do lançamento

- [ ] Política de Privacidade e Termos de Uso revisados por advogado.
- [ ] Fluxo de consentimento parental no onboarding.
- [ ] Configuração de retenção e expurgo automático.
- [ ] Encarregado/contato (DPO) e canal de solicitação de titular.
