// Mapeia o cabecalho de equipe da planilha para a sigla de funcao + descricao.

const up = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[Ì€-Í¯]/g, '')
    .toUpperCase()
    .trim();

export function mapTeam(rawName) {
  const n = up(rawName);
  if (/\bMV\b|MEDIC|VETERIN/.test(n)) return { sigla: 'MV', descricao: 'MÃ©dico VeterinÃ¡rio' };
  if (/\bEA\b|ENGENHEIR|AGRONOM/.test(n))
    return { sigla: 'AFA/EA', descricao: 'Auditor Fiscal Engenheiro AgrÃ´nomo' };
  if (/\bK9\b/.test(n)) return { sigla: 'AFA K9', descricao: 'Auditor Fiscal Federal AgropecuÃ¡rio (K9)' };
  if (/^A{2,}$|\bAGENTE\b|ATIVIDADE/.test(n))
    return { sigla: 'AA', descricao: 'Agente de Atividades' };
  if (/AFFA|AFA/.test(n)) return { sigla: 'AFA', descricao: 'Auditor Fiscal Federal AgropecuÃ¡rio' };
  return { sigla: rawName, descricao: rawName };
}

export const SIGLA_LEGENDA = [
  { sigla: 'AFA', descricao: 'Auditor Fiscal Federal AgropecuÃ¡rio' },
  { sigla: 'MV', descricao: 'MÃ©dico VeterinÃ¡rio' },
  { sigla: 'AA', descricao: 'Agente de Atividades' },
  { sigla: 'AFA/EA', descricao: 'Auditor Fiscal Engenheiro AgrÃ´nomo' },
  { sigla: 'AFA K9', descricao: 'Auditor Fiscal Federal AgropecuÃ¡rio (K9)' },
];