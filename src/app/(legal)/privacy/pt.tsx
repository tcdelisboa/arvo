import { LEGAL, UPDATED_PT } from "@/lib/legal";

export function Portuguese() {
  return (
    <>
      <h1>Aviso de privacidade</h1>
      <p className="lead">O que a Arvo sabe sobre você, por quê, e como fazer ela esquecer. Última atualização: {UPDATED_PT}.</p>

      <h2>Quem é o responsável</h2>
      <p>
        O controlador dos seus dados pessoais é {LEGAL.entity}, {LEGAL.address}. Contato: {LEGAL.contact}.
      </p>

      <h2>O que coletamos</h2>
      <ul>
        <li><strong>Dados da conta:</strong> seu nome, e-mail e um hash irreversível da sua senha. Nunca guardamos a senha em si.</li>
        <li><strong>Transações:</strong> data, descrição, valor e categoria das transações que você importa ou conecta, e os nomes das contas a que pertencem.</li>
        <li><strong>Perfil de investidor:</strong> suas respostas ao questionário (idade, renda, prazo, atitude diante do risco) e o valor mensal que você escolher.</li>
        <li><strong>Lista de acompanhamento:</strong> as ações e fundos que você escolhe seguir.</li>
        <li><strong>Lista de espera:</strong> se você pedir para saber quando a Arvo abrir, seu e-mail, para que você disse que quer a Arvo e qual link trouxe você até aqui. Usamos isso só para avisar sobre o lançamento e apagamos quando você pedir.</li>
        <li><strong>Plano e uso:</strong> em qual plano você está, se pediu para ser avisado quando o Plus abrir e os dias em que usou a Arvo. Usamos os dias para ver se as pessoas voltam, não o que você olhou.</li>
        <li><strong>Dados técnicos:</strong> um cookie de sessão que mantém você conectado, um cookie com o idioma que você escolheu, e seu endereço IP em registros de segurança de curta duração que limitam tentativas repetidas de login.</li>
      </ul>
      <p>Não usamos cookies de publicidade ou rastreamento, e não vendemos nem alugamos dados pessoais.</p>

      <h2>Por que usamos, e com qual base</h2>
      <ul>
        <li>Para oferecer a Arvo a você: mostrar seus gastos, perfil e carteira (execução do nosso contrato com você).</li>
        <li>Para manter as contas seguras e evitar abusos (nosso interesse legítimo).</li>
        <li>Para cumprir obrigações legais que se aplicam a nós.</li>
      </ul>

      <h2>Quem mais trata os dados</h2>
      <p>Usamos poucos prestadores de serviço, cada um com um contrato de tratamento de dados:</p>
      <ul>
        <li><strong>Hospedagem e banco de dados</strong>, que rodam o serviço.</li>
        <li><strong>Provedor de open banking (Plaid)</strong>, só se você escolher conectar um banco. Você autoriza a conexão na página do próprio banco; a Arvo nunca vê sua senha do banco, e os tokens de acesso são guardados criptografados.</li>
        <li><strong>Provedor de IA (Anthropic)</strong>, para escrever dicas de economia e explicações. Enviamos só números agregados, como totais por categoria e nomes de estabelecimentos recorrentes. Não enviamos seu nome, e-mail, dados de contas nem transações individuais.</li>
        <li><strong>Provedor de e-mail</strong>, para enviar e-mails de redefinição de senha.</li>
        <li><strong>Provedor de dados de mercado</strong>, que recebe o código do ativo consultado, mas nada sobre você.</li>
      </ul>
      <p>
        Alguns prestadores ficam fora do Espaço Econômico Europeu. Nesses casos, as transferências se baseiam em decisão de
        adequação ou em cláusulas contratuais padrão.
      </p>

      <h2>Por quanto tempo guardamos</h2>
      <p>
        Guardamos seus dados enquanto você tiver uma conta. Quando você remove uma conta ou desconecta um banco, as transações
        dela são apagadas na hora. Quando você apaga sua conta da Arvo, tudo ligado a ela é apagado do banco de dados em uso na
        hora e dos backups em até 35 dias. Registros de segurança ficam guardados por um dia.
      </p>

      <h2>Seus direitos</h2>
      <p>Pelo RGPD e por leis semelhantes (como a LGPD, no Brasil), você pode:</p>
      <ul>
        <li>receber uma cópia dos seus dados: Ajustes, depois Baixar meus dados;</li>
        <li>corrigir os dados: em Ajustes, ou mudando a categoria de uma transação;</li>
        <li>apagar os dados: Ajustes, depois Apagar conta;</li>
        <li>se opor ao tratamento ou restringi-lo, ou tirar uma dúvida, escrevendo para {LEGAL.contact};</li>
        <li>reclamar à autoridade de proteção de dados do lugar onde você mora.</li>
      </ul>

      <h2>Segurança</h2>
      <p>
        As conexões são criptografadas em trânsito. As senhas usam hash com scrypt. Os tokens bancários são criptografados em
        repouso com AES-256-GCM. As sessões são guardadas como hashes e expiram após 30 dias. Nenhum sistema é perfeitamente
        seguro; se um incidente afetar você, vamos avisar você e a autoridade, como a lei exige.
      </p>

      <h2>Mudanças</h2>
      <p>
        Se mudarmos a forma como usamos dados pessoais, vamos atualizar este aviso e contar sobre mudanças importantes antes de
        elas valerem.
      </p>
      <p className="small">Esta é uma tradução. Em caso de divergência, vale a versão em inglês.</p>
    </>
  );
}
