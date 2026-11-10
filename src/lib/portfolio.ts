import type { Level } from "./risk";

/**
 * Model portfolios.
 *
 * Each risk level maps to a mix of four building blocks (stocks, bonds, cash,
 * gold), and each block maps to one low-cost, widely held UCITS fund that a
 * European retail investor can buy at most brokers. An optional "companies"
 * sleeve swaps a slice of the stock fund for a handful of individual shares.
 *
 * These are educational model portfolios, not personal advice.
 */

export type AssetClass = "stocks" | "bonds" | "cash" | "gold" | "companies";

export type Instrument = {
  symbol: string; // Yahoo Finance symbol
  ticker: string; // what the person types at their broker
  isin?: string;
  name: string;
  short: string;
  kind: "ETF" | "ETC" | "Stock";
  assetClass: AssetClass;
  cost?: string;
  what: string;
  why: string;
  watch: string;
};

export const INSTRUMENTS: Record<string, Instrument> = {
  world: {
    symbol: "VWCE.DE",
    ticker: "VWCE",
    isin: "IE00BK5BQT80",
    name: "Vanguard FTSE All-World UCITS ETF (Acc)",
    short: "Global stocks",
    kind: "ETF",
    assetClass: "stocks",
    cost: "Under 0.25% a year",
    what: "One fund that owns shares in roughly 3,700 large and mid-sized companies across developed and emerging countries, weighted by size.",
    why: "It is the engine of the plan. You own a slice of the world economy instead of betting on one company, country or sector, and dividends are reinvested for you.",
    watch: "It moves with stock markets. A fall of 30% or more in a bad year has happened before and will happen again.",
  },
  small: {
    symbol: "IUSN.DE",
    ticker: "IUSN",
    isin: "IE00BF4RFH31",
    name: "iShares MSCI World Small Cap UCITS ETF (Acc)",
    short: "Smaller companies",
    kind: "ETF",
    assetClass: "stocks",
    cost: "About 0.35% a year",
    what: "Around 3,500 smaller listed companies from developed countries, which the global fund above mostly leaves out.",
    why: "Smaller companies have historically grown faster over long periods, and adding them spreads your stocks even wider.",
    watch: "They swing more than large companies and can lag for years at a time.",
  },
  bonds: {
    symbol: "EUNA.DE",
    ticker: "EUNA",
    isin: "IE00BDBRDM35",
    name: "iShares Core Global Aggregate Bond UCITS ETF EUR Hedged (Acc)",
    short: "Global bonds",
    kind: "ETF",
    assetClass: "bonds",
    cost: "About 0.10% a year",
    what: "Thousands of high-quality loans to governments and large companies worldwide, with currency swings against the euro hedged away.",
    why: "Bonds are the shock absorber. They pay interest and usually fall far less than stocks, which makes the whole plan easier to hold.",
    watch: "Bond prices fall when interest rates rise, as they did sharply in 2022.",
  },
  cash: {
    symbol: "XEON.DE",
    ticker: "XEON",
    isin: "LU0290358497",
    name: "Xtrackers II EUR Overnight Rate Swap UCITS ETF 1C",
    short: "Cash-like",
    kind: "ETF",
    assetClass: "cash",
    cost: "About 0.10% a year",
    what: "A fund that pays roughly the euro overnight interest rate, the rate banks lend to each other at.",
    why: "It behaves like a savings account inside your investment account: very stable, and it earns whatever short-term interest rates are paying.",
    watch: "It will not grow much. When interest rates are low it may not keep up with inflation.",
  },
  gold: {
    symbol: "4GLD.DE",
    ticker: "4GLD",
    isin: "DE000A0S9GB0",
    name: "Xetra-Gold",
    short: "Gold",
    kind: "ETC",
    assetClass: "gold",
    what: "A security backed by physical gold held in a vault in Frankfurt. Each unit represents one gram.",
    why: "Gold often holds its value when stocks and bonds fall together, so a small amount steadies the plan.",
    watch: "It pays no interest or dividends and its price can drift for years. Keep it small.",
  },
  msft: {
    symbol: "MSFT",
    ticker: "MSFT",
    name: "Microsoft",
    short: "Software & cloud",
    kind: "Stock",
    assetClass: "companies",
    what: "Maker of Windows, Office and the Azure cloud platform.",
    why: "A large, highly profitable business with recurring subscription revenue.",
    watch: "Priced for strong growth; disappointment is punished quickly.",
  },
  asml: {
    symbol: "ASML.AS",
    ticker: "ASML",
    name: "ASML Holding",
    short: "Chip equipment",
    kind: "Stock",
    assetClass: "companies",
    what: "Dutch maker of the lithography machines used to manufacture advanced computer chips.",
    why: "It is the only supplier of the most advanced machines, which every leading chip maker needs.",
    watch: "Orders are lumpy and exposed to export restrictions and the chip cycle.",
  },
  visa: {
    symbol: "V",
    ticker: "V",
    name: "Visa",
    short: "Payments",
    kind: "Stock",
    assetClass: "companies",
    what: "Runs one of the two largest card payment networks in the world.",
    why: "It takes a small fee on a vast number of payments and needs little capital to grow.",
    watch: "Regulators and new payment systems regularly challenge its fees.",
  },
  lvmh: {
    symbol: "MC.PA",
    ticker: "MC",
    name: "LVMH",
    short: "Luxury goods",
    kind: "Stock",
    assetClass: "companies",
    what: "French group behind Louis Vuitton, Dior, Tiffany, Hennessy and around 70 other luxury brands.",
    why: "Strong brands give it pricing power across fashion, jewellery, drinks and retail.",
    watch: "Sales depend on wealthy consumers, especially in China and the United States.",
  },
  sanofi: {
    symbol: "SAN.PA",
    ticker: "SAN",
    name: "Sanofi",
    short: "Healthcare",
    kind: "Stock",
    assetClass: "companies",
    what: "French pharmaceutical company focused on immunology, vaccines and rare diseases.",
    why: "Demand for medicines holds up in recessions, which balances the more cyclical companies above.",
    watch: "Results hinge on drug trials and patent expiries.",
  },
};

