import "server-only";
import {
  EMPTY_METRICS,
  type AssetType,
  type Candle,
  type Detail,
  type Metrics,
  type News,
  type Quote,
  type Range,
  type SearchHit,
} from "./types";

/**
 * Live market data from Yahoo Finance's public web endpoints.
 *
 * Prices, charts, search, news and company accounts come from endpoints that
 * need no session. Only the company profile (description, sector, staff)
 * needs Yahoo's session token, which servers in some regions are refused, so
 * it is fetched on a best-effort basis and everything else works without it.
 *
 * Yahoo has no official public API: this is an unofficial feed, fine for a
 * prototype and personal use, but not licensed for a commercial product. For
 * launch, swap this file for a licensed provider (the rest of the app only
 * sees the functions exported from ./index).
 */

const HOSTS = ["https://query1.finance.yahoo.com", "https://query2.finance.yahoo.com"];
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const ATTEMPT_MS = 5000;

class HttpError extends Error {
  constructor(public status: number, url: string) {
    super(`Yahoo answered ${status} for ${new URL(url).pathname}`);
  }
}

async function request(url: string, cookie?: string): Promise<Response> {
  const response = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json,text/plain,*/*", ...(cookie ? { Cookie: cookie } : {}) },
    signal: AbortSignal.timeout(ATTEMPT_MS),
    cache: "no-store",
  });
  if (!response.ok) throw new HttpError(response.status, url);
  return response;
}

/** GET a path, trying the second Yahoo host when the first fails. */
async function getJson<T>(path: string, cookie?: string): Promise<T> {
  let last: unknown;
  for (const host of HOSTS) {
    try {
      return (await (await request(host + path, cookie)).json()) as T;
    } catch (error) {
      last = error;
      // A refused session or an unknown symbol will not improve on the other host.
      if (error instanceof HttpError && [400, 401, 404].includes(error.status)) break;
    }
  }
  throw last;
}

const num = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const raw = (value: unknown): number | null =>
  value && typeof value === "object" && "raw" in value ? num((value as { raw: unknown }).raw) : num(value);

const text = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value.trim() : null);

function assetType(kind: unknown): AssetType {
  if (kind === "EQUITY") return "stock";
  if (kind === "ETF" || kind === "MUTUALFUND") return "etf";
  return "other";
}

type Meta = {
  symbol?: string;
  currency?: string;
  instrumentType?: string;
  fullExchangeName?: string;
  exchangeName?: string;
  longName?: string;
  shortName?: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  chartPreviousClose?: number;
  previousClose?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
};

function quoteFromMeta(meta: Meta, fallbackSymbol: string): Quote {
  const price = num(meta.regularMarketPrice);
  let changePercent = num(meta.regularMarketChangePercent);
  let change: number | null = null;
  if (price !== null && changePercent !== null) {
    change = price - price / (1 + changePercent / 100);
  } else if (price !== null) {
    const previous = num(meta.previousClose) ?? num(meta.chartPreviousClose);
    if (previous) {
      change = price - previous;
      changePercent = (change / previous) * 100;
    }
  }
  return {
    symbol: meta.symbol ?? fallbackSymbol,
    name: text(meta.longName) ?? text(meta.shortName) ?? meta.symbol ?? fallbackSymbol,
    type: assetType(meta.instrumentType),
    currency: text(meta.currency),
    price,
    change,
    changePercent,
    exchange: text(meta.fullExchangeName) ?? text(meta.exchangeName),
    marketCap: null,
  };
}

/* ------------------------------- quotes -------------------------------- */

type Spark = { spark?: { result?: { symbol: string; response?: { meta?: Meta }[] }[] | null } };

export async function yahooQuotes(symbols: string[]): Promise<Quote[]> {
  const chunks: string[][] = [];
  for (let i = 0; i < symbols.length; i += 20) chunks.push(symbols.slice(i, i + 20));
  const settled = await Promise.allSettled(
    chunks.map((chunk) =>
      getJson<Spark>(`/v7/finance/spark?symbols=${chunk.map(encodeURIComponent).join(",")}&range=1d&interval=1d`),
    ),
  );
  const quotes: Quote[] = [];
  for (const result of settled) {
    if (result.status !== "fulfilled") continue;
    for (const row of result.value.spark?.result ?? []) {
      const meta = row.response?.[0]?.meta;
      if (meta && num(meta.regularMarketPrice) !== null) quotes.push(quoteFromMeta(meta, row.symbol));
    }
  }
  // Nothing at all means the feed is down, not that the symbols are unknown.
  if (!quotes.length) {
    const failed = settled.find((result) => result.status === "rejected");
    if (failed && failed.status === "rejected") throw failed.reason;
  }
  return quotes;
}

