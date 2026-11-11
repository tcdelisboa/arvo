import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Check, ExternalLink, Info, Minus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getProfile, listWatchlist } from "@/lib/data";
import { aiFitNote } from "@/lib/ai";
import { getDetail, getHistory, getNews } from "@/lib/market";
import { assessFit, volatilityFrom, type Fit } from "@/lib/market/suitability";
import { normaliseSymbol, type Detail } from "@/lib/market/types";
import { UNIVERSE_BY_SYMBOL } from "@/lib/market/universe";
import { compact, day, number, percent, price, todayIso } from "@/lib/format";
import { PROFILES, type Level } from "@/lib/risk";
import { Badge, ButtonLink, cx, Notice, Panel, PanelHeader } from "@/components/ui";
import { PriceChart } from "@/components/price-chart";
import { WatchButton } from "@/components/watch-button";

export async function generateMetadata({ params }: PageProps<"/markets/[symbol]">): Promise<Metadata> {
  const symbol = normaliseSymbol((await params).symbol);
  return { title: symbol ?? "Asset" };
}

function ago(timestamp: number): string {
  const hours = Math.max(0, (Date.now() - timestamp) / 3_600_000);
  if (hours < 1) return "Less than an hour ago";
  if (hours < 24) return `${Math.round(hours)} ${Math.round(hours) === 1 ? "hour" : "hours"} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} ${days === 1 ? "day" : "days"} ago`;
  return new Date(timestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

async function AiNote({ detail, fit, level }: { detail: Detail; fit: Fit; level: Level }) {
  const note = await aiFitNote({
    symbol: detail.symbol,
    name: detail.name,
    type: detail.type === "etf" ? "fund" : "single company share",
    profile: PROFILES[level].name,
    fitLabel: fit.label,
    reasons: fit.reasons.map((r) => r.text),
    description: detail.description?.slice(0, 600) ?? null,
  });
  if (!note) return null;
  return (
    <div className="mt-5 border-t border-line pt-4">
      <p className="text-[14px] leading-relaxed text-ink-2">{note}</p>
      <p className="mt-1.5 text-[12px] text-ink-3">Written by Arvo&apos;s AI from the facts on this page.</p>
    </div>
  );
}

export default async function AssetPage({ params }: PageProps<"/markets/[symbol]">) {
  const user = await requireUser();
  const symbol = normaliseSymbol((await params).symbol);
  if (!symbol) notFound();

  const [{ data: detail, source, asOf }, history, news, profile, watchlist] = await Promise.all([
    getDetail(symbol),
    getHistory(symbol, "1y"),
    getNews(symbol),
    getProfile(user.id),
    listWatchlist(user.id),
  ]);
  if (!detail) notFound();

  const known = UNIVERSE_BY_SYMBOL.get(symbol);
  const volatility = volatilityFrom(history.data);
  const fit = profile
    ? assessFit({ type: detail.type, name: detail.name, metrics: detail.metrics, volatility, known }, profile.level)
    : null;
  const m = detail.metrics;
  const isFund = detail.type === "etf";
  const sample = source === "sample" || history.source === "sample";

  const facts: [string, string, string][] = isFund
    ? [
        ["Fund size", compact(m.totalAssets, detail.currency), "The total money invested in the fund. Bigger funds are cheaper to run and less likely to close."],
        ["Ongoing cost", m.expenseRatio === null ? "—" : `${percent(m.expenseRatio, 2)} a year`, "Taken from the fund's value each year. Lower is better."],
        ["Dividend yield", percent(m.dividendYield, 2), "Income paid out over the last year, as a share of the price."],
        ["Price swings (1 year)", percent(volatility, 0), "How much the price typically moved over the last year. A global stock fund is around 15%."],
        ["52-week range", `${price(m.week52Low, detail.currency)} to ${price(m.week52High, detail.currency)}`, "The lowest and highest price in the last year."],
      ]
    : [
        ["Company value", compact(m.marketCap, detail.currency), "What the whole company is worth at today's share price."],
        ["Price to earnings", number(m.trailingPE, 1), "How many years of current profit the share price represents. Higher means investors expect more growth."],
        ["Expected price to earnings", number(m.forwardPE, 1), "The same, using next year's forecast profit."],
        ["Dividend yield", percent(m.dividendYield, 2), "Cash paid to shareholders each year, as a share of the price."],
        ["Profit margin", percent(m.profitMargin, 1), "How much of each sale the company keeps as profit."],
        ["Sales growth", percent(m.revenueGrowth, 1, true), "Change in sales compared with a year earlier."],
        ["Return on equity", percent(m.returnOnEquity, 1), "Profit earned on shareholders' money. Above 15% is strong."],
        ["Debt to equity", m.debtToEquity === null ? "—" : `${number(m.debtToEquity / 100, 2)}x`, "Borrowings compared with shareholders' money. Above 2x is heavy."],
        ["Price swings (1 year)", percent(volatility, 0), "How much the price typically moved over the last year. A global stock fund is around 15%."],
        ["52-week range", `${price(m.week52Low, detail.currency)} to ${price(m.week52High, detail.currency)}`, "The lowest and highest price in the last year."],
      ];

  // With sample data there are no company figures; show only the rows that have a value.
  const shownFacts = sample ? facts.filter(([, value]) => !value.startsWith("\u2014")) : facts;
  const change = detail.changePercent;

  return (
    <>
      <Link href="/markets" className="text-[13.5px] text-ink-2 underline underline-offset-2 hover:text-ink">
        Back to markets
      </Link>

      <header className="mb-6 mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge>{detail.symbol}</Badge>
            <Badge>{isFund ? "Fund" : "Share"}</Badge>
            {detail.exchange ? <span className="text-[13px] text-ink-3">{detail.exchange}</span> : null}
          </div>
          <h1 className="display text-[32px] text-ink sm:text-[42px]">{known?.name ?? detail.name}</h1>
          <p className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="figure text-[38px] leading-none text-ink sm:text-[44px]">{price(detail.price, detail.currency)}</span>
            <span className={cx("tnum text-[15px] font-medium", change === null ? "text-ink-3" : change >= 0 ? "text-pos" : "text-neg")}>
              {percent(change, 2, true)} today
            </span>
          </p>
        </div>
        <WatchButton symbol={symbol} watching={watchlist.includes(symbol)} />
      </header>

      {sample ? (
        <div className="mb-5">
          <Notice tone="accent" title="Sample prices.">
            Live market data can&apos;t be reached right now. The price and chart below are generated for demonstration and are not real.
          </Notice>
        </div>
      ) : asOf ? (
        <div className="mb-5">
          <Notice title="This price may be out of date.">
            Live prices can&apos;t be refreshed right now. This is the last one Arvo received, on {day(todayIso(new Date(asOf)))}.
          </Notice>
        </div>
      ) : null}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Panel className="p-5 sm:p-6">
            <PriceChart symbol={symbol} currency={detail.currency} initial={history.data} initialRange="1y" />
          </Panel>

          <Panel>
            <PanelHeader title={isFund ? "About this fund" : "About the company"} />
            <div className="px-5 pb-5 pt-3 sm:px-6 sm:pb-6">
              {known ? <p className="text-[15px] font-medium text-ink">{known.blurb}</p> : null}
              {detail.description && detail.description !== known?.blurb ? (
                <p className="mt-2 max-w-[72ch] text-[14px] leading-relaxed text-ink-2">
                  {detail.description.length > 900 ? `${detail.description.slice(0, 900).replace(/\s+\S*$/, "")}…` : detail.description}
                </p>
              ) : null}
              <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3 text-[13.5px]">
                {[
                  ["Sector", detail.sector ?? known?.sector],
                  ["Industry", detail.industry],
                  [isFund ? "Covers" : "Based in", detail.country ?? known?.region],
                  ["Employees", detail.employees ? detail.employees.toLocaleString("en-GB") : null],
                  ["Fund manager", detail.fundFamily],
                ]
                  .filter(([, value]) => value)
                  .map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-ink-3">{label}</dt>
                      <dd className="mt-0.5 font-medium text-ink">{value}</dd>
                    </div>
                  ))}
              </dl>
              {detail.website && /^https?:\/\//.test(detail.website) ? (
                <a href={detail.website} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-brand-ink underline underline-offset-2">
                  Company website <ExternalLink size={14} />
                </a>
              ) : null}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="News" />
            <div className="px-5 pb-5 pt-2 sm:px-6 sm:pb-6">
              {news.data.length ? (
                <ul className="divide-y divide-line">
                  {news.data.map((item) => (
                    <li key={item.url} className="py-3">
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="group block">
                        <span className="text-[14.5px] font-medium text-ink underline-offset-2 group-hover:underline">{item.title}</span>
                        <span className="mt-1 block text-[12.5px] text-ink-3">
                          {item.publisher}, {ago(item.publishedAt)}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="pt-1 text-[14px] text-ink-3">
                  {news.source === "sample" ? "News appears here when live market data is connected." : "No recent news for this asset."}
                </p>
              )}
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel className="p-5 sm:p-6">
            <h2 className="text-[17px] font-semibold text-ink">Does it fit you?</h2>
            {fit && profile ? (
              <>
                <div className="mt-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="display text-[36px] text-ink">{fit.label}</p>
                    <p className="mt-1 text-[13.5px] text-ink-2">
                      for your <span className="font-medium text-ink">{PROFILES[profile.level].name}</span> profile
                    </p>
                  </div>
                  <p className="text-right">
                    <span className="figure block text-[34px] leading-none text-ink">{fit.score}</span>
                    <span className="text-[12px] text-ink-3">out of 100</span>
                  </p>
                </div>

                <div className="mt-5">
                  <div className="relative h-1.5 rounded-full bg-sunken">
                    <span
                      className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-ink"
                      style={{ left: `${((fit.risk - 1) / 4) * 100}%` }}
                    />
                    <span
                      className="absolute -top-1 h-3.5 w-0.5 -translate-x-1/2 bg-accent"
                      style={{ left: `${((profile.level - 1) / 4) * 100}%` }}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap justify-between gap-x-4 text-[12.5px] text-ink-3">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ink" /> This asset: {fit.riskLabel.toLowerCase()} risk</span>
                    <span className="flex items-center gap-1.5"><span className="h-3 w-0.5 bg-accent" /> Your profile</span>
                  </div>
                </div>

                <p className="mt-5 text-[15px] font-medium text-ink">{fit.summary}</p>
                <ul className="mt-3 space-y-2.5">
                  {fit.reasons.map((reason) => (
                    <li key={reason.text} className="flex gap-2.5 text-[14px] leading-relaxed text-ink-2">
                      <span
                        className={cx(
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                          reason.tone === "plus" ? "bg-brand-soft text-brand-ink" : reason.tone === "minus" ? "bg-neg-soft text-neg" : "bg-sunken text-ink-2",
                        )}
                      >
                        {reason.tone === "plus" ? <Check size={12} strokeWidth={3} /> : reason.tone === "minus" ? <Minus size={12} strokeWidth={3} /> : <Info size={12} strokeWidth={2.5} />}
                      </span>
                      <span>{reason.text}</span>
                    </li>
                  ))}
                </ul>

                <p className="mt-5 rounded-control bg-sunken px-4 py-3 text-[13.5px] text-ink-2">
                  {fit.maxWeight >= 100
                    ? "A fund like this can make up the core of a portfolio."
                    : fit.maxWeight === 0
                      ? "For your profile, a diversified fund covers this ground with far less risk."
                      : (
                        <>
                          If you hold it, a sensible ceiling for your profile is about{" "}
                          <span className="tnum font-semibold text-ink">{fit.maxWeight}%</span> of your portfolio.
                        </>
                      )}
                </p>

                <Suspense fallback={null}>
                  <AiNote detail={detail} fit={fit} level={profile.level} />
                </Suspense>

                <p className="mt-4 text-[12px] leading-relaxed text-ink-3">
                  Fit compares this asset&apos;s risk with your profile using fixed rules. It is education, not a recommendation, and says
                  nothing about where the price will go.
                </p>
              </>
            ) : (
              <>
                <p className="mt-2 text-[14.5px] text-ink-2">
                  Find your investor profile and Arvo will show how this asset&apos;s risk compares with what you can carry, and how
                  much of a portfolio it could sensibly take up.
                </p>
                <div className="mt-5">
                  <ButtonLink href="/portfolio/profile">Find your investor profile</ButtonLink>
                </div>
              </>
            )}
          </Panel>

          <Panel>
            <PanelHeader title="Key numbers" />
            <dl className="divide-y divide-line px-5 pb-3 pt-2 sm:px-6">
              {shownFacts.map(([label, value, meaning]) => (
                <div key={label} className="py-3">
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-[14px] text-ink-2">{label}</dt>
                    <dd className="tnum text-right text-[14.5px] font-medium text-ink">{value}</dd>
                  </div>
                  <p className="mt-0.5 text-[12.5px] leading-snug text-ink-3">{meaning}</p>
                </div>
              ))}
            </dl>
            {sample ? <p className="px-5 pb-5 text-[12.5px] text-ink-3 sm:px-6">Company figures appear when live market data is connected.</p> : null}
          </Panel>
        </div>
      </div>
    </>
  );
}
