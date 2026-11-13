import { seedFrom } from "../demo";
import { EMPTY_METRICS, type Candle, type Detail, type Quote, type Range, type SearchHit } from "./types";
import { UNIVERSE, UNIVERSE_BY_SYMBOL, type UniverseEntry } from "./universe";

/**
 * Sample market data, used only when the live feed cannot be reached.
 *
 * Prices are generated, not real: a seeded random walk whose roughness matches
 * the asset's `swing` rating. The UI labels every screen that shows them.
 * Fundamentals are left empty rather than invented.
 */

const DAY = 86_400_000;
const VOL_BY_SWING = { 1: 0.004, 2: 0.14, 3: 0.19, 4: 0.3, 5: 0.5 } as const;
const DRIFT_BY_SWING = { 1: 0.025, 2: 0.04, 3: 0.07, 4: 0.09, 5: 0.11 } as const;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One normal draw per symbol and calendar day, so history never reshuffles. */
function gaussForDay(symbol: string, day: number): number {
  const rand = rng(seedFrom(`${symbol}:${day}`));
  const u = Math.max(rand(), 1e-9);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// The walk always starts on the same calendar day (1 Jan 2021).
const EPOCH_DAY = Math.floor(Date.UTC(2021, 0, 1) / DAY);
const memo = new Map<string, Candle[]>();

/** Daily closes from the fixed start day to today. */
function series(entry: UniverseEntry, now: number): Candle[] {
  const end = Math.floor(now / DAY);
  const key = `${entry.symbol}:${end}`;
  const cached = memo.get(key);
  if (cached) return cached;

  const vol = VOL_BY_SWING[entry.swing] / Math.sqrt(252);
  const drift = DRIFT_BY_SWING[entry.swing] / 252;
  let value = 20 + (seedFrom(entry.symbol + "p") % 180);
  const out: Candle[] = [];
  for (let d = EPOCH_DAY; d <= end; d++) {
    const weekday = new Date(d * DAY).getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    value *= Math.exp(drift - (vol * vol) / 2 + vol * gaussForDay(entry.symbol, d));
    out.push({ t: d * DAY, c: Math.round(value * 100) / 100 });
  }
  if (memo.size > 400) memo.clear();
  memo.set(key, out);
  return out;
}

const CURRENCY_BY_SUFFIX: Record<string, string> = {
  DE: "EUR", AS: "EUR", PA: "EUR", MC: "EUR", MI: "EUR", LS: "EUR", SW: "CHF", CO: "DKK", SA: "BRL",
};

function currencyOf(symbol: string): string {
  const suffix = symbol.includes(".") ? symbol.split(".").pop()! : "";
  return CURRENCY_BY_SUFFIX[suffix] ?? "USD";
}

const RANGE_DAYS: Record<Range, number> = { "1m": 31, "6m": 183, "1y": 365, "5y": 5 * 365 };

export function sampleHistory(symbol: string, range: Range, now = Date.now()): Candle[] {
  const entry = UNIVERSE_BY_SYMBOL.get(symbol);
  if (!entry) return [];
  const all = series(entry, now);
  const from = now - RANGE_DAYS[range] * DAY;
  const slice = all.filter((c) => c.t >= from);
  // Thin long ranges to weekly points; nobody needs 1,300 points on a phone.
  return range === "5y" ? slice.filter((_, i) => i % 5 === 0 || i === slice.length - 1) : slice;
}

export function sampleQuote(symbol: string, now = Date.now()): Quote | null {
  const entry = UNIVERSE_BY_SYMBOL.get(symbol);
  if (!entry) return null;
  const all = series(entry, now);
  const last = all[all.length - 1];
  const prev = all[all.length - 2] ?? last;
  return {
    symbol,
    name: entry.name,
    type: entry.type,
    currency: currencyOf(symbol),
    price: last.c,
    change: Math.round((last.c - prev.c) * 100) / 100,
    changePercent: prev.c ? ((last.c - prev.c) / prev.c) * 100 : 0,
    exchange: null,
    marketCap: null,
  };
}

export function sampleDetail(symbol: string, now = Date.now()): Detail | null {
  const entry = UNIVERSE_BY_SYMBOL.get(symbol);
  const quote = sampleQuote(symbol, now);
  if (!entry || !quote) return null;
  const year = sampleHistory(symbol, "1y", now).map((c) => c.c);
  return {
    ...quote,
    description: entry.blurb,
    sector: entry.sector,
    industry: null,
    country: entry.region,
    website: null,
    employees: null,
    fundFamily: null,
    fundCategory: entry.type === "etf" ? entry.sector : null,
    metrics: {
      ...EMPTY_METRICS,
      week52Low: year.length ? Math.min(...year) : null,
      week52High: year.length ? Math.max(...year) : null,
    },
  };
}

export function sampleSearch(query: string): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return UNIVERSE.filter(
    (entry) => entry.symbol.toLowerCase().includes(q) || entry.name.toLowerCase().includes(q) || entry.sector.toLowerCase().includes(q),
  )
    .slice(0, 8)
    .map((entry) => ({ symbol: entry.symbol, name: entry.name, type: entry.type, exchange: null }));
}
