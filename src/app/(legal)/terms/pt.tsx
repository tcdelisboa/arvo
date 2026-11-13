import Link from "next/link";
import { LEGAL, UPDATED_PT } from "@/lib/legal";

export function Portuguese() {
  return (
    <>
      <h1>Termos de uso</h1>
      <p className="lead">O acordo entre você e a Arvo. Última atualização: {UPDATED_PT}.</p>

      <h2>1. Quem somos</h2>
      <p>
        A Arvo é operada por {LEGAL.entity}, {LEGAL.address} (&ldquo;Arvo&rdquo;, &ldquo;nós&rdquo;). Você pode falar com a
        gente em {LEGAL.contact}.
      </p>

      <h2>2. O que a Arvo faz</h2>
      <p>
        A Arvo ajuda você a entender seus gastos e a aprender sobre investimentos. Ela lê as transações que você importa ou
        conecta, organiza em categorias, sugere formas de economizar, estima um perfil de investidor a partir de um
        questionário, mostra uma carteira modelo e exibe informações sobre ações e fundos.
      </p>
      <p>
        A Arvo é uma ferramenta educativa. Não é um banco, instituição de pagamento, corretora ou consultor de investimentos.
        Não oferece recomendação de investimento personalizada, não guarda dinheiro de clientes e não executa operações. Veja o{" "}
        <Link href="/risk">aviso de risco</Link>, que faz parte destes termos.
      </p>

      <h2>3. Sua conta</h2>
      <ul>
        <li>Você precisa ter pelo menos 18 anos.</li>
        <li>Informe dados corretos e não compartilhe sua senha. Você é responsável pelo que acontece na sua conta.</li>
        <li>Avise a gente imediatamente se achar que outra pessoa acessou sua conta.</li>
      </ul>

      <h2>4. Seus dados e conexões bancárias</h2>
      <p>
        Você decide o que traz para a Arvo. Se você conectar um banco, a conexão é feita por um provedor regulado de open
        banking e é somente leitura: a Arvo recebe informações de contas e transações e nunca pode movimentar dinheiro. Você pode
        desconectar um banco, remover uma conta ou apagar tudo a qualquer momento em Ajustes. A forma como tratamos dados
        pessoais está descrita no <Link href="/privacy">aviso de privacidade</Link>.
      </p>

      <h2>5. Uso aceitável</h2>
      <p>Você concorda em não:</p>
      <ul>
        <li>usar a Arvo para algo ilegal, nem enviar dados que você não tem direito de usar;</li>
        <li>tentar acessar contas de outras pessoas, nem sondar, raspar ou sobrecarregar o serviço;</li>
        <li>revender a Arvo ou apresentar o que ela mostra como consultoria financeira profissional para terceiros.</li>
      </ul>

      <h2>6. Informações de terceiros</h2>
      <p>
        Cotações, informações de empresas e notícias são fornecidas por terceiros. Não garantimos que estejam corretas, completas
        ou atualizadas, e elas não devem ser usadas como base para negociar.
      </p>

      <h2>7. Nossa responsabilidade com você</h2>
      <p>
        Oferecemos a Arvo com cuidado e competência razoáveis, mas não prometemos que ela estará sempre disponível ou livre de
        erros. Na medida permitida pela lei, não somos responsáveis por perdas em investimentos, por decisões que você tome usando
        a Arvo, nem por perdas indiretas ou consequentes. Nada nestes termos limita responsabilidades que a lei não permite
        limitar, nem seus direitos como consumidor.
      </p>

      <h2>8. Preço</h2>
      <p>
        A Arvo é grátis durante o acesso antecipado. Se lançarmos recursos pagos, vamos avisar você antes de cobrar qualquer
        coisa.
      </p>

      <h2>9. Encerramento</h2>
      <p>
        Você pode apagar sua conta a qualquer momento em Ajustes. Podemos suspender ou encerrar uma conta que descumpra estes
        termos. Quando uma conta é encerrada, os dados dela são apagados como descrito no aviso de privacidade.
      </p>

      <h2>10. Mudanças</h2>
      <p>
        Podemos atualizar estes termos conforme a Arvo evolui. Se a mudança for importante, avisaremos no app ou por e-mail antes
        de ela valer. Continuar usando a Arvo depois disso significa que você aceita os novos termos.
      </p>

      <h2>11. Lei aplicável</h2>
      <p>
        Estes termos são regidos pela lei do país onde {LEGAL.entity} está estabelecida. Se você é consumidor, continua protegido
        pelas regras obrigatórias do país onde mora.
      </p>
      <p className="small">Esta é uma tradução. Em caso de divergência, vale a versão em inglês.</p>
    </>
  );
}
