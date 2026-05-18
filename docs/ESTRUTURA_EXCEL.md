# Estrutura real da planilha (e como o sistema a interpreta)

> Este documento registra a estrutura **real** do arquivo
> `ESCALA ALA 2026 17.05.26.xlsx` e por que o modelo de dados difere do
> que o prompt original assumia.

## 1. O prompt assumia uma tabela normalizada

O prompt pedia colunas: `Nome | Matrícula | Data | Turno | Horário | Setor | Supervisor | Observações`.

**Essas colunas não existem na planilha.** A planilha real é uma **matriz de
escala** (pessoa × dia), formato comum em escalas operacionais.

## 2. Estrutura real

- **13 abas**: `LEGENDA` + 12 meses (`JANEIRO` … `DEZEMBRO`).
- A pasta de trabalho é **protegida por senha** (proteção de planilha) — a
  leitura dos valores funciona normalmente; apenas a edição pelo Excel é
  bloqueada.
- Há **referências externas** a outras pastas de trabalho e muitas
  **fórmulas**; o sistema lê os **valores em cache** das fórmulas (não as
  recalcula).

### Aba `LEGENDA`

Mapa de códigos de turno:

| Coluna | Conteúdo | Exemplos |
|--------|----------|----------|
| A | `TIPO` (descrição) | `24 HORAS`, `FÉRIAS`, `LICENÇA`, `COMERCIAL` |
| B | `COR` (#hex) | `#CC66FF`, `#99CCFF` |
| C | `SIGLA` (código da célula) | `C`, `f`, `v`, `l`, `24`, `12`, `9` |
| D | `HORAS` | `24`, `12`, `0`, `8` |

A `SIGLA` pode ser **letra** (`C`, `f`, `v`, `l`) ou **número** (`24`, `12`,
`9`, `20`, `4`, `16`, `15`, `18`). É a chave que aparece nas células do grid.

### Abas mensais (`JANEIRO` … `DEZEMBRO`)

Layout aproximado (varia um pouco por mês):

- **Topo**: bloco de resumo do mês (`DATA INICIAL`, `DATA FINAL`, `FERIADOS`,
  `TOTAL DE HORAS`, etc.).
- **Linha de datas**: uma linha cujas colunas contêm os **seriais de data do
  Excel** (1 coluna por dia do mês). O sistema detecta automaticamente essa
  linha (a que tiver mais seriais de data plausíveis).
- **Linhas de equipe/setor**: linhas com texto na coluna A e **sem** valores
  de dia — ex.: `AFFA MV`, `AFFA EA`, `AFFA K9` (K9 = canil). Tratadas como
  **equipe/setor** (`Team`).
- **Linhas de pessoa**: coluna A = nome do servidor, células dos dias =
  código do turno (`SIGLA` ou número de horas).
- **Colunas à direita do grid**: totalizações por pessoa (`TOTAL DE HORAS`,
  `BANCO DE HORAS`, `SALDO`, `FÉRIAS`, `LICENÇA`, …) — **ignoradas** na
  importação (são derivadas).

## 3. Mapeamento para o banco

| Conceito do prompt | Origem real | Modelo Prisma |
|--------------------|-------------|----------------|
| Servidor / Nome | Coluna A das linhas de pessoa | `Person.name` |
| Matrícula | **não existe** | `Person.matricula` (nulo, reservado) |
| Setor / Equipe | Linha-cabeçalho `AFFA *` | `Team.name` |
| Supervisor | **não existe** na planilha | — (não modelado) |
| Data | Linha de datas (serial Excel → Date) | `ShiftAssignment.date` |
| Turno | Código da célula → `LEGENDA` | `ShiftType` + `ShiftAssignment.shiftTypeId` |
| Horário | **não existe** (só duração) | — |
| Horas | `LEGENDA.HORAS` (ou número da célula) | `ShiftAssignment.hours` |
| Observações | **não existe** | — |

Conversão de data: serial do Excel → `Date` em
`backend/src/utils/excelDate.js` (base 1899‑12‑30, trata o bug do ano
bissexto de 1900).

## 4. Sincronização inteligente

`backend/src/excel/sync.js`:

1. `LEGENDA` → upsert em `ShiftType` (por `code`).
2. Equipes → upsert em `Team` (por `name`).
3. Pessoas → upsert em `Person` (por `name`, vincula `Team`).
4. Atribuições → diff por (`personId`, `date`) usando `contentHash`:
   - inexistente ⇒ cria (importado);
   - hash diferente ⇒ atualiza (atualizado);
   - sumiu da planilha ⇒ remove (removido).
5. Registra `SyncLog` e emite `sync:done` via WebSocket.

## 5. Robustez (requisito 24 do prompt)

- O arquivo pode ser **substituído** ou ter o **nome alterado**: o watcher
  monitora a pasta e usa o `.xlsx` mais recente.
- **Múltiplas abas**: o parser usa todas as abas de mês automaticamente e
  ignora a `LEGENDA`.
- Linhas de data duplicadas no topo são ignoradas; arquivos temporários do
  Excel (`~$...`) são ignorados.

## 6. Pontos de atenção / heurísticas

- A detecção de "linha de pessoa" vs "cabeçalho de equipe" é heurística
  (texto na coluna A **com** valores de dia = pessoa; **sem** valores = equipe).
  Se a planilha mudar muito de layout, ajuste `parser.js`
  (`findDateRow`, `NON_PERSON`, lógica de `currentTeam`).
- Não há matrícula nem supervisor na fonte; se passarem a existir, estenda
  `Person` e o parser.
- A planilha não foi executada/validada nesta máquina (sem Node/Postgres);
  rode `npm run db:seed` + uma importação e confira os primeiros `SyncLog`.
