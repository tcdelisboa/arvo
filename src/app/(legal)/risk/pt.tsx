import { LEGAL, UPDATED_PT } from "@/lib/legal";

export function Portuguese() {
  return (
    <>
      <h1>Aviso de risco</h1>
      <p className="lead">Leia isto antes de agir com base em qualquer coisa que você veja na Arvo. Última atualização: {UPDATED_PT}.</p>

      <h2>A Arvo oferece educação, não recomendação</h2>
      <p>
        A Arvo é uma ferramenta de orçamento e de educação para investidores. Não é um banco, uma corretora, uma empresa de
        investimentos nem um consultor financeiro credenciado, e nada nela é recomendação de investimento personalizada,
        sugestão individual ou oferta para comprar ou vender qualquer título. A Arvo nunca guarda seu dinheiro e não pode dar
        ordens por você.
      </p>
      <p>
        O perfil de investidor, o valor mensal sugerido, a carteira modelo e a nota de adequação de cada ativo são calculados por
        regras fixas a partir das respostas e transações que você fornece. Eles não conseguem levar em conta tudo sobre a sua
        situação. Se não tiver certeza de que um investimento é certo para você, converse com um consultor financeiro
        regulado.
      </p>

      <h2>Você pode perder dinheiro</h2>
      <p>
        O valor dos investimentos e a renda que eles geram podem cair ou subir. Você pode receber menos do que investiu. Fundos
        de ações já perderam mais da metade do valor em crises passadas e levaram anos para se recuperar. Rentabilidade passada
        não garante rentabilidade futura.
      </p>
      <ul>
        <li>Só invista dinheiro de que você não vai precisar por pelo menos cinco anos.</li>
        <li>Tenha uma reserva de emergência em dinheiro antes de investir.</li>
        <li>Quite dívidas com juros altos primeiro.</li>
        <li>Ações individuais e fundos muito concentrados são bem mais arriscados do que fundos amplos e diversificados.</li>
        <li>Fundos cotados em outra moeda acrescentam risco de câmbio.</li>
      </ul>

      <h2>Projeções são ilustrações</h2>
      <p>
        Os gráficos que mostram no que seus investimentos podem se transformar usam retornos e volatilidade de longo prazo
        presumidos. São ilustrações de uma faixa de resultados, não previsões nem promessas. Eles ignoram inflação, impostos e
        taxas de corretagem e de plataforma, salvo indicação em contrário.
      </p>

      <h2>Dados de mercado</h2>
      <p>
        Cotações, números de empresas e notícias vêm de terceiros, podem estar atrasados ou errados e servem só para
        informação. Quando os dados ao vivo não estão disponíveis, a Arvo mostra preços de exemplo claramente identificados, que
        não são reais. Não negocie com base em nenhum número mostrado na Arvo sem conferir com sua corretora.
      </p>

      <h2>Inteligência artificial</h2>
      <p>
        Algumas explicações na Arvo são escritas por um modelo de IA a partir dos seus totais. A IA pode errar. Trate o que ela
        escreve como ponto de partida para o seu próprio raciocínio e confira tudo o que for importante.
      </p>

      <h2>Impostos</h2>
      <p>
        Rendimentos e ganhos de investimentos são tributados de forma diferente em cada país e dependem da sua situação. A Arvo
        não dá orientação tributária.
      </p>

      <p className="small">Dúvidas sobre este aviso: {LEGAL.contact}.</p>
      <p className="small">Esta é uma tradução. Em caso de divergência, vale a versão em inglês.</p>
    </>
  );
}
