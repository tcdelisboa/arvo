import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getProfile, listWatchlist } from "@/lib/data";
import { getQuotes } from "@/lib/market";
import { assessFit } from "@/lib/market/suitability";
import { EMPTY_METRICS, type Quote } from "@/lib/market/types";
import { GROUPS, UNIVERSE, UNIVERSE_BY_SYMBOL } from "@/lib/market/universe";
import { day, percent, price, todayIso } from "@/lib/format";
import { PROFILES, type Level } from "@/lib/risk";
import { ButtonLink, cx, Notice, PageHeader, Panel, PanelHeader } from "@/components/ui";
import { MarketSearch } from "@/components/market-search";
import { FitBadge } from "@/components/fit-badge";

export const metadata: Metadata = { title: "Markets" };

function Row({ quote, level, sector }: { quote: Quote; level: Level | null; sector?: string }) {
  const known = UNIVERSE_BY_SYMBOL.get(quote.symbol);
  const fit = level ? assessFit({ type: quote.type, name: quote.name, metrics: EMPTY_METRICS, volatility: null, known }, level) : null;
  const change = quote.changePercent;
  return (
    <li>
      <Link
        href={`/markets/${encodeURIComponent(quote.symbol)}`}
        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 px-5 py-3 transition-colors hover:bg-raised sm:grid-cols-[minmax(0,1fr)_150px_96px_84px] sm:px-6"
      >
        <span className="min-w-0">
          <span className="block truncate text-[14.5px] font-medium text-ink">{known?.name ?? quote.name}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-ink-3">
            <span className="tnum">{quote.symbol}</span>
            {sector ? <span className="hidden sm:inline">{sector}</span> : null}
            {fit ? <span className="sm:hidden"><FitBadge label={fit.label} /></span> : null}
          </span>
        </span>
        <span className="hidden sm:block">{fit ? <FitBadge label={fit.label} /> : null}</span>
        <span className="text-right">
          <span className="tnum block text-[14.5px] text-ink">{price(quote.price, quote.currency)}</span>
          <span className={cx("tnum block text-[12.5px] sm:hidden", change === null ? "text-ink-3" : change >= 0 ? "text-pos" : "text-neg")}>
            {percent(change, 2, true)}
          </span>
        </span>
        <span className={cx("tnum hidden text-right text-[13.5px] font-medium sm:block", change === null ? "text-ink-3" : change >= 0 ? "text-pos" : "text-neg")}>
          {percent(change, 2, true)}
        </span>
      </Link>
    </li>
  );
}

export default async function MarketsPage() {
  const user = await requireUser();
  const [profile, watchlist] = await Promise.all([getProfile(user.id), listWatchlist(user.id)]);
  const symbols = [...new Set([...UNIVERSE.map((u) => u.symbol), ...watchlist])];
  const { data: quotes, source, asOf } = await getQuotes(symbols);
  const bySymbol = new Map(quotes.map((quote) => [quote.symbol, quote]));
  const level = profile?.level ?? null;
  const watched = watchlist.map((symbol) => bySymbol.get(symbol)).filter((quote): quote is Quote => !!quote);

  return (
    <>
      <PageHeader title="Markets" lead="Look up any share or fund, understand what it is, and see how it fits your profile." />

      {source === "sample" ? (
        <div className="mb-5">
          <Notice tone="accent" title="Sample prices.">
            Live market data can&apos;t be reached right now, so the prices on this page are generated for demonstration and are not real.
          </Notice>
        </div>
      ) : asOf ? (
        <div className="mb-5">
          <Notice title="Prices may be out of date.">
            Live prices can&apos;t be refreshed right now. These are the last ones Arvo received, on {day(todayIso(new Date(asOf)))}.
          </Notice>
        </div>
      ) : null}

      <MarketSearch />

      {!profile ? (
        <div className="mt-5">
          <Notice action={<ButtonLink href="/portfolio/profile" size="sm">Find your profile</ButtonLink>}>
            Answer ten questions and every asset here shows how well it fits you.
          </Notice>
        </div>
      ) : (
        <p className="mt-4 text-[13.5px] text-ink-2">
          Fit is shown for your <span className="font-medium text-ink">{PROFILES[profile.level].name}</span> profile. It measures
          how an asset&apos;s risk matches yours. It is not a prediction of how the price will move.
        </p>
      )}

      {watched.length ? (
        <Panel className="mt-5">
          <PanelHeader title="Watching" />
          <ul className="mt-3 divide-y divide-line border-t border-line pb-1">
            {watched.map((quote) => (
              <Row key={quote.symbol} quote={quote} level={level} sector={UNIVERSE_BY_SYMBOL.get(quote.symbol)?.sector} />
            ))}
          </ul>
        </Panel>
      ) : null}

      {GROUPS.map((group) => {
        const entries = UNIVERSE.filter((entry) => entry.group === group);
        return (
          <Panel key={group} className="mt-5">
            <PanelHeader
              title={group === "Funds (ETFs)" ? "Funds" : `Companies: ${group}`}
              note={group === "Funds (ETFs)" ? "One purchase, many holdings. The usual starting point." : undefined}
            />
            <ul className="mt-3 divide-y divide-line border-t border-line pb-1">
              {entries.map((entry) => {
                const quote = bySymbol.get(entry.symbol);
                return quote ? <Row key={entry.symbol} quote={quote} level={level} sector={entry.sector} /> : null;
              })}
            </ul>
          </Panel>
        );
      })}

      <p className="mt-6 max-w-[80ch] text-[12.5px] leading-relaxed text-ink-3">
        Prices may be delayed. Nothing on this page is a recommendation to buy or sell.
      </p>
    </>
  );
}
