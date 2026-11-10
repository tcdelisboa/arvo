import "server-only";
import { cacheGet, cacheSet } from "../db";
import { sampleDetail, sampleHistory, sampleQuote, sampleSearch } from "./sample";
import type { Candle, Detail, News, Quote, Range, SearchHit, Sourced } from "./types";
import { UNIVERSE_BY_SYMBOL } from "./universe";

/**
 * The only door to market data. Every function:
 *  1. answers from the database cache when it can,
 *  2. otherwise asks the live provider (with a timeout),
 *  3. and falls back to labelled sample data if the live feed is down.
 *
 * Set MARKET_DATA=sample to skip the live feed entirely.
 */

const LIVE = process.env.MARKET_DATA !== "sample";
const TIMEOUT_MS = 7000;
const TTL = { quote: 5 * 60, detail: 6 * 3600, history: 3600, news: 30 * 60, search: 24 * 3600 };

// After a failure, stop calling the live feed for a few minutes so one outage
// does not add seconds to every page.
const breaker = globalThis as unknown as { __arvoMarketDownUntil?: number };

function liveAvailable(): boolean {
  return LIVE && (breaker.__arvoMarketDownUntil ?? 0) < Date.now();
}

function trip(error: unknown) {
  breaker.__arvoMarketDownUntil = Date.now() + 5 * 60_000;
  console.warn("[market] live feed unavailable, using sample data:", error instanceof Error ? error.message : error);
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

async function live<T>(key: string, ttl: number, fetcher: () => Promise<T>): Promise<T | null> {
  try {
    const cached = await cacheGet<T>(key);
    if (cached !== null) return cached;
  } catch {
    // A cache miss must never break a page.
  }
  if (!liveAvailable()) return null;
  try {
    const value = await withTimeout(fetcher());
    if (value !== null && value !== undefined) {
      cacheSet(key, value, ttl).catch(() => {});
    }
    return value;
  } catch (error) {
    trip(error);
    return null;
  }
}

export async function getQuotes(symbols: string[]): Promise<Sourced<Quote[]>> {
  const unique = [...new Set(symbols)];
  if (!unique.length) return { data: [], source: LIVE ? "live" : "sample" };
  const key = `quotes:${[...unique].sort().join(",")}`;
  const rows = await live(key, TTL.quote, async () => {
    const { yahooQuotes } = await import("./yahoo");
    const data = await yahooQuotes(unique);
    return data.length ? data : null;
  });
  if (rows) {
    const bySymbol = new Map(rows.map((row) => [row.symbol, row]));
    return { data: unique.map((s) => bySymbol.get(s)).filter((row): row is Quote => !!row), source: "live" };
  }
  return {
    data: unique.map((s) => sampleQuote(s)).filter((row): row is Quote => !!row),
    source: "sample",
  };
}

export async function getDetail(symbol: string): Promise<Sourced<Detail | null>> {
  const row = await live(`detail:${symbol}`, TTL.detail, async () => {
    const { yahooDetail } = await import("./yahoo");
    return yahooDetail(symbol);
  });
  if (row) {
    // Fill gaps in Yahoo's profile with our own one-line description.
    const known = UNIVERSE_BY_SYMBOL.get(symbol);
    return { data: { ...row, description: row.description ?? known?.blurb ?? null }, source: "live" };
  }
  return { data: sampleDetail(symbol), source: "sample" };
}

export async function getHistory(symbol: string, range: Range): Promise<Sourced<Candle[]>> {
  const rows = await live(`history:${symbol}:${range}`, TTL.history, async () => {
    const { yahooHistory } = await import("./yahoo");
    const data = await yahooHistory(symbol, range);
    return data.length ? data : null;
  });
  if (rows) return { data: rows, source: "live" };
  return { data: sampleHistory(symbol, range), source: "sample" };
}

export async function getNews(symbol: string): Promise<Sourced<News[]>> {
  const rows = await live(`news:${symbol}`, TTL.news, async () => {
    const { yahooNews } = await import("./yahoo");
    return yahooNews(symbol);
  });
  if (rows) return { data: rows, source: "live" };
  return { data: [], source: "sample" };
}

export async function searchAssets(query: string): Promise<Sourced<SearchHit[]>> {
  const q = query.trim().slice(0, 40);
  if (q.length < 1) return { data: [], source: "live" };
  const rows = await live(`search:${q.toLowerCase()}`, TTL.search, async () => {
    const { yahooSearch } = await import("./yahoo");
    return yahooSearch(q);
  });
  if (rows) return { data: rows, source: "live" };
  return { data: sampleSearch(q), source: "sample" };
}
