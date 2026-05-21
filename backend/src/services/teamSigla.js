// Mapeia o cabecalho de equipe da planilha para a sigla de funcao + descricao.
//
// AFA    = Auditor Fiscal Federal Agropecuario
// MV     = Medico Veterinario
// AA     = Agente de Atividades
// AFA/EA = Auditor Fiscal Engenheiro Agronomo

const up = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

export function mapTeam(rawName) {
  const n = up(rawName);
  if (/\bMV\b|MEDIC|VETERIN/.test(n)) return { sigla: 'MV', descricao: 'Médico Veterinário' };
  if (/\bEA\b|ENGENHEIR|AGRONOM/.test(n))
    return { sigla: 'AFA/EA', descricao: 'Auditor Fiscal Engenheiro Agrônomo' };
  if (/\bK9\b/.test(n)) return { sigla: 'AFA K9', descricao: 'Auditor Fiscal Federal Agropecuário (K9)' };
  if (/^A{2,}$|\bAGENTE\b|ATIVIDADE/.test(n))
    return { sigla: 'AA', descricao: 'Agente de Atividades' };
  if (/AFFA|AFA/.test(n)) return { sigla: 'AFA', descricao: 'Auditor Fiscal Federal Agropecuário' };
  return { sigla: rawName, descricao: rawName };
}

// Legenda completa p/ exibir no app.
export const SIGLA_LEGENDA = [
  { sigla: 'AFA', descricao: 'Auditor Fiscal Federal Agropecuário' },
  { sigla: 'MV', descricao: 'Médico Veterinário' },
  { sigla: 'AA', descricao: 'Agente de Atividades' },
  { sigla: 'AFA/EA', descricao: 'Auditor Fiscal Engenheiro Agrônomo' },
  { sigla: 'AFA K9', descricao: 'Auditor Fiscal Federal Agropecuário (K9)' },
];
