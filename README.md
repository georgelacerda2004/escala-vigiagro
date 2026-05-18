# Escala GRU — Sistema de Gerenciamento de Plantões Aeroportuários

Sistema web (back-end + front-end) que importa **automaticamente** a planilha
Excel de escala, mantém um banco PostgreSQL sincronizado, expõe uma API e uma
interface moderna/responsiva com atualização em tempo real, autenticação,
perfis, logs e backup automático.

> **Importante — leia antes de começar**
>
> - A planilha real **não** tem o formato `Nome/Matrícula/Data/Turno/...` que
>   o prompt assumia. Ela é uma **matriz pessoa × dia** com 12 abas de mês +
>   `LEGENDA`. O importador foi construído para a estrutura **real**.
>   Detalhes em [`docs/ESTRUTURA_EXCEL.md`](docs/ESTRUTURA_EXCEL.md).
> - O sistema foi **instalado, executado e testado** nesta máquina: Node
>   portátil em `.tools/node`, banco **SQLite** (sem servidor), planilha
>   real importada com sucesso (1670 plantões, 15 servidores, 3 equipes).

---

## Como usar (atalhos prontos nesta máquina)

| Atalho (duplo-clique) | O que faz |
|-----------------------|-----------|
| **`INICIAR.bat`** | Roda local. Abre <http://localhost:4000> no navegador. |
| **`PUBLICAR-WEB.bat`** | Publica na internet via túnel Cloudflare (gera uma URL `https://...trycloudflare.com` para os colegas). Mantenha o PC ligado. |
| **`TROCAR-SENHAS.bat`** | Gera senha forte e única para cada servidor (recomendado antes de publicar). Lista em `docs/SENHAS-NOVAS.md`. |

### Logins

- **Admin**: `admin@escala.local` / `admin123` (troque em `backend/.env`).
- **Cada servidor**: usuário = primeiro nome (sem acento), senha inicial =
  nome + `123`. Ex.: `george` / `george123`. Lista completa em
  `docs/USUARIOS.md`. Perfil **somente leitura**; cada um vê o **seu
  calendário mensal**.

### Regras de plantão implementadas

- **12h** (apenas **Damata** e **Thiago**): 09h → 21h do mesmo dia.
- **24h** (demais): o dia marcado é o **início** — 21h do dia marcado →
  21h do **dia seguinte**.
- Dashboard mostra **Plantão atual** e **Entram às 21h** em tempo real.
- Equipes exibidas por **sigla**: **AFA**, **MV**, **AA**, **AFA/EA**.

> ⚠️ **Segurança**: as senhas iniciais são previsíveis. Antes de divulgar a
> URL pública, rode `TROCAR-SENHAS.bat`. Dados de servidores públicos +
> internet aberta = risco (LGPD). Veja `docs/SEGURANCA.md`.

A planilha fica em `excel/`. Qualquer alteração reimporta sozinho e a tela
atualiza em tempo real (WebSocket).

---

## Stack

| Camada | Tecnologias |
|--------|-------------|
| Front-end | React 18 + Vite, TailwindCSS, React Router, React Query, Axios, DayJS, Socket.IO client, Recharts, jsPDF/xlsx (export) |
| Back-end | Node.js + Express, Socket.IO, Prisma ORM, JWT, bcryptjs, Helmet, CORS, rate-limit, Zod, Winston, Swagger |
| Banco | PostgreSQL |
| Excel | `xlsx` (SheetJS) + `chokidar` (monitoramento) |
| Backup | `node-cron` + `pg_dump` |

## Estrutura de pastas

```
escala-gru/
├── backend/      API Express + Prisma + parser Excel + watcher + backup
├── frontend/     SPA React (Vite)
├── excel/        pasta monitorada — coloque a planilha .xlsx aqui
├── backups/      dumps diários do PostgreSQL
├── docs/         documentação (estrutura do Excel, etc.)
└── docker-compose.yml
```

---

## Opção A — Docker (mais simples)

Pré-requisito: Docker + Docker Compose.

```bash
cd escala-gru
docker compose up --build
```

- Front-end: <http://localhost:8080>
- API/Swagger: <http://localhost:4000/api/docs>
- O backend roda `prisma migrate deploy`, `seed` (cria o admin) e sobe o
  servidor automaticamente.
- A pasta `./excel` é montada no container; a planilha já incluída é
  importada no boot e a cada alteração.

Login inicial: **admin@escala.local / admin123** (troque em produção via
variáveis no `docker-compose.yml`).

---

## Opção B — Execução local (sem Docker)

### 1. PostgreSQL

Crie o banco e um usuário:

```sql
CREATE USER escala WITH PASSWORD 'escala';
CREATE DATABASE escala_gru OWNER escala;
```

### 2. Back-end

