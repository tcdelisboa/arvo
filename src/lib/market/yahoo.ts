import "server-only";
import YahooFinance from "yahoo-finance2";
import {
  EMPTY_METRICS,
  type AssetType,
  type Candle,
  type Detail,
  type News,
  type Quote,
  type Range,
  type SearchHit,
} from "./types";

/**
 * Live market data through the open-source yahoo-finance2 library.
 *
 * Yahoo has no official public API: this is an unofficial feed, fine for a
 * prototype and personal use, but not licensed for a commercial product. For
 * launch, swap this file for a licensed provider (the rest of the app only
 * sees the functions exported from ./index).
 */

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const num = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const pct = (value: unknown): number | null => {
  const n = num(value);
  return n === null ? null : n * 100;
};

function assetType(quoteType: string | undefined): AssetType {
  if (quoteType === "EQUITY") return "stock";
  if (quoteType === "ETF" || quoteType === "MUTUALFUND") return "etf";
  return "other";
}

export async function yahooQuotes(symbols: string[]): Promise<Quote[]> {
  if (!symbols.length) return [];
  const rows = await yf.quote(symbols);
  return rows.map((row) => ({
    symbol: row.symbol,
    name: row.longName ?? row.shortName ?? row.symbol,
    type: assetType(row.quoteType),
    currency: row.currency ?? null,
    price: num(row.regularMarketPrice),
    change: num(row.regularMarketChange),
    changePercent: num(row.regularMarketChangePercent),
    exchange: row.fullExchangeName ?? null,
    marketCap: num(row.marketCap),
  }));
}

export async function yahooDetail(symbol: string): Promise<Detail | null> {
  const summary = await yf.quoteSummary(symbol, {
    modules: ["price", "summaryDetail", "assetProfile", "financialData", "defaultKeyStatistics", "fundProfile"],
  });
  const price = summary.price;
  if (!price) return null;
  const detail = summary.summaryDetail;
  const profile = summary.assetProfile;
  const financial = summary.financialData;
  const stats = summary.defaultKeyStatistics;
  const fund = summary.fundProfile;

  return {
    symbol: price.symbol ?? symbol,
    name: price.longName ?? price.shortName ?? symbol,
    type: assetType(price.quoteType),
    currency: price.currency ?? null,
    price: num(price.regularMarketPrice),
    change: num(price.regularMarketChange),
    changePercent: pct(price.regularMarketChangePercent),
    exchange: price.exchangeName ?? null,
    marketCap: num(price.marketCap) ?? num(detail?.marketCap),
    description: profile?.longBusinessSummary ?? null,
    sector: profile?.sector ?? null,
    industry: profile?.industry ?? null,
    country: profile?.country ?? null,
    website: profile?.website ?? null,
    employees: num(profile?.fullTimeEmployees),
    fundFamily: fund?.family ?? null,
    fundCategory: fund?.categoryName ?? null,
    metrics: {
      ...EMPTY_METRICS,
      marketCap: num(price.marketCap) ?? num(detail?.marketCap),
      trailingPE: num(detail?.trailingPE),
      forwardPE: num(detail?.forwardPE),
      dividendYield: pct(detail?.dividendYield),
      beta: num(detail?.beta) ?? num(stats?.beta) ?? num(stats?.beta3Year),
      profitMargin: pct(financial?.profitMargins),
      revenueGrowth: pct(financial?.revenueGrowth),
      debtToEquity: num(financial?.debtToEquity),
      returnOnEquity: pct(financial?.returnOnEquity),
      week52Low: num(detail?.fiftyTwoWeekLow),
      week52High: num(detail?.fiftyTwoWeekHigh),
      expenseRatio: pct(fund?.feesExpensesInvestment?.annualReportExpenseRatio),
      totalAssets: num(detail?.totalAssets) ?? num(stats?.totalAssets),
    },
  };
}

const RANGE_CONFIG: Record<Range, { days: number; interval: "1d" | "1wk" }> = {
  "1m": { days: 31, interval: "1d" },
  "6m": { days: 183, interval: "1d" },
  "1y": { days: 365, interval: "1d" },
  "5y": { days: 5 * 365, interval: "1wk" },
};

export async function yahooHistory(symbol: string, range: Range): Promise<Candle[]> {
  const { days, interval } = RANGE_CONFIG[range];
  const result = await yf.chart(symbol, {
    period1: new Date(Date.now() - days * 86_400_000),
    interval,
  });
  return result.quotes
    .map((row) => ({ t: row.date.getTime(), c: row.adjclose ?? row.close }))
    .filter((row): row is Candle => typeof row.c === "number" && Number.isFinite(row.c));
}

export async function yahooNews(symbol: string): Promise<News[]> {
  const result = await yf.search(symbol, { quotesCount: 0, newsCount: 8 });
  return result.news
    .filter((item) => /^https?:\/\//.test(item.link))
    .slice(0, 8)
    .map((item) => ({
      title: item.title,
      publisher: item.publisher,
      url: item.link,
      publishedAt: item.providerPublishTime.getTime(),
    }));
}

export async function yahooSearch(query: string): Promise<SearchHit[]> {
  const result = await yf.search(query, { quotesCount: 10, newsCount: 0 });
  const hits: SearchHit[] = [];
  for (const row of result.quotes) {
    if (!("symbol" in row) || typeof row.symbol !== "string") continue;
    const quoteType = "quoteType" in row && typeof row.quoteType === "string" ? row.quoteType : undefined;
    const type = assetType(quoteType);
    if (type === "other") continue;
    const name =
      ("longname" in row && typeof row.longname === "string" && row.longname) ||
      ("shortname" in row && typeof row.shortname === "string" && row.shortname) ||
      row.symbol;
    hits.push({
      symbol: row.symbol,
      name,
      type,
      exchange: "exchDisp" in row && typeof row.exchDisp === "string" ? row.exchDisp : null,
    });
  }
  return hits.slice(0, 8);
}