const COMPANY_KEYS = ["msft", "asml", "visa", "lvmh", "sanofi"] as const;

/** Share of the whole plan, in percent, by building block. */
export const MIXES: Record<Level, { stocks: number; bonds: number; cash: number; gold: number }> = {
  1: { stocks: 20, bonds: 50, cash: 25, gold: 5 },
  2: { stocks: 40, bonds: 40, cash: 12, gold: 8 },
  3: { stocks: 60, bonds: 28, cash: 5, gold: 7 },
  4: { stocks: 80, bonds: 13, cash: 2, gold: 5 },
  5: { stocks: 92, bonds: 3, cash: 0, gold: 5 },
};

export type Holding = Instrument & {
  key: string;
  weight: number; // percent of the plan
  monthlyCents: number;
};

/** Largest-remainder rounding so monthly amounts add up to the cent. */
function allocate(totalCents: number, weights: number[]): number[] {
  const raw = weights.map((w) => (totalCents * w) / 100);
  const floors = raw.map(Math.floor);
  let left = totalCents - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((value, index) => ({ index, frac: value - Math.floor(value) })).sort((a, b) => b.frac - a.frac);
  for (const { index } of order) {
    if (left <= 0) break;
    floors[index] += 1;
    left -= 1;
  }
  return floors;
}

export function buildPortfolio(level: Level, monthlyCents: number, includeCompanies: boolean): Holding[] {
  const mix = MIXES[level];
  const parts: { key: string; weight: number }[] = [];

  let stocks = mix.stocks;
  // Individual companies only make sense once the plan can carry the extra risk.
  const companies = includeCompanies && level >= 3 ? (level === 3 ? 5 : level === 4 ? 10 : 15) : 0;
  stocks -= companies;
  const small = level >= 4 ? Math.round(stocks * 0.12) : 0;
  parts.push({ key: "world", weight: stocks - small });
  if (small) parts.push({ key: "small", weight: small });
  if (mix.bonds) parts.push({ key: "bonds", weight: mix.bonds });
  if (mix.cash) parts.push({ key: "cash", weight: mix.cash });
  if (mix.gold) parts.push({ key: "gold", weight: mix.gold });
  if (companies) {
    const each = companies / COMPANY_KEYS.length;
    for (const key of COMPANY_KEYS) parts.push({ key, weight: each });
  }

  const amounts = allocate(monthlyCents, parts.map((p) => p.weight));
  return parts.map((part, index) => ({
    ...INSTRUMENTS[part.key],
    key: part.key,
    weight: part.weight,
    monthlyCents: amounts[index],
  }));
}

