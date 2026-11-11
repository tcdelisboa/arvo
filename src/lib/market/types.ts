export type AssetType = "stock" | "etf" | "other";

export type Quote = {
  symbol: string;
  name: string;
  type: AssetType;
  currency: string | null;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  exchange: string | null;
  marketCap: number | null;
};

export type Metrics = {
  marketCap: number | null;
  trailingPE: number | null;
  forwardPE: number | null;
  /** Percent, e.g. 2.4 */
  dividendYield: number | null;
  beta: number | null;
  /** Percent */
  profitMargin: number | null;
  /** Percent, year on year */
  revenueGrowth: number | null;
  /** Percent, as Yahoo reports it (150 = 1.5x equity) */
  debtToEquity: number | null;
  /** Percent */
  returnOnEquity: number | null;
  week52Low: number | null;
  week52High: number | null;
  /** Funds only: ongoing charge in percent */
  expenseRatio: number | null;
  /** Funds only */
  totalAssets: number | null;
};

export type Detail = Quote & {
  description: string | null;
  sector: string | null;
  industry: string | null;
  country: string | null;
  website: string | null;
  employees: number | null;
  fundFamily: string | null;
  fundCategory: string | null;
  metrics: Metrics;
};

export type Candle = { t: number; c: number };

export type News = { title: string; publisher: string; url: string; publishedAt: number };

export type SearchHit = { symbol: string; name: string; type: AssetType; exchange: string | null };

export const RANGES = ["1m", "6m", "1y", "5y"] as const;
export type Range = (typeof RANGES)[number];

export function isRange(value: unknown): value is Range {
  return typeof value === "string" && (RANGES as readonly string[]).includes(value);
}

/** Where a piece of market data came from. Shown in the UI, never hidden. */
export type Source = "live" | "sample";

/** `asOf` is set only when live data could not be refreshed and an older answer is shown. */
export type Sourced<T> = { data: T; source: Source; asOf?: number };

export const EMPTY_METRICS: Metrics = {
  marketCap: null,
  trailingPE: null,
  forwardPE: null,
  dividendYield: null,
  beta: null,
  profitMargin: null,
  revenueGrowth: null,
  debtToEquity: null,
  returnOnEquity: null,
  week52Low: null,
  week52High: null,
  expenseRatio: null,
  totalAssets: null,
};

/** Symbols are user input: letters, digits, dot, dash, caret, equals. */
export function normaliseSymbol(raw: string): string | null {
  const symbol = decodeURIComponent(raw).trim().toUpperCase();
  return /^[A-Z0-9.\-^=]{1,15}$/.test(symbol) ? symbol : null;
}
