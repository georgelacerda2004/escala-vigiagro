# Versão desktop (Electron) — adiada, com caminho recomendado

A versão desktop **não foi incluída** de propósito: empacotar Electron +
backend Node + PostgreSQL sem poder testar localmente entregaria algo pela
metade. O cenário "rodar offline na máquina do aeroporto" já é atendido pelo
backend rodando em rede local.

## Quando vale a pena fazer Electron

Só se for necessário um executável único de balcão (sem navegador). Caso
contrário, backend local + navegador é mais simples de manter.

## Esboço de implementação (quando for fazer)

1. `desktop/` com Electron:
   - `main.js`: ao iniciar, sobe o backend (`child_process.fork('backend/src/server.js')`)
     e abre uma `BrowserWindow` carregando o front buildado (`frontend/dist`).
   - Empacotar com `electron-builder` (target `nsis` no Windows).
2. **Banco**: trocar PostgreSQL por **SQLite** no Prisma para um app 100%
   offline sem servidor de banco:
   - `datasource db { provider = "sqlite"; url = "file:./escala.db" }`
   - rever tipos não suportados (ex.: `@db.Date`) e o backup (substituir
     `pg_dump` por cópia do arquivo `.db`).
3. Manter o watcher do Excel apontando para a pasta local/rede.

## Recomendação

Manter a arquitetura web atual. Migrar para Electron+SQLite apenas se houver
exigência concreta de executável offline sem dependências.
