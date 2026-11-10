import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getProfile, listTransactions } from "@/lib/data";
import { setCompanies, setMonthly } from "@/lib/actions/profile";
import { money, percent, todayIso } from "@/lib/format";
import { monthlyAverages } from "@/lib/spending";
import { recommendMonthly } from "@/lib/recommend";
import { buildPortfolio, companiesAllowed, portfolioStats, type Holding } from "@/lib/portfolio";
import { PROFILES, scoreRisk } from "@/lib/risk";
import { Badge, ButtonLink, cx, inputClass, Notice, PageHeader, Panel, PanelHeader } from "@/components/ui";
import { HoldingsRing } from "@/components/holdings-ring";
import { Projection } from "@/components/projection";
import { SubmitButton } from "@/components/submit-button";
import { Rings } from "@/components/rings";

export const metadata: Metadata = { title: "Portfolio" };

// Ring order and colours are fixed per holding so neighbours always stay distinguishable.
const RING_ORDER = ["world", "small", "gold", "cash", "companies", "bonds"];
const RING_COLOR: Record<string, string> = {
  world: "var(--s1)",
  small: "var(--s3)",
  gold: "var(--s2)",
  cash: "var(--s4)",
  companies: "var(--s7)",
  bonds: "var(--s6)",
};
const colorOf = (holding: Holding) => RING_COLOR[holding.assetClass === "companies" ? "companies" : holding.key];

const YEARS: Record<string, number> = { lt3: 3, "3to5": 5, "5to10": 10, "10to20": 20, gt20: 30 };