/* ------------------------------- charts -------------------------------- */

type Chart = {
  chart?: {
    result?:
      | {
          meta?: Meta;
          timestamp?: number[];
          events?: { dividends?: Record<string, { amount?: number; date?: number }> };
          indicators?: { quote?: { close?: (number | null)[] }[]; adjclose?: { adjclose?: (number | null)[] }[] };
        }[]
      | null;
  };
};

const RANGE_QUERY: Record<Range, string> = {
  "1m": "range=1mo&interval=1d",
  "6m": "range=6mo&interval=1d",
  "1y": "range=1y&interval=1d",
  "5y": "range=5y&interval=1wk",
};

async function chart(symbol: string, query: string) {
  const data = await getJson<Chart>(`/v8/finance/chart/${encodeURIComponent(symbol)}?${query}`);
  return data.chart?.result?.[0] ?? null;
}

export async function yahooHistory(symbol: string, range: Range): Promise<Candle[]> {
  const result = await chart(symbol, RANGE_QUERY[range]);
  if (!result?.timestamp) return [];
  const adjusted = result.indicators?.adjclose?.[0]?.adjclose;
  const closes = result.indicators?.quote?.[0]?.close;
  const candles: Candle[] = [];
  result.timestamp.forEach((seconds, index) => {
    const close = num(adjusted?.[index]) ?? num(closes?.[index]);
    if (close !== null) candles.push({ t: seconds * 1000, c: close });
  });
  return candles;
}

/* ----------------------- company accounts (no session) ----------------------- */

const SERIES = [
  "trailingPeRatio",
  "trailingForwardPeRatio",
  "trailingMarketCap",
  "trailingTotalRevenue",
  "trailingNetIncome",
  "annualTotalRevenue",
  "annualNetIncome",
  "annualStockholdersEquity",
  "annualTotalDebt",
  "quarterlyStockholdersEquity",
  "quarterlyTotalDebt",
] as const;

type Timeseries = { timeseries?: { result?: (Record<string, unknown> & { meta?: { type?: string[] } })[] | null } };

/** Yearly and trailing figures from the published accounts, oldest first. */
async function accounts(symbol: string): Promise<Record<string, number[]>> {
  const now = Math.floor(Date.now() / 1000);
  const data = await getJson<Timeseries>(
    `/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(symbol)}` +
      `?type=${SERIES.join(",")}&period1=${now - 4 * 365 * 86400}&period2=${now}`,
  );
  const series: Record<string, number[]> = {};
  for (const row of data.timeseries?.result ?? []) {
    const name = row.meta?.type?.[0];
    const points = name ? row[name] : null;
    if (!name || !Array.isArray(points)) continue;
    series[name] = points
      .map((point) => raw((point as { reportedValue?: unknown } | null)?.reportedValue))
      .filter((value): value is number => value !== null);
  }
  return series;
}

function metricsFromAccounts(series: Record<string, number[]>): Partial<Metrics> {
  const last = (name: string) => series[name]?.at(-1) ?? null;
  const revenue = last("trailingTotalRevenue") ?? last("annualTotalRevenue");
  const income = last("trailingNetIncome") ?? last("annualNetIncome");
  const equity = last("quarterlyStockholdersEquity") ?? last("annualStockholdersEquity");
  const debt = last("quarterlyTotalDebt") ?? last("annualTotalDebt");
  const yearly = series.annualTotalRevenue ?? [];
  const before = yearly.at(-2);
  const latest = yearly.at(-1);
  return {
    marketCap: last("trailingMarketCap"),
    trailingPE: last("trailingPeRatio"),
    forwardPE: last("trailingForwardPeRatio"),
    profitMargin: revenue && income !== null ? (income / revenue) * 100 : null,
    revenueGrowth: before && latest !== undefined && before > 0 ? (latest / before - 1) * 100 : null,
    debtToEquity: equity && equity > 0 && debt !== null ? (debt / equity) * 100 : null,
    returnOnEquity: equity && equity > 0 && income !== null ? (income / equity) * 100 : null,
  };
}

/* ----------------------- company profile (needs a session) ----------------------- */

type Session = { cookie: string; crumb: string; at: number };
const state = globalThis as unknown as { __arvoYahooSession?: Session | null; __arvoYahooSessionRetryAt?: number };