```bash
cd backend
cp .env.example .env          # ajuste DATABASE_URL, JWT_SECRET, ADMIN_*
npm install
npx prisma migrate dev --name init   # cria o schema
npm run db:seed                # cria o usuário admin
npm run dev                    # http://localhost:4000
```

### 3. Front-end

```bash
cd frontend
npm install
npm run dev                    # http://localhost:5173 (proxy p/ :4000)
```

### Scripts

| Local | Script | Função |
|-------|--------|--------|
| backend | `npm run dev` | API com reload (nodemon) |
| backend | `npm start` | API em produção |
| backend | `npm run build` | `prisma generate` |
| backend | `npm run db:seed` | cria/garante usuário admin |
| frontend | `npm run dev` | Vite dev server |
| frontend | `npm run build` | build de produção (`dist/`) |
| frontend | `npm start` | serve o build (preview) |

---

## Importação do Excel

1. Coloque o arquivo `.xlsx` na pasta **`excel/`** (já há uma cópia da
   planilha atual).
2. O backend (via `chokidar`) detecta criação/alteração e **reimporta
   automaticamente** após estabilizar a gravação (`EXCEL_STABILITY_MS`).
3. Importação manual também disponível na tela **Importações** ou via
   `POST /api/import/excel`.
4. Cada execução gera um registro em **`SyncLog`** (tela Logs) e emite o
   evento WebSocket `sync:done` — o front atualiza sozinho.

Funciona mesmo se o arquivo for **substituído**, **renomeado** ou tiver
**várias abas** (usa o `.xlsx` mais recente e todas as abas de mês). Veja
[`docs/ESTRUTURA_EXCEL.md`](docs/ESTRUTURA_EXCEL.md).

---

## Backups

- Job `node-cron` diário às **00:00** (`BACKUP_CRON`).
- Gera `backups/backup-YYYY-MM-DD.sql` via `pg_dump`.
- Mantém os **últimos 30** (`BACKUP_KEEP`).
- Manual: tela **Configurações** (admin) ou `POST /api/dashboard/backups/run`.
- Requer `pg_dump` acessível (no PATH ou via `PG_DUMP_BIN`). A imagem Docker
  do backend já inclui `postgresql-client`.

---

## Perfis de acesso

| Perfil | Permissões |
|--------|------------|
| `ADMIN` | tudo (usuários, backups, exclusões) |
| `SUPERVISOR` | visualização + edição de escala + importação |
| `OPERATOR` | somente leitura |

## Principais rotas da API

```
POST   /api/auth/login          GET /api/auth/me      POST /api/auth/logout
GET    /api/dashboard/summary
GET    /api/shifts              POST /api/shifts      PUT/DELETE /api/shifts/:id
GET    /api/shifts/meta
GET    /api/import/files        POST /api/import/excel
GET    /api/logs/sync           GET /api/logs/audit
GET    /api/users               POST /api/users       PUT/DELETE /api/users/:id
GET    /api/dashboard/backups   POST /api/dashboard/backups/run
GET    /api/docs                (Swagger UI)
```

---

## Deploy

- **Docker** (Win/Linux): `docker compose up -d --build`. Ajuste segredos e
  `CORS_ORIGIN`/portas. Volumes `./excel` e `./backups` devem persistir.
- **Linux (PM2)**: build do front (`npm run build`, sirva `dist/` por
  Nginx), backend com `pm2 start backend/src/server.js --name escala-api`.
- **Windows (rede local do aeroporto)**: instale Node 20 + PostgreSQL,
  configure `backend/.env` apontando `EXCEL_WATCH_DIR` para o caminho de
  rede da planilha (ex.: `Z:\Servidores\Ana\escala 2026`), rode o backend
  como serviço (PM2 / NSSM) e sirva o front pelo Nginx ou `npm start`.

## Status / limitações honestas

- **Testado e funcionando nesta máquina**: backend + banco SQLite + frontend
  rodando; planilha real importada (1670 plantões, 15 servidores, 3 equipes,
  jan–dez/2026); login, dashboard e escala validados via API.
- Banco em **SQLite** (arquivo `backend/prisma/dev.db`) para uso local sem
  servidor. Para multiusuário/produção, migrar para PostgreSQL (trocar
  `provider` no `schema.prisma` e ajustar tipos/queries).
- Node usado é **portátil** em `.tools/node` (não instalado no Windows). Se
  mover o projeto, leve a pasta `.tools` junto.
- Parser do Excel construído sobre a **estrutura real observada**; mudanças
  grandes de layout exigem ajuste em `backend/src/excel/parser.js`.
- A planilha não tem matrícula/supervisor/horário — esses campos não são
  preenchidos (ver doc da estrutura).
- **Versão desktop (Electron)**: não incluída para não entregar algo
  pela metade. Caminho recomendado em [`docs/ELECTRON.md`](docs/ELECTRON.md).
- A captura de tela automática (preview) falhou por limitação da ferramenta,
  mas o app carrega sem erros — validado por HTTP, proxy e logs do navegador.