export function companiesAllowed(level: Level): boolean {
  return level >= 3;
}

/**
 * Long-run assumptions per building block, before inflation. Deliberately
 * round and conservative; they are there to show orders of magnitude.
 */
const ASSUMPTIONS: Record<AssetClass, { ret: number; vol: number }> = {
  stocks: { ret: 0.065, vol: 0.16 },
  companies: { ret: 0.065, vol: 0.22 },
  bonds: { ret: 0.03, vol: 0.05 },
  cash: { ret: 0.02, vol: 0.005 },
  gold: { ret: 0.035, vol: 0.15 },
};

const CORRELATION: Record<string, number> = {
  "stocks:companies": 0.85,
  "stocks:bonds": 0.2,
  "stocks:gold": 0.1,
  "stocks:cash": 0,
  "companies:bonds": 0.2,
  "companies:gold": 0.1,
  "companies:cash": 0,
  "bonds:gold": 0.2,
  "bonds:cash": 0.1,
  "cash:gold": 0,
};

const corr = (a: AssetClass, b: AssetClass) =>
  a === b ? 1 : (CORRELATION[`${a}:${b}`] ?? CORRELATION[`${b}:${a}`] ?? 0);

export type PortfolioStats = {
  expectedReturn: number;
  volatility: number;
  /** A rough bad year: two standard deviations below the expected return. */
  badYear: number;
  byClass: { assetClass: AssetClass; weight: number }[];
};

export function portfolioStats(holdings: Holding[]): PortfolioStats {
  const classes = new Map<AssetClass, number>();
  for (const h of holdings) classes.set(h.assetClass, (classes.get(h.assetClass) ?? 0) + h.weight / 100);
  const entries = [...classes.entries()];
  const expectedReturn = entries.reduce((sum, [c, w]) => sum + w * ASSUMPTIONS[c].ret, 0);
  let variance = 0;
  for (const [a, wa] of entries) {
    for (const [b, wb] of entries) {
      variance += wa * wb * ASSUMPTIONS[a].vol * ASSUMPTIONS[b].vol * corr(a, b);
    }
  }
  const volatility = Math.sqrt(variance);
  return {
    expectedReturn,
    volatility,
    badYear: expectedReturn - 2 * volatility,
    byClass: entries.map(([assetClass, weight]) => ({ assetClass, weight: weight * 100 })),
  };
}

export type ProjectionPoint = { year: number; paid: number; low: number; mid: number; high: number };

/** Future value of a monthly contribution at an annual rate, compounded monthly. */
export function futureValue(monthlyCents: number, annualRate: number, years: number, startCents = 0): number {
  const r = Math.pow(1 + annualRate, 1 / 12) - 1;
  const n = Math.round(years * 12);
  if (Math.abs(r) < 1e-9) return startCents + monthlyCents * n;
  return startCents * Math.pow(1 + r, n) + monthlyCents * ((Math.pow(1 + r, n) - 1) / r);
}

/**
 * Projection with an honest range. Over T years, the average yearly return of
 * a portfolio with volatility s has a standard deviation of about s / sqrt(T),
 * so the low and high lines sit one such deviation either side of the middle.
 * Roughly two outcomes in three land between them.
 */
export function project(monthlyCents: number, stats: Pick<PortfolioStats, "expectedReturn" | "volatility">, years: number): ProjectionPoint[] {
  const points: ProjectionPoint[] = [];
  for (let year = 0; year <= years; year++) {
    const spread = year === 0 ? 0 : stats.volatility / Math.sqrt(year);
    points.push({
      year,
      paid: monthlyCents * 12 * year,
      low: Math.round(futureValue(monthlyCents, stats.expectedReturn - spread, year)),
      mid: Math.round(futureValue(monthlyCents, stats.expectedReturn, year)),
      high: Math.round(futureValue(monthlyCents, stats.expectedReturn + spread, year)),
    });
  }
  return points;
}

export const CLASS_LABEL: Record<AssetClass, string> = {
  stocks: "Stock funds",
  companies: "Individual companies",
  bonds: "Bonds",
  cash: "Cash-like",
  gold: "Gold",
};
