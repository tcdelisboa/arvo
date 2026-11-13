import { getI18n, titled } from "@/lib/i18n/server";
import { msg } from "@/lib/i18n/core";
import { LEGAL } from "@/lib/legal";
import { Portuguese } from "./pt";

export const generateMetadata = titled(msg("Risk notice"));

function English() {
  return (
    <>
      <h1>Risk notice</h1>
      <p className="lead">Read this before you act on anything you see in Arvo. Last updated {LEGAL.updated}.</p>

      <h2>Arvo gives education, not advice</h2>
      <p>
        Arvo is a budgeting and investor-education tool. It is not a bank, a broker, an investment firm or a licensed financial
        adviser, and nothing in it is personal investment advice, a personal recommendation, or an offer to buy or sell any
        security. Arvo never holds your money and cannot place orders for you.
      </p>
      <p>
        The investor profile, the suggested monthly amount, the model portfolio and the fit rating on each asset are produced
        by fixed rules from the answers and transactions you provide. They cannot take account of everything about your
        circumstances. If you are unsure whether an investment is right for you, speak to a regulated financial adviser.
      </p>

      <h2>You can lose money</h2>
      <p>
        The value of investments and the income from them can fall as well as rise. You may get back less than you put in. Stock
        funds have lost more than half their value in past crises and taken years to recover. Past performance does not predict
        future returns.
      </p>
      <ul>
        <li>Only invest money you will not need for at least five years.</li>
        <li>Keep an emergency fund in cash before you invest.</li>
        <li>Pay off high-interest debt first.</li>
        <li>Single shares and narrow funds are much riskier than broad, diversified funds.</li>
        <li>Funds priced in a currency other than your own add exchange-rate risk.</li>
      </ul>

      <h2>Projections are illustrations</h2>
      <p>
        Charts that show what your investments could become use assumed long-run returns and volatility. They are illustrations
        of a range of outcomes, not forecasts or promises. They ignore inflation, taxes, and trading and platform fees unless
        stated otherwise.
      </p>

      <h2>Market data</h2>
      <p>
        Prices, company figures and news come from third parties, may be delayed or wrong, and are provided for information
        only. When live data is unavailable Arvo shows clearly labelled sample prices, which are not real. Do not trade on any
        figure shown in Arvo without checking it with your broker.
      </p>

      <h2>Artificial intelligence</h2>
      <p>
        Some explanations in Arvo are written by an AI model from your totals. AI can be wrong. Treat what it writes as a
        starting point for your own thinking, and check anything important.
      </p>

      <h2>Tax</h2>
      <p>
        Investment income and gains are taxed differently in each country and depend on your situation. Arvo does not give tax
        advice.
      </p>

      <p className="small">Questions about this notice: {LEGAL.contact}.</p>
    </>
  );
}

export default async function RiskPage() {
  const { lang } = await getI18n();
  return lang === "pt" ? <Portuguese /> : <English />;
}
