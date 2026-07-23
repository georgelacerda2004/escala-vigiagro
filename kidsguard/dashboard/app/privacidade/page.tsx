// Política de Privacidade (modelo pt-BR). Página estática (server component).
// IMPORTANTE: texto-base — revisar com advogado antes de publicar.
export const metadata = {
  title: "Política de Privacidade — KidsGuard",
};

export default function Privacidade() {
  return (
    <main className="container">
      <p className="muted"><a href="/">← voltar ao painel</a></p>
      <h1>Política de Privacidade</h1>
      <div className="card" style={{ borderLeft: "4px solid var(--high)" }}>
        ⚠️ <b>Modelo — revisar com advogado.</b> Este texto é um rascunho de referência.
        Ajuste os dados da empresa, o contato do encarregado (DPO) e valide a conformidade
        com a LGPD antes de publicar.
      </div>

      <p className="muted">Última atualização: julho de 2026.</p>

      <h2>1. Quem somos</h2>
      <p>
        O KidsGuard é um serviço de monitoramento parental que ajuda responsáveis a
        acompanhar a atividade dos filhos menores no YouTube e no Roblox, gerando
        resumos e alertas de segurança. O controlador dos dados é [RAZÃO SOCIAL / CNPJ],
        com sede em [ENDEREÇO].
      </p>

      <h2>2. Quem pode usar</h2>
      <p>
        O KidsGuard destina-se <b>exclusivamente</b> ao responsável legal, para monitorar
        o próprio filho menor de idade. O responsável declara e é o único responsável por
        essa condição ao instalar o aplicativo e marcar o consentimento no aparelho da criança.
        É proibido usar o KidsGuard para monitorar adultos ou terceiros sem autorização legal.
      </p>

      <h2>3. Quais dados tratamos</h2>
      <ul>
        <li><b>Cadastro do responsável:</b> e-mail (para acesso via link mágico e alertas).</li>
        <li><b>Perfil da criança:</b> nome/apelido definido pelo responsável.</li>
        <li>
          <b>Atividade capturada no aparelho da criança:</b> títulos e canais de vídeos do
          YouTube; trechos de texto de chat do Roblox lidos por reconhecimento de texto (OCR)
          na tela; notificações de apps monitorados. Apenas o <b>texto relevante</b> (após um
          pré-filtro no próprio aparelho) é enviado à nuvem.
        </li>
        <li>
          <b>Imagens (opcional, desligado por padrão):</b> se o responsável ativar a
          "análise por visão", capturas de tela do jogo podem ser enviadas para análise de
          risco. <b>As imagens não são armazenadas</b> — são processadas e descartadas.
        </li>
        <li><b>Dados técnicos:</b> identificador do aparelho (device token) e registros de uso do serviço.</li>
      </ul>

      <h2>4. Finalidade e base legal (LGPD)</h2>
      <p>
        Tratamos dados de crianças e adolescentes no seu <b>melhor interesse</b> (art. 14 da
        LGPD), mediante <b>consentimento específico e destacado do responsável legal</b>,
        com a finalidade única de detectar riscos (aliciamento, conteúdo sexual, bullying,
        violência, compartilhamento de dados pessoais, entre outros) e informar o responsável.
        Não usamos os dados para publicidade nem os vendemos.
      </p>

      <h2>5. Com quem compartilhamos</h2>
      <p>Compartilhamos o mínimo necessário com operadores que sustentam o serviço:</p>
      <ul>
        <li><b>Anthropic (Claude AI):</b> classificação de risco dos textos/imagens.</li>
        <li><b>Supabase:</b> banco de dados e autenticação (hospedagem dos dados).</li>
        <li><b>Resend:</b> envio dos e-mails de alerta e resumo.</li>
        <li>Provedor de pagamento (ex.: Stripe), quando houver assinatura.</li>
      </ul>
      <p className="muted">
        Esses operadores tratam os dados apenas conforme nossas instruções. Parte da
        infraestrutura pode estar fora do Brasil (transferência internacional com salvaguardas).
      </p>

      <h2>6. Por quanto tempo guardamos</h2>
      <p>
        Praticamos a <b>minimização</b>: os eventos de atividade são <b>expurgados após 30 dias</b>.
        Resumos e alertas podem ser mantidos por mais tempo para histórico do responsável.
        Ao encerrar a conta, os dados são excluídos ou anonimizados.
      </p>

      <h2>7. Segurança</h2>
      <p>
        Adotamos criptografia em trânsito e em repouso, controle de acesso por linha (RLS)
        de modo que cada responsável só vê os próprios dados, e pré-filtragem no aparelho
        para reduzir o volume de dados sensíveis que trafega.
      </p>

      <h2>8. Direitos do titular</h2>
      <p>
        O responsável, em nome da criança, pode solicitar acesso, correção, exclusão,
        portabilidade e revogação do consentimento a qualquer momento. A revogação
        interrompe o monitoramento. Contate-nos pelos canais abaixo.
      </p>

      <h2>9. Transparência no aparelho</h2>
      <p>
        O KidsGuard <b>não é oculto</b>: exibe notificação persistente enquanto monitora e o
        indicador de gravação de tela do Android durante a captura do Roblox, conforme as
        políticas das lojas.
      </p>

      <h2>10. Contato / Encarregado (DPO)</h2>
      <p>
        Dúvidas ou solicitações: [E-MAIL DE CONTATO]. Encarregado de Proteção de Dados (DPO):
        [NOME / E-MAIL].
      </p>

      <p className="muted" style={{ marginTop: 24 }}>
        Veja também os <a href="/termos">Termos de Uso</a>.
      </p>
    </main>
  );
}