export default async function PortfolioPage() {
  const user = await requireUser();
  const [profile, txs] = await Promise.all([getProfile(user.id), listTransactions(user.id)]);
  const fmt = (cents: number) => money(cents, user.currency, { whole: true });

  if (!profile) {
    return (
      <>
        <PageHeader title="Portfolio" lead="A plan built around you, not around a product." />
        <Panel className="relative overflow-hidden p-6 sm:p-10">
          <Rings tone="brand" className="pointer-events-none absolute -bottom-10 -right-10 hidden h-[320px] w-[320px] -scale-x-100 opacity-70 sm:block" />
          <div className="relative max-w-xl">
            <h2 className="display text-[32px] text-ink sm:text-[40px]">First, find out what kind of investor you are</h2>
            <p className="mt-3 text-ink-2">
              Ten questions about your situation and how you feel about risk. From your answers Arvo works out your
              profile, how much you can comfortably invest each month, and a diversified portfolio with the exact share to
              put into each fund.
            </p>
            <div className="mt-7">
              <ButtonLink href="/portfolio/profile" size="lg">Find your investor profile</ButtonLink>
            </div>
            <p className="mt-4 text-[13px] text-ink-3">Takes about three minutes. You can retake it whenever your life changes.</p>
          </div>
        </Panel>
      </>
    );
  }

  const risk = scoreRisk(profile.answers);
  const info = PROFILES[profile.level];
  const holdings = buildPortfolio(profile.level, profile.monthlyCents, profile.includeCompanies);
  const stats = portfolioStats(holdings);
  const averages = monthlyAverages(txs, todayIso(), 3);
  const hasSpending = averages.months.length > 0 && averages.spending > 0;
  const recommendation = recommendMonthly(
    {
      incomeCents: profile.answers.monthlyIncome,
      spendingCents: hasSpending ? averages.spending : null,
      buffer: profile.answers.buffer,
      debt: profile.answers.debt,
    },
    fmt,
  );

  // Ring: one segment per fund, the companies sleeve as a single segment.
  const companyWeight = holdings.filter((h) => h.assetClass === "companies").reduce((sum, h) => sum + h.weight, 0);
  const segments = RING_ORDER.flatMap((key) => {
    if (key === "companies") {
      return companyWeight ? [{ label: "Individual companies", weight: companyWeight, color: RING_COLOR.companies }] : [];
    }
    const holding = holdings.find((h) => h.key === key);
    return holding ? [{ label: holding.short, weight: holding.weight, color: RING_COLOR[key] }] : [];
  });
  const stockShare = holdings.filter((h) => h.assetClass === "stocks" || h.assetClass === "companies").reduce((s, h) => s + h.weight, 0);
  const differs = Math.abs(profile.monthlyCents - recommendation.amountCents) >= 500;
  const symbol = money(0, user.currency, { whole: true }).replace(/[\d\s]/g, "");

  return (
    <>
      <PageHeader
        title="Portfolio"
        lead="Your investor profile, how much to invest, and exactly where to put it."
        action={<ButtonLink href="/portfolio/profile" variant="secondary">Retake the questions</ButtonLink>}
      />

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <Panel className="p-5 sm:p-7">
          <p className="text-[13px] text-ink-3">Your investor profile</p>
          <h2 className="display mt-1 text-[44px] text-ink sm:text-[52px]">{info.name}</h2>
          <div className="mt-4 flex max-w-sm gap-1.5" role="img" aria-label={`Risk level ${profile.level} of 5`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className={cx("h-1.5 flex-1 rounded-full", n <= profile.level ? "bg-brand" : "bg-line-strong")} />
            ))}
          </div>
          <div className="mt-1.5 flex max-w-sm justify-between text-[12px] text-ink-3">
            <span>Lower risk</span>
            <span>Higher risk</span>
          </div>
          <p className="mt-5 max-w-[58ch] text-[15px] leading-relaxed text-ink-2">{info.summary}</p>
          <dl className="mt-5 grid max-w-md grid-cols-2 gap-4 text-[13.5px]">
            <div>
              <dt className="text-ink-3">What your situation can carry</dt>
              <dd className="tnum mt-0.5 font-medium text-ink">{risk.capacity} out of 100</dd>
            </div>
            <div>
              <dt className="text-ink-3">What you are comfortable with</dt>
              <dd className="tnum mt-0.5 font-medium text-ink">{risk.tolerance} out of 100</dd>
            </div>
          </dl>
          {risk.limits.length ? (
            <div className="mt-5 space-y-2">
              {risk.limits.map((limit) => (
                <Notice key={limit} tone="accent">{limit}</Notice>
              ))}
            </div>
          ) : null}
        </Panel>

        <Panel className="flex flex-col p-5 sm:p-7">
          <p className="text-[13px] text-ink-3">You invest each month</p>
          <p className="figure mt-1 text-[52px] leading-none text-ink">{fmt(profile.monthlyCents)}</p>
          {differs ? (
            <p className="mt-2 text-[13.5px] text-ink-2">
              Arvo&apos;s suggestion from your current numbers is <span className="tnum font-medium text-ink">{fmt(recommendation.amountCents)}</span>.
            </p>
          ) : (
            <p className="mt-2 text-[13.5px] text-ink-2">This matches what Arvo suggests from your current numbers.</p>
          )}
          {recommendation.first ? <p className="mt-2 text-[13.5px] font-medium text-accent-ink">First: {recommendation.first.toLowerCase()}.</p> : null}
          <details className="mt-3 text-[13.5px] text-ink-2">
            <summary className="cursor-pointer font-medium text-ink">How the suggestion is worked out</summary>
            <ul className="mt-2 space-y-1.5 leading-relaxed">
              {recommendation.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </details>
          <form action={setMonthly} className="mt-auto flex items-end gap-2 pt-6">
            <div className="flex-1">
              <label htmlFor="monthly" className="mb-1.5 block text-[13px] text-ink-3">Change the amount ({symbol})</label>
              <input id="monthly" name="monthly" inputMode="decimal" defaultValue={Math.round(profile.monthlyCents / 100)} key={profile.monthlyCents} className={inputClass} />
            </div>
            <SubmitButton variant="secondary" pendingLabel="Saving">Save</SubmitButton>
          </form>
        </Panel>
      </div>

      <Panel className="mt-5">
        <PanelHeader
          title="Where to put it"
          note={`${Math.round(stockShare)}% in stocks, ${100 - Math.round(stockShare)}% in steadier assets`}
          action={
            companiesAllowed(profile.level) ? (
              <form action={setCompanies}>
                <input type="hidden" name="include" value={profile.includeCompanies ? "no" : "yes"} />
                <SubmitButton variant="secondary" size="sm" pendingLabel="Updating">
                  {profile.includeCompanies ? "Use funds only" : "Add individual companies"}
                </SubmitButton>
              </form>
            ) : null
          }
        />
        <div className="grid items-start gap-6 px-5 pb-5 pt-5 sm:px-6 sm:pb-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
          <div className="flex justify-center lg:sticky lg:top-6">
            <HoldingsRing segments={segments} center={`${holdings.length}`} caption={holdings.length === 1 ? "holding" : "holdings"} />
          </div>

          <ul className="divide-y divide-line">
            {holdings.map((holding) => (
              <li key={holding.key} className="py-4 first:pt-0 last:pb-0">
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-start gap-3 [&::-webkit-details-marker]:hidden">
                    <span className="mt-[7px] h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: colorOf(holding) }} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-[15px] font-semibold text-ink">{holding.short}</span>
                        <Badge>{holding.ticker}</Badge>
                      </span>
                      <span className="mt-0.5 block text-[13px] text-ink-3">{holding.name}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="figure block text-[24px] leading-none text-ink">{holding.weight % 1 ? holding.weight.toFixed(1) : holding.weight}%</span>
                      <span className="tnum mt-1 block text-[12.5px] text-ink-3">{money(holding.monthlyCents, user.currency)} a month</span>
                    </span>
                  </summary>
                  <div className="ml-[22px] mt-3 space-y-2.5 text-[14px] leading-relaxed text-ink-2">
                    <p><span className="font-medium text-ink">What it is. </span>{holding.what}</p>
                    <p><span className="font-medium text-ink">Why it is here. </span>{holding.why}</p>
                    <p><span className="font-medium text-ink">What to watch. </span>{holding.watch}</p>
                    <p className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-[13px] text-ink-3">
                      {holding.isin ? <span>ISIN {holding.isin}</span> : null}
                      {holding.cost ? <span>Ongoing cost: {holding.cost.toLowerCase()}</span> : null}
                      <Link href={`/markets/${encodeURIComponent(holding.symbol)}`} className="font-medium text-brand-ink underline underline-offset-2">
                        Price, details and news
                      </Link>
                    </p>
                  </div>
                  <p className="ml-[22px] mt-2 text-[13px] text-ink-3 group-open:hidden">Tap to see what it is and why it is here.</p>
                </details>
              </li>
            ))}
          </ul>
        </div>
        {profile.includeCompanies && companiesAllowed(profile.level) ? (
          <div className="px-5 pb-5 sm:px-6 sm:pb-6">
            <Notice>
              The companies shown are examples of large, profitable businesses in different industries. Single shares carry
              more risk than funds. Swap them for companies you understand, and check how each one fits your profile in Markets.
            </Notice>
          </div>
        ) : null}
        {user.currency !== "EUR" ? (
          <div className="px-5 pb-5 sm:px-6 sm:pb-6">
            <Notice>
              These funds trade in euros on the Xetra exchange. Your broker converts {user.currency} when you buy. The bond and
              cash-like funds are built for euro savers, so ask your broker for the {user.currency} equivalent of those two.
            </Notice>
          </div>
        ) : null}
      </Panel>

      <Panel className="mt-5">
        <PanelHeader title="What it could become" note="If you keep investing the same amount every month" />
        <div className="px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
          <Projection
            monthlyCents={profile.monthlyCents}
            expectedReturn={stats.expectedReturn}
            volatility={stats.volatility}
            currency={user.currency}
            defaultYears={YEARS[profile.answers.horizon] ?? 20}
          />
        </div>
      </Panel>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel className="p-5 sm:p-7">
          <h2 className="text-[17px] font-semibold text-ink">What a bad year looks like</h2>
          <p className="figure mt-3 text-[40px] leading-none text-neg">{percent(stats.badYear * 100, 0)}</p>
          <p className="mt-3 max-w-[56ch] text-[14px] leading-relaxed text-ink-2">
            A mix like this can lose around {percent(Math.abs(stats.badYear) * 100, 0)} in a rough year, and more in a crisis. On{" "}
            {fmt(1_000_000)} invested, that is {fmt(Math.round(1_000_000 * Math.abs(stats.badYear)))} gone on paper. It has always come back
            in the past, but it can take years. If that number would make you sell, retake the questions and choose calmer answers.
          </p>
        </Panel>

        <Panel className="p-5 sm:p-7">
          <h2 className="text-[17px] font-semibold text-ink">How to put this into practice</h2>
          <ol className="mt-4 space-y-3.5 text-[14px] leading-relaxed text-ink-2">
            {[
              ["Open an account with a broker", "Choose one that offers these funds and a free or cheap monthly savings plan. Search for each fund by its ticker or ISIN."],
              ["Set up a monthly order", "Schedule the amounts above for the day after your salary arrives, so it happens without you."],
              ["Leave it alone", "Check once or twice a year. If any holding has drifted more than five points from its share, top up the ones that fell behind."],
              ["Come back when life changes", "A new job, a home purchase or a child changes how much risk you can carry. Retake the questions then."],
            ].map(([title, body], index) => (
              <li key={title} className="flex gap-3.5">
                <span className="figure flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[15px] text-brand-ink">{index + 1}</span>
                <span><span className="font-medium text-ink">{title}. </span>{body}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      <p className="mt-6 max-w-[80ch] text-[12.5px] leading-relaxed text-ink-3">
        Arvo is an educational tool. This model portfolio is generated from your answers by fixed rules and is not personal
        investment advice or an offer to buy or sell any security. Arvo does not hold your money or place orders. The value of
        investments can fall as well as rise and you may get back less than you put in.{" "}
        <Link href="/risk" className="underline underline-offset-2">Read the full risk notice.</Link>
      </p>
    </>
  );
}
