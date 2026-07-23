// Termos de Uso (modelo pt-BR). Página estática (server component).
// IMPORTANTE: texto-base — revisar com advogado antes de publicar.
export const metadata = {
  title: "Termos de Uso — KidsGuard",
};

export default function Termos() {
  return (
    <main className="container">
      <p className="muted"><a href="/">← voltar ao painel</a></p>
      <h1>Termos de Uso</h1>
      <div className="card" style={{ borderLeft: "4px solid var(--high)" }}>
        ⚠️ <b>Modelo — revisar com advogado.</b> Este texto é um rascunho de referência.
        Ajuste os dados da empresa, foro, valores e limitações antes de publicar.
      </div>

      <p className="muted">Última atualização: julho de 2026.</p>

      <h2>1. Aceitação</h2>
      <p>
        Ao criar uma conta e/ou instalar o KidsGuard, você concorda com estes Termos e com a
        <a href="/privacidade"> Política de Privacidade</a>. Se não concordar, não use o serviço.
      </p>

      <h2>2. O que o KidsGuard faz</h2>
      <p>
        O KidsGuard monitora a atividade do aparelho da criança no YouTube e no Roblox,
        aplica inteligência artificial para classificar riscos e envia resumos e alertas ao
        responsável. O serviço é um <b>apoio</b> à supervisão parental — <b>não substitui</b>
        a atenção do responsável nem garante a detecção de todo conteúdo impróprio.
      </p>

      <h2>3. Uso permitido</h2>
      <ul>
        <li>Você declara ser o <b>responsável legal</b> pela criança monitorada.</li>
        <li>Você só pode monitorar o <b>próprio filho menor de idade</b>.</li>
        <li>É <b>proibido</b> usar o KidsGuard para vigiar adultos, cônjuges, funcionários ou
          terceiros sem autorização legal. Esse uso é de sua exclusiva responsabilidade e pode
          constituir crime.</li>
      </ul>

      <h2>4. Limitações técnicas (transparência)</h2>
      <p>
        O chat do Roblox é desenhado pelo motor do jogo e pode se ocultar sozinho; a leitura
        por captura de tela e OCR <b>não é 100%</b>. No iPhone, restrições da Apple impedem a
        leitura de chat de outros apps — nele o KidsGuard oferece apenas recursos limitados.
        Recomendamos combinar o KidsGuard com os <b>controles parentais oficiais</b> do Roblox
        e do YouTube.
      </p>

      <h2>5. Assinatura e pagamento</h2>
      <p>
        Alguns recursos exigem assinatura paga, renovada automaticamente conforme o plano
        contratado, com cobrança pelo provedor de pagamento. Você pode cancelar a qualquer
        momento; o acesso permanece até o fim do período já pago. Preços e planos podem mudar
        mediante aviso.
      </p>

      <h2>6. Responsabilidades</h2>
      <p>
        Você é responsável por manter a confidencialidade da sua conta, por obter o
        consentimento aplicável e por cumprir a legislação. O serviço é fornecido "no estado em
        que se encontra"; na máxima extensão permitida em lei, não nos responsabilizamos por
        danos indiretos decorrentes de falhas de detecção, indisponibilidade ou uso indevido.
      </p>

      <h2>7. Encerramento</h2>
      <p>
        Você pode encerrar a conta quando quiser. Podemos suspender contas que violem estes
        Termos. No encerramento, os dados são tratados conforme a Política de Privacidade.
      </p>

      <h2>8. Alterações</h2>
      <p>
        Podemos atualizar estes Termos. Mudanças relevantes serão comunicadas pelos canais de
        contato. O uso continuado após a atualização implica concordância.
      </p>

      <h2>9. Foro e contato</h2>
      <p>
        Estes Termos regem-se pela lei brasileira, foro da comarca de [CIDADE/UF]. Contato:
        [E-MAIL DE CONTATO].
      </p>

      <p className="muted" style={{ marginTop: 24 }}>
        Veja também a <a href="/privacidade">Política de Privacidade</a>.
      </p>
    </main>
  );
}
