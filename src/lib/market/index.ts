import "server-only";
import { cacheGet, cacheSet } from "../db";
import { sampleDetail, sampleHistory, sampleQuote, sampleSearch } from "./sample";
import type { Candle, Detail, News, Quote, Range, SearchHit, Sourced } from "./types";
import { UNIVERSE_BY_SYMBOL } from "./universe";
import type { Check, Earnings, Statements } from "./yahoo";

/**
 * The only door to market data. Every function:
 *  1. answers from the database cache when it can,
 *  2. otherwise asks the live provider (with a timeout),
 *  3. then the last good answer it has, however old (and says so),
 *  4. and only then falls back to labelled sample data.
 *
 * Set MARKET_DATA=sample to skip the live feed entirely.
 */

const LIVE = process.env.MARKET_DATA !== "sample";
const TIMEOUT_MS = 12_000;

/** How long an answer counts as fresh, in seconds. */
const TTL = { quote: 5 * 60, detail: 6 * 3600, history: 3600, news: 30 * 60, search: 24 * 3600, statements: 24 * 3600 };
/** How long the last good answer is kept to fall back on when the feed is down. */
const KEEP = 14 * 86_400;

type Kind = keyof typeof TTL;
type Stored<T> = { at: number; value: T };
type Answer<T> = { value: T; asOf: number; stale: boolean };

// After a failure, stop calling that part of the feed for a minute so one
// outage does not add seconds to every page.
const breaker = globalThis as unknown as { __arvoMarketDown?: Partial<Record<Kind, number>> };

function trip(kind: Kind, error: unknown) {
  (breaker.__arvoMarketDown ??= {})[kind] = Date.now() + 60_000;
  console.warn(`[market] live ${kind} unavailable:`, error instanceof Error ? error.message : error);
}

function withTimeout<T>(work: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out")), TIMEOUT_MS);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Fresh answer from the cache, else the live feed, else the last good answer
 * however old (marked stale). Null only when there has never been one.
 */
async function live<T>(kind: Kind, key: string, fetcher: () => Promise<T | null>): Promise<Answer<T> | null> {
  if (!LIVE) return null;
  let stored: Stored<T> | null = null;
  try {
    stored = await cacheGet<Stored<T>>(`m2:${key}`);
  } catch {
    // A cache miss must never break a page.
  }
  if (stored && Date.now() - stored.at < TTL[kind] * 1000) {
    return { value: stored.value, asOf: stored.at, stale: false };
  }
  if ((breaker.__arvoMarketDown?.[kind] ?? 0) < Date.now()) {
    try {
      const value = await withTimeout(fetcher());
      if (value !== null && value !== undefined) {
        const at = Date.now();
        cacheSet(`m2:${key}`, { at, value } satisfies Stored<T>, KEEP).catch(() => {});
        return { value, asOf: at, stale: false };
      }
    } catch (error) {
      trip(kind, error);
    }
  }
  return stored ? { value: stored.value, asOf: stored.at, stale: true } : null;
}

const sourced = <T, U>(answer: Answer<T>, data: U): Sourced<U> =>
  answer.stale ? { data, source: "live", asOf: answer.asOf } : { data, source: "live" };

export async function getQuotes(symbols: string[]): Promise<Sourced<Quote[]>> {
  const unique = [...new Set(symbols)];
  if (!unique.length) return { data: [], source: LIVE ? "live" : "sample" };
  const key = `quotes:${[...unique].sort().join(",")}`;
  const answer = await live("quote", key, async () => {
    const { yahooQuotes } = await import("./yahoo");
    const data = await yahooQuotes(unique);
    return data.length ? data : null;
  });
  if (answer) {
    const bySymbol = new Map(answer.value.map((row) => [row.symbol, row]));
    const rows = unique.map((s) => bySymbol.get(s)).filter((row): row is Quote => !!row);
    // Our own names read better in a list than the exchange's abbreviations.
    return sourced(answer, rows.map((row) => ({ ...row, name: UNIVERSE_BY_SYMBOL.get(row.symbol)?.name ?? row.name })));
  }
  return {
    data: unique.map((s) => sampleQuote(s)).filter((row): row is Quote => !!row),
    source: "sample",
  };
}

export async function getDetail(symbol: string): Promise<Sourced<Detail | null>> {
  const answer = await live("detail", `detail:${symbol}`, async () => {
    const { yahooDetail } = await import("./yahoo");
    return yahooDetail(symbol);
  });
  if (answer) {
    // Fill gaps in Yahoo's profile with what we know about the asset ourselves.
    const row = answer.value;
    const known = UNIVERSE_BY_SYMBOL.get(symbol);
    return sourced(answer, {
      ...row,
      description: row.description ?? known?.blurb ?? null,
      sector: row.sector ?? known?.sector ?? null,
      country: row.country ?? (known && row.type === "stock" ? known.region : null),
    });
  }
  return { data: sampleDetail(symbol), source: "sample" };
}

export async function getHistory(symbol: string, range: Range): Promise<Sourced<Candle[]>> {
  const answer = await live("history", `history:${symbol}:${range}`, async () => {
    const { yahooHistory } = await import("./yahoo");
    const data = await yahooHistory(symbol, range);
    return data.length ? data : null;
  });
  if (answer) return sourced(answer, answer.value);
  return { data: sampleHistory(symbol, range), source: "sample" };
}

export async function getNews(symbol: string): Promise<Sourced<News[]>> {
  const answer = await live("news", `news:${symbol}`, async () => {
    const { yahooNews } = await import("./yahoo");
    return yahooNews(symbol);
  });
  if (answer) return sourced(answer, answer.value);
  return { data: [], source: "sample" };
}

export async function searchAssets(query: string): Promise<Sourced<SearchHit[]>> {
  const q = query.trim().slice(0, 40);
  if (q.length < 1) return { data: [], source: "live" };
  const answer = await live("search", `search:${q.toLowerCase()}`, async () => {
    const { yahooSearch } = await import("./yahoo");
    return yahooSearch(q);
  });
  if (answer) return sourced(answer, answer.value);
  return { data: sampleSearch(q), source: "sample" };
}

export type MarketStatus = { mode: "live" | "sample"; checkedAt: number; checks: Check[] };

const statusCache = globalThis as unknown as { __arvoMarketStatus?: MarketStatus };

/** Tests each part of the live feed directly, at most once every two minutes. */
export async function marketStatus(): Promise<MarketStatus> {
  if (!LIVE) return { mode: "sample", checkedAt: Date.now(), checks: [] };
  const last = statusCache.__arvoMarketStatus;
  if (last && Date.now() - last.checkedAt < 120_000) return last;
  const { yahooChecks } = await import("./yahoo");
  const status: MarketStatus = { mode: "live", checkedAt: Date.now(), checks: await yahooChecks() };
  statusCache.__arvoMarketStatus = status;
  return status;
}

/** Annual financial statements and the next results date, for shares only. Null when the feed has none. */
export async function getStatements(symbol: string): Promise<{ statements: Statements; earnings: Earnings; asOf?: number } | null> {
  const answer = await live("statements", `statements:${symbol}`, async () => {
    const { yahooStatements, nextEarnings } = await import("./yahoo");
    const statements = await yahooStatements(symbol);
    if (!statements) return null;
    return { statements, earnings: await nextEarnings(symbol, statements.lastQuarter) };
  });
  return answer ? { ...answer.value, ...(answer.stale ? { asOf: answer.asOf } : {}) } : null;
}
