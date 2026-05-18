# Deploy gratuito com URL fixa (Render + Neon)

Resultado: um endereço fixo (ex.: `https://escala-vigiagro.onrender.com`)
que funciona no celular, de casa, **sem depender do seu PC**.

Limitações do plano grátis (aceitas):
- O site **hiberna** após ~15 min sem uso; o 1º acesso depois disso leva
  ~30–50 s para "acordar". Depois fica rápido.
- Banco no **Neon** (grátis e persistente) — escolhido porque o Postgres
  grátis do Render expira; o do Neon não.
- A planilha do Z: não existe na nuvem → o admin **envia a planilha pela
  tela** (Importações → "Enviar planilha .xlsx"). Já está pronto.

---

## Passo 1 — Banco grátis (Neon) ~3 min
1. Acesse <https://neon.tech> → **Sign up** (pode usar conta Google).
2. **Create project** (nome livre, região mais próxima).
3. Em **Connection string**, copie a URL que começa com
   `postgresql://...` (formato "Prisma" ou "Pooled" serve). Guarde.

## Passo 2 — Código no GitHub ~5 min
(Render puxa o código de um repositório.)
1. Crie conta em <https://github.com> (se não tiver).
2. Crie um repositório **privado** vazio (ex.: `escala-vigiagro`).
3. No PC, na pasta do projeto, rode (uma vez):
   ```
   cd C:\Users\Vigiagro\escala-gru
   "%CD%\.tools\... "   (ou use o Git já instalado)
   git init
   git add .
   git commit -m "Escala Vigiagro"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/escala-vigiagro.git
   git push -u origin main
   ```
   (O `.gitignore` já evita subir node_modules, banco local, senhas, etc.)

## Passo 3 — Deploy no Render ~5 min
1. Acesse <https://render.com> → **Sign up** (entre com o GitHub).
2. **New +** → **Blueprint** → conecte o repositório `escala-vigiagro`.
   O Render lê o arquivo `render.yaml` automaticamente.
3. Em **Environment**, defina:
   - `DATABASE_URL` = a string do Neon (Passo 1).
   - `ADMIN_PASSWORD` = a senha que VOCÊ quer para o administrador.
   - (`JWT_SECRET` é gerado sozinho; `ADMIN_EMAIL` já vem
     `admin@vigiagro.local` — pode mudar.)
4. **Apply / Create**. Aguarde o build (~3–5 min).
5. O Render mostra a URL fixa: `https://escala-vigiagro.onrender.com`.

## Passo 4 — Primeiro uso
1. Acesse a URL → login **admin@vigiagro.local** + a senha que você definiu.
2. Vá em **Importações** → **Enviar planilha (.xlsx)** e envie o arquivo
   da escala. Isso cria os 15 usuários dos servidores automaticamente.
3. (Recomendado) Em **Usuários**, use **Senha** para definir senhas, ou
   peça que cada um troque em **Configurações → Alterar minha senha**.
4. Envie a URL fixa aos colegas.

## Atualizar a escala depois
Sempre que a planilha mudar: entre como admin → **Importações** →
**Enviar planilha** com o arquivo novo. O sistema reimporta na hora.

## Atualizar o sistema (código)
Faça as mudanças, depois:
```
git add . && git commit -m "ajustes" && git push
```
O Render redeploya sozinho.

## Observações
- Backup via `pg_dump` não roda no Render grátis; o **Neon** tem backups
  próprios (point-in-time) — suficiente para este uso.
- Quer que o site **não hiberne**? É o plano pago (~US$7/mês) — me avise
  que eu ajusto o `render.yaml`.
- Posso te acompanhar passo a passo: me diga em qual passo está.
