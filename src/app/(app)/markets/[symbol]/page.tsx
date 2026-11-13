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
import { todayIso } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import type { Lang, T } from "@/lib/i18n/core";
import { PROFILES, type Level } from "@/lib/risk";
import { Badge, ButtonLink, cx, Notice, Panel, PanelHeader } from "@/components/ui";
import { PriceChart } from "@/components/price-chart";
import { WatchButton } from "@/components/watch-button";
import { FitScale } from "@/components/fit-scale";
import { StatementsPanel } from "@/components/statements-panel";

export async function generateMetadata({ params }: PageProps<"/markets/[symbol]">): Promise<Metadata> {
  const symbol = normaliseSymbol((await params).symbol);
  return { title: symbol ?? (await getI18n()).t("Asset") };
}

function ago(timestamp: number, t: T, lang: Lang): string {
  const hours = Math.max(0, (Date.now() - timestamp) / 3_600_000);
  if (hours < 1) return t("Less than an hour ago");
  const h = Math.round(hours);
  if (hours < 24) return h === 1 ? t("1 hour ago") : t("{n} hours ago", { n: h });
  const days = Math.round(hours / 24);
  if (days < 30) return days === 1 ? t("1 day ago") : t("{n} days ago", { n: days });
  return new Date(timestamp).toLocaleDateString(lang === "pt" ? "pt-BR" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

async function AiNote({ detail, fit, level }: { detail: Detail; fit: Fit; level: Level }) {
  const { t, lang } = await getI18n();
  const note = await aiFitNote({
    lang,
    symbol: detail.symbol,
    name: detail.name,
    type: detail.type === "etf" ? "fund" : "single company share",
    profile: t(PROFILES[level].name),
    fitLabel: t(fit.label),
    reasons: fit.reasons.map((r) => r.text),
    description: detail.description?.slice(0, 600) ?? null,
  });
  if (!note) return null;
  return (
    <div className="mt-5 border-t border-line pt-4">
      <p className="text-[14px] leading-relaxed text-ink-2">{note}</p>
      <p className="mt-1.5 text-[12px] text-ink-3">{t("Written by Arvo's AI from the facts on this page.")}</p>
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
  const { t, f, lang } = await getI18n();
  const { compact, day, number, percent, price } = f;

  const known = UNIVERSE_BY_SYMBOL.get(symbol);
  const volatility = volatilityFrom(history.data);
  const fit = profile
    ? assessFit({ type: detail.type, name: detail.name, metrics: detail.metrics, volatility, known }, profile.level, t)
    : null;
  const m = detail.metrics;
  const isFund = detail.type === "etf";
  const sample = source === "sample" || history.source === "sample";

  const facts: [string, string, string][] = isFund
    ? [
        [t("Fund size"), compact(m.totalAssets, detail.currency), t("The total money invested in the fund. Bigger funds are cheaper to run and less likely to close.")],
        [t("Ongoing cost"), m.expenseRatio === null ? "—" : t("{share} a year", { share: percent(m.expenseRatio, 2) }), t("Taken from the fund's value each year. Lower is better.")],
        [t("Dividend yield"), percent(m.dividendYield, 2), t("Income paid out over the last year, as a share of the price.")],
        [t("Price swings (1 year)"), percent(volatility, 0), t("How much the price typically moved over the last year. A global stock fund is around 15%.")],
        [t("52-week range"), t("{low} to {high}", { low: price(m.week52Low, detail.currency), high: price(m.week52High, detail.currency) }), t("The lowest and highest price in the last year.")],
      ]
    : [
        [t("Company value"), compact(m.marketCap, detail.currency), t("What the whole company is worth at today's share price.")],
        [t("Price to earnings"), number(m.trailingPE, 1), t("How many years of current profit the share price represents. Higher means investors expect more growth.")],
        [t("Expected price to earnings"), number(m.forwardPE, 1), t("The same, using next year's forecast profit.")],
        [t("Dividend yield"), percent(m.dividendYield, 2), t("Cash paid to shareholders each year, as a share of the price.")],
        [t("Profit margin"), percent(m.profitMargin, 1), t("How much of each sale the company keeps as profit.")],
        [t("Sales growth"), percent(m.revenueGrowth, 1, true), t("Change in sales compared with a year earlier.")],
        [t("Return on equity"), percent(m.returnOnEquity, 1), t("Profit earned on shareholders' money. Above 15% is strong.")],
        [t("Debt to equity"), m.debtToEquity === null ? "—" : `${number(m.debtToEquity / 100, 2)}x`, t("Borrowings compared with shareholders' money. Above 2x is heavy.")],
        [t("Price swings (1 year)"), percent(volatility, 0), t("How much the price typically moved over the last year. A global stock fund is around 15%.")],
        [t("52-week range"), t("{low} to {high}", { low: price(m.week52Low, detail.currency), high: price(m.week52High, detail.currency) }), t("The lowest and highest price in the last year.")],
      ];

  // With sample data there are no company figures; show only the rows that have a value.
  const shownFacts = sample ? facts.filter(([, value]) => !value.startsWith("\u2014")) : facts;
  const change = detail.changePercent;

  return (
    <>
      <Link href="/markets" className="text-[13.5px] text-ink-2 underline underline-offset-2 hover:text-ink">
        {t("Back to markets")}
      </Link>

      <header className="mb-6 mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge>{detail.symbol}</Badge>
            <Badge>{isFund ? t("Fund") : t("Share")}</Badge>
            {detail.exchange ? <span className="text-[13px] text-ink-3">{detail.exchange}</span> : null}
          </div>
          <h1 className="display text-[32px] text-ink sm:text-[42px]">{known?.name ?? detail.name}</h1>
          <p className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="figure text-[38px] leading-none text-ink sm:text-[44px]">{price(detail.price, detail.currency)}</span>
            <span className={cx("tnum text-[15px] font-medium", change === null ? "text-ink-3" : change >= 0 ? "text-pos" : "text-neg")}>
              {t("{change} today", { change: percent(change, 2, true) })}
            </span>
          </p>
        </div>
        <WatchButton symbol={symbol} watching={watchlist.includes(symbol)} />
      </header>

      {sample ? (
        <div className="mb-5">
          <Notice tone="accent" title={t("Sample prices.")}>
            {t("Live market data can't be reached right now. The price and chart below are generated for demonstration and are not real.")}
          </Notice>
        </div>
      ) : asOf ? (
        <div className="mb-5">
          <Notice title={t("This price may be out of date.")}>
            {t("Live prices can't be refreshed right now. This is the last one Arvo received, on {date}.", { date: day(todayIso(new Date(asOf))) })}
          </Notice>
        </div>
      ) : null}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Panel className="p-5 sm:p-6">
            <PriceChart symbol={symbol} currency={detail.currency} initial={history.data} initialRange="1y" />
          </Panel>

          <Panel>
            <PanelHeader title={isFund ? t("About this fund") : t("About the company")} />
            <div className="px-5 pb-5 pt-3 sm:px-6 sm:pb-6">
              {known ? <p className="text-[15px] font-medium text-ink">{t(known.blurb)}</p> : null}
              {detail.description && detail.description !== known?.blurb ? (
                <p className="mt-2 max-w-[72ch] text-[14px] leading-relaxed text-ink-2">
                  {detail.description.length > 900 ? `${detail.description.slice(0, 900).replace(/\s+\S*$/, "")}…` : detail.description}
                </p>
              ) : null}
              <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3 text-[13.5px]">
                {[
                  [t("Sector"), detail.sector ? t(detail.sector) : known?.sector ? t(known.sector) : null],
                  [t("Industry"), detail.industry],
                  [isFund ? t("Covers") : t("Based in"), detail.country ? t(detail.country) : known?.region ? t(known.region) : null],
                  [t("Employees"), detail.employees ? number(detail.employees, 0) : null],
                  [t("Fund manager"), detail.fundFamily],
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
                  {t("Company website")} <ExternalLink size={14} />
                </a>
              ) : null}
            </div>
          </Panel>

          {!isFund ? (
            <Suspense fallback={<Panel className="p-5 text-[14px] text-ink-3 sm:p-6">{t("Loading financial statements…")}</Panel>}>
              <StatementsPanel symbol={symbol} name={detail.name} />
            </Suspense>
          ) : null}

          <Panel>
            <PanelHeader title={t("News")} />
            <div className="px-5 pb-5 pt-2 sm:px-6 sm:pb-6">
              {news.data.length ? (
                <ul className="divide-y divide-line">
                  {news.data.map((item) => (
                    <li key={item.url} className="py-3">
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="group block">
                        <span className="text-[14.5px] font-medium text-ink underline-offset-2 group-hover:underline">{item.title}</span>
                        <span className="mt-1 block text-[12.5px] text-ink-3">
                          {item.publisher}, {ago(item.publishedAt, t, lang)}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="pt-1 text-[14px] text-ink-3">
                  {news.source === "sample" ? t("News appears here when live market data is connected.") : t("No recent news for this asset.")}
                </p>
              )}
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel className="p-5 sm:p-6">
            <h2 className="text-[17px] font-semibold text-ink">{t("Does it fit you?")}</h2>
            {fit && profile ? (
              <>
                <div className="mt-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="display text-[36px] text-ink">{t(fit.label)}</p>
                    <p className="mt-1 text-[13.5px] text-ink-2">
                      {t("for your {profile} profile", { profile: "\u0000" }).split("\u0000")[0]}
                      <span className="font-medium text-ink">{t(PROFILES[profile.level].name)}</span>
                      {t("for your {profile} profile", { profile: "\u0000" }).split("\u0000")[1]}
                    </p>
                  </div>
                  <p className="text-right">
                    <span className="figure block text-[34px] leading-none text-ink">{fit.score}</span>
                    <span className="text-[12px] text-ink-3">{t("out of 100")}</span>
                  </p>
                </div>

                <FitScale
                  risk={fit.risk}
                  level={profile.level}
                  labels={[t("Very low"), t("Low"), t("Moderate"), t("High"), t("Very high")]}
                  assetLabel={t("This asset: {level} risk", { level: fit.riskLabel.toLowerCase() })}
                  zoneLabel={t("Comfortable for a {profile} profile", { profile: t(PROFILES[profile.level].name) })}
                />

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
                    ? t("A fund like this can make up the core of a portfolio.")
                    : fit.maxWeight === 0
                      ? t("For your profile, a diversified fund covers this ground with far less risk.")
                      : (
                        <>
                          {t("If you hold it, a sensible ceiling for your profile is about")}{" "}
                          <span className="tnum font-semibold text-ink">{fit.maxWeight}%</span> {t("of your portfolio.")}
                        </>
                      )}
                </p>

                <Suspense fallback={null}>
                  <AiNote detail={detail} fit={fit} level={profile.level} />
                </Suspense>

                <p className="mt-4 text-[12px] leading-relaxed text-ink-3">
                  {t("Fit compares this asset's risk with your profile using fixed rules. It is education, not a recommendation, and says nothing about where the price will go.")}
                </p>
              </>
            ) : (
              <>
                <p className="mt-2 text-[14.5px] text-ink-2">
                  {t("Find your investor profile and Arvo will show how this asset's risk compares with what you can carry, and how much of a portfolio it could sensibly take up.")}
                </p>
                <div className="mt-5">
                  <ButtonLink href="/portfolio/profile">{t("Find your investor profile")}</ButtonLink>
                </div>
              </>
            )}
          </Panel>

          <Panel>
            <PanelHeader title={t("Key numbers")} />
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
            {sample ? <p className="px-5 pb-5 text-[12.5px] text-ink-3 sm:px-6">{t("Company figures appear when live market data is connected.")}</p> : null}
          </Panel>
        </div>
      </div>
    </>
  );
}