async function session(force = false): Promise<Session | null> {
  const current = state.__arvoYahooSession;
  if (!force && current && Date.now() - current.at < 30 * 60_000) return current;
  if (!force && (state.__arvoYahooSessionRetryAt ?? 0) > Date.now()) return null;
  try {
    // This address answers 404 on purpose; what matters is the cookie it sets.
    const hello = await fetch("https://fc.yahoo.com", {
      headers: { "User-Agent": UA },
      redirect: "manual",
      signal: AbortSignal.timeout(ATTEMPT_MS),
      cache: "no-store",
    });
    const cookie = hello.headers
      .getSetCookie()
      .map((line) => line.split(";")[0])
      .filter(Boolean)
      .join("; ");
    if (!cookie) throw new Error("Yahoo set no session cookie");
    const crumb = (await (await request(`${HOSTS[1]}/v1/test/getcrumb`, cookie)).text()).trim();
    if (!crumb || crumb.length > 40 || /[<{\s]/.test(crumb)) throw new Error("Yahoo gave no session token");
    state.__arvoYahooSession = { cookie, crumb, at: Date.now() };
    return state.__arvoYahooSession;
  } catch {
    state.__arvoYahooSession = null;
    // Do not ask again on every page when this server is refused.
    state.__arvoYahooSessionRetryAt = Date.now() + 15 * 60_000;
    return null;
  }
}

type Summary = { quoteSummary?: { result?: Record<string, Record<string, unknown> | undefined>[] | null } };

type Profile = Pick<Detail, "description" | "sector" | "industry" | "country" | "website" | "employees" | "fundFamily" | "fundCategory"> & {
  metrics: Partial<Metrics>;
};

async function profile(symbol: string): Promise<Profile | null> {
  const modules = "assetProfile,fundProfile,summaryDetail,defaultKeyStatistics";
  for (const force of [false, true]) {
    const active = await session(force);
    if (!active) return null;
    try {
      const data = await getJson<Summary>(
        `/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}&crumb=${encodeURIComponent(active.crumb)}`,
        active.cookie,
      );
      const result = data.quoteSummary?.result?.[0];
      if (!result) return null;
      const company = result.assetProfile ?? {};
      const fund = result.fundProfile ?? {};
      const summary = result.summaryDetail ?? {};
      const stats = result.defaultKeyStatistics ?? {};
      const fees = (fund.feesExpensesInvestment ?? {}) as Record<string, unknown>;
      const share = (value: unknown) => {
        const n = raw(value);
        return n === null ? null : n * 100;
      };
      return {
        description: text(company.longBusinessSummary),
        sector: text(company.sector),
        industry: text(company.industry),
        country: text(company.country),
        website: text(company.website),
        employees: raw(company.fullTimeEmployees),
        fundFamily: text(fund.family),
        fundCategory: text(fund.categoryName),
        metrics: {
          beta: raw(summary.beta) ?? raw(stats.beta) ?? raw(stats.beta3Year),
          dividendYield: share(summary.dividendYield) ?? share(summary.yield),
          expenseRatio: share(fees.annualReportExpenseRatio) ?? share(fees.netExpRatio),
          totalAssets: raw(summary.totalAssets) ?? raw(stats.totalAssets),
          marketCap: raw(summary.marketCap),
          trailingPE: raw(summary.trailingPE),
          forwardPE: raw(summary.forwardPE),
        },
      };
    } catch (error) {
      // An expired token is worth one fresh attempt; anything else is not.
      if (!(error instanceof HttpError && error.status === 401)) return null;
    }
  }
  return null;
}

/* ------------------------------- detail -------------------------------- */

const filled = <T extends object>(values: T): Partial<T> =>
  Object.fromEntries(Object.entries(values).filter(([, value]) => value !== null && value !== undefined)) as Partial<T>;

export async function yahooDetail(symbol: string): Promise<Detail | null> {
  const [priced, figures, about] = await Promise.allSettled([
    chart(symbol, "range=1y&interval=1d&events=div"),
    accounts(symbol),
    profile(symbol),
  ]);
  // The price is the one part a page cannot do without.
  if (priced.status === "rejected") throw priced.reason;
  const meta = priced.value?.meta;
  if (!meta || num(meta.regularMarketPrice) === null) return null;

  const quote = quoteFromMeta(meta, symbol);
  const fromAccounts = figures.status === "fulfilled" ? metricsFromAccounts(figures.value) : {};
  const extra = about.status === "fulfilled" ? about.value : null;

  // Dividends paid over the last twelve months, as a share of today's price.
  const yearAgo = Date.now() / 1000 - 365 * 86400;
  const paid = Object.values(priced.value?.events?.dividends ?? {})
    .filter((dividend) => (dividend.date ?? 0) >= yearAgo)
    .reduce((sum, dividend) => sum + (num(dividend.amount) ?? 0), 0);
  const dividendYield = paid > 0 && quote.price ? (paid / quote.price) * 100 : null;

  const metrics: Metrics = {
    ...EMPTY_METRICS,
    week52Low: num(meta.fiftyTwoWeekLow),
    week52High: num(meta.fiftyTwoWeekHigh),
    dividendYield,
    ...filled(extra?.metrics ?? {}),
    ...filled(fromAccounts),
  };

  return {
    ...quote,
    marketCap: metrics.marketCap,
    description: extra?.description ?? null,
    sector: extra?.sector ?? null,
    industry: extra?.industry ?? null,
    country: extra?.country ?? null,
    website: extra?.website ?? null,
    employees: extra?.employees ?? null,
    fundFamily: extra?.fundFamily ?? null,
    fundCategory: extra?.fundCategory ?? null,
    metrics,
  };
}

/* --------------------------- search and news --------------------------- */

type Search = {
  quotes?: { symbol?: string; quoteType?: string; longname?: string; shortname?: string; exchDisp?: string }[];
  news?: { title?: string; publisher?: string; link?: string; providerPublishTime?: number }[];
};

export async function yahooSearch(query: string): Promise<SearchHit[]> {
  const data = await getJson<Search>(`/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`);
  const hits: SearchHit[] = [];
  for (const row of data.quotes ?? []) {
    const type = assetType(row.quoteType);
    if (!row.symbol || type === "other") continue;
    hits.push({
      symbol: row.symbol,
      name: text(row.longname) ?? text(row.shortname) ?? row.symbol,
      type,
      exchange: text(row.exchDisp),
    });
  }
  return hits.slice(0, 8);
}

const decode = (value: string) =>
  value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .trim();

/** Yahoo's headline feed, used when the search endpoint has no news. */
async function headlines(symbol: string): Promise<News[]> {
  const response = await request(
    `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}&region=US&lang=en-US`,
  );
  const xml = await response.text();
  const items: News[] = [];
  for (const [, item] of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const pick = (tag: string) => decode(item.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1] ?? "");
    const url = pick("link");
    const title = pick("title");
    const publishedAt = Date.parse(pick("pubDate"));
    if (!title || !/^https?:\/\//.test(url)) continue;
    items.push({ title, publisher: "Yahoo Finance", url, publishedAt: Number.isFinite(publishedAt) ? publishedAt : Date.now() });
  }
  return items;
}

export async function yahooNews(symbol: string): Promise<News[]> {
  let items: News[] = [];
  try {
    const data = await getJson<Search>(`/v1/finance/search?q=${encodeURIComponent(symbol)}&quotesCount=0&newsCount=8`);
    items = (data.news ?? [])
      .filter((item) => item.title && /^https?:\/\//.test(item.link ?? ""))
      .map((item) => ({
        title: item.title!,
        publisher: text(item.publisher) ?? "Yahoo Finance",
        url: item.link!,
        publishedAt: (num(item.providerPublishTime) ?? Date.now() / 1000) * 1000,
      }));
  } catch {
    // Fall through to the headline feed.
  }
  if (!items.length) items = await headlines(symbol);
  return items.slice(0, 8);
}

/* ------------------------------- health -------------------------------- */

export type Check = { name: string; ok: boolean; ms: number; note: string };

/** Asks each part of the feed for one well-known asset. Used by the status page. */
export async function yahooChecks(): Promise<Check[]> {
  const run = async (name: string, work: () => Promise<string>): Promise<Check> => {
    const started = Date.now();
    try {
      const note = await work();
      return { name, ok: true, ms: Date.now() - started, note };
    } catch (error) {
      return { name, ok: false, ms: Date.now() - started, note: error instanceof Error ? error.message : "Failed" };
    }
  };
  const need = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
  };
  return Promise.all([
    run("Prices", async () => {
      const rows = await yahooQuotes(["AAPL", "VWCE.DE"]);
      need(rows.length === 2, `Got ${rows.length} of 2 prices`);
      return rows.map((row) => `${row.symbol} ${row.price}`).join(", ");
    }),
    run("Price history", async () => {
      const rows = await yahooHistory("AAPL", "1y");
      need(rows.length > 100, `Only ${rows.length} days`);
      return `${rows.length} days`;
    }),
    run("Company figures", async () => {
      const figures = metricsFromAccounts(await accounts("AAPL"));
      need(figures.trailingPE, "No figures returned");
      return `P/E ${figures.trailingPE?.toFixed(1)}`;
    }),
    run("Company profile", async () => {
      const about = await profile("AAPL");
      need(about?.sector, "Yahoo refused a session for this server; pages use Arvo's own descriptions instead");
      return about!.sector!;
    }),
    run("News", async () => {
      const rows = await yahooNews("AAPL");
      need(rows.length, "No headlines");
      return `${rows.length} headlines`;
    }),
    run("Search", async () => {
      const rows = await yahooSearch("microsoft");
      need(rows.length, "No results");
      return rows[0].symbol;
    }),
  ]);
}
