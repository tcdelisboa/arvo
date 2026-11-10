import { describe, expect, it } from "vitest";
import { money, parseAmountToCents, percent, day, month } from "@/lib/format";
import { categorize, cleanMerchant } from "@/lib/categories";
import { parseDate, parseStatement } from "@/lib/csv";
import { generateDemoRows, seedFrom } from "@/lib/demo";
import {
  categoryTotals, completeMonths, findRecurring, monthlyAverages, summarizeMonths, type Tx,
} from "@/lib/spending";
import { buildInsights, totalPotentialSaving } from "@/lib/insights";
import { scoreRisk, validateAnswers, type Answers } from "@/lib/risk";
import { recommendMonthly } from "@/lib/recommend";
import { buildPortfolio, futureValue, portfolioStats, project, MIXES } from "@/lib/portfolio";
import { assessFit, volatilityFrom } from "@/lib/market/suitability";
import { EMPTY_METRICS, normaliseSymbol } from "@/lib/market/types";
import { sampleHistory, sampleQuote, sampleSearch } from "@/lib/market/sample";
import { UNIVERSE } from "@/lib/market/universe";

const fmt = (c: number) => money(c, "EUR", { whole: true });

describe("format", () => {
  it("formats money with a real minus sign", () => {
    expect(money(123456, "EUR")).toBe("€1,234.56");
    expect(money(-500, "EUR")).toBe("−€5.00");
    expect(money(250000, "USD", { whole: true })).toBe("$2,500");
    expect(money(1999, "GBP", { sign: true })).toBe("+£19.99");
  });
  it("parses typed amounts in either decimal convention", () => {
    expect(parseAmountToCents("1,250.50")).toBe(125050);
    expect(parseAmountToCents("1.250,50")).toBe(125050);
    expect(parseAmountToCents("12,5")).toBe(1250);
    expect(parseAmountToCents("1,250")).toBe(125000);
    expect(parseAmountToCents("-45.99")).toBe(-4599);
    expect(parseAmountToCents("(45.99)")).toBe(-4599);
    expect(parseAmountToCents("€ 2 450,00")).toBe(245000);
    expect(parseAmountToCents("1.234.567")).toBe(123456700);
    expect(parseAmountToCents("abc")).toBeNull();
  });
  it("formats percent and dates", () => {
    expect(percent(-3.456)).toBe("−3.5%");
    expect(percent(2, 0, true)).toBe("+2%");
    expect(day("2026-11-03")).toBe("3 Nov 2026");
    expect(month("2026-11", "long")).toBe("November 2026");
  });
});

describe("categorize", () => {
  const cases: [string, number, string][] = [
    ["Salary Northwind Studio", 245000, "income"],
    ["ORDENADO EMPRESA LDA", 180000, "income"],
    ["Rent - Standing order landlord", -89000, "housing"],
    ["LIDL 2231 LISBOA", -3210, "groceries"],
    ["Pingo Doce Chiado", -1840, "groceries"],
    ["CAFÉ A BRASILEIRA", -350, "dining"],
    ["UBER *EATS", -1890, "dining"],
    ["UBER *TRIP", -940, "transport"],
    ["Bolt ride", -700, "transport"],
    ["NETFLIX.COM", -1399, "subscriptions"],
    ["Amazon Prime", -899, "subscriptions"],
    ["AMAZON MARKETPLACE", -4500, "shopping"],
    ["Amazon Marketplace refund", 3499, "shopping"],
    ["Farmácia Estácio", -1250, "health"],
    ["Ryanair flight", -8900, "travel"],
    ["EDP Comercial", -5600, "utilities"],
    ["Transfer to savings account", -10000, "savings"],
    ["Trade Republic", -20000, "savings"],
    ["MB WAY transfer", -2000, "transfers"],
    ["Account maintenance fee", -495, "fees"],
    ["ATM cash withdrawal", -4000, "cash"],
    ["Something unknown", -1000, "other"],
    ["From a friend", 2000, "income"],
  ];
  it.each(cases)("%s -> %s", (description, amount, expected) => {
    expect(categorize(description, amount)).toBe(expected);
  });
  it("cleans merchant names", () => {
    expect(cleanMerchant("NETFLIX.COM")).toBe("Netflix");
    expect(cleanMerchant("CARD PAYMENT TO LIDL 2231 LISBOA")).toBe("Lidl Lisboa");
    expect(cleanMerchant("McDonald's")).toBe("McDonald's");
    expect(cleanMerchant("H&M")).toBe("H&M");
  });
});

describe("statement parser", () => {
  it("reads a simple English CSV", () => {
    const out = parseStatement("Date,Description,Amount\n2026-10-01,Lidl,-23.40\n2026-10-02,Salary,2450.00\n");
    expect(out.error).toBeUndefined();
    expect(out.rows).toEqual([
      { date: "2026-10-01", description: "Lidl", amountCents: -2340 },
      { date: "2026-10-02", description: "Salary", amountCents: 245000 },
    ]);
  });
  it("reads a Portuguese bank export with preamble, semicolons, decimal commas and debit/credit columns", () => {
    const csv = [
      "Conta;PT50 0000 0000 0000",
      "Titular;Fulano",
      "",
      "Data Mov.;Data Valor;Descrição;Débito;Crédito;Saldo",
      "03/10/2026;03/10/2026;COMPRA PINGO DOCE;45,30;;1.204,70",
      "25/10/2026;25/10/2026;ORDENADO;;1.850,00;3.054,70",
      "31/10/2026;31/10/2026;LEVANTAMENTO MULTIBANCO;60,00;;2.994,70",
    ].join("\n");
    const out = parseStatement(csv);
    expect(out.error).toBeUndefined();
    expect(out.rows).toEqual([
      { date: "2026-10-03", description: "COMPRA PINGO DOCE", amountCents: -4530 },
      { date: "2026-10-25", description: "ORDENADO", amountCents: 185000 },
      { date: "2026-10-31", description: "LEVANTAMENTO MULTIBANCO", amountCents: -6000 },
    ]);
  });
  it("reads a Revolut-style export with datetimes", () => {
    const csv =
      "Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance\n" +
      "CARD_PAYMENT,Current,2026-09-14 10:22:01,2026-09-15 08:00:00,Wolt,-18.90,0.00,EUR,COMPLETED,812.10\n";
    const out = parseStatement(csv);
    expect(out.rows).toEqual([{ date: "2026-09-14", description: "Wolt", amountCents: -1890 }]);
  });
  it("detects US month-first dates", () => {
    const out = parseStatement("Date,Description,Amount\n10/13/2026,Coffee,-4.50\n10/02/2026,Books,-20\n");
    expect(out.rows.map((r) => r.date)).toEqual(["2026-10-13", "2026-10-02"]);
  });
  it("works without a header row", () => {
    const out = parseStatement("01.10.2026;REWE Markt Berlin;-31,20\n02.10.2026;Gehalt Firma GmbH;2.100,00\n");
    expect(out.rows).toEqual([
      { date: "2026-10-01", description: "REWE Markt Berlin", amountCents: -3120 },
      { date: "2026-10-02", description: "Gehalt Firma GmbH", amountCents: 210000 },
    ]);
  });
  it("explains itself when the file is unusable", () => {
    expect(parseStatement("").error).toBeTruthy();
    expect(parseStatement("hello\nworld\n").error).toBeTruthy();
  });
  it("parses assorted date shapes", () => {
    expect(parseDate("12 Oct 2026")).toBe("2026-10-12");
    expect(parseDate("Oct 12, 2026")).toBe("2026-10-12");
    expect(parseDate("31/02/2026")).toBeNull();
    expect(parseDate("20261012")).toBe("2026-10-12");
  });
});

const today = new Date(Date.UTC(2026, 10, 10));
const demo = generateDemoRows(seedFrom("user-1"), today);
const txs: Tx[] = demo.map((row, i) => ({
  id: String(i),
  date: row.date,
  description: row.description,
  merchant: cleanMerchant(row.description),
  amountCents: row.amountCents,
  category: categorize(row.description, row.amountCents),
  accountId: "a",
}));

describe("sample data and spending maths", () => {
  it("is deterministic and never dated in the future", () => {
    expect(generateDemoRows(seedFrom("user-1"), today)).toEqual(demo);
    expect(demo.every((r) => r.date <= "2026-11-10")).toBe(true);
    expect(demo.length).toBeGreaterThan(200);
  });
  it("leaves almost nothing uncategorised", () => {
    const other = txs.filter((t) => t.category === "other");
    expect(other.map((t) => t.description)).toEqual([]);
  });
  it("summarises months and excludes the month in progress from averages", () => {
    const months = summarizeMonths(txs);
    expect(months[0].ym).toBe("2026-05");
    expect(months.at(-1)!.ym).toBe("2026-11");
    expect(completeMonths(txs, "2026-11-10")).toEqual(["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]);
    const avg = monthlyAverages(txs, "2026-11-10");
    expect(avg.months).toEqual(["2026-08", "2026-09", "2026-10"]);
    expect(avg.income).toBe(245000);
    expect(avg.spending).toBeGreaterThan(150000);
    expect(avg.spending).toBeLessThan(260000);
    expect(avg.saved).toBe(10000);
  });
  it("totals categories with shares that sum to one", () => {
    const totals = categoryTotals(txs, ["2026-10"]);
    expect(totals[0].category).toBe("housing");
    expect(totals.reduce((s, t) => s + t.share, 0)).toBeCloseTo(1, 6);
  });
  it("finds subscriptions but not habits", () => {
    const names = findRecurring(txs).map((r) => r.merchant);
    expect(names).toEqual(expect.arrayContaining(["Netflix", "Spotify Premium", "Disney+ Subscription"]));
    expect(names).not.toContain("Lidl");
    expect(names).not.toContain("Wolt");
  });
  it("produces insights with a positive saving", () => {
    const insights = buildInsights({ txs, todayIso: "2026-11-10", fmt });
    const ids = insights.map((i) => i.id);
    expect(ids).toEqual(expect.arrayContaining(["top-categories", "subscriptions", "rate"]));
    expect(totalPotentialSaving(insights)).toBeGreaterThan(2000);
    for (const insight of insights) {
      expect(insight.body).not.toMatch(/NaN|undefined|Infinity/);
    }
  });
  it("handles an empty account", () => {
    expect(buildInsights({ txs: [], todayIso: "2026-11-10", fmt })).toEqual([]);
    expect(summarizeMonths([])).toEqual([]);
    expect(monthlyAverages([], "2026-11-10").spending).toBe(0);
  });
});

const base: Answers = {
  age: 24, monthlyIncome: 245000, horizon: "gt20", buffer: "3to6", debt: "no",
  stability: "high", experience: "some", reaction: "hold", tradeoff: "c", goal: "growth",
};

describe("risk profile", () => {
  it("scores a young long-term saver as Growth", () => {
    const r = scoreRisk(base);
    expect(r.level).toBe(4);
    expect(r.limits).toEqual([]);
  });
  it("is monotonic in tolerance", () => {
    const low = scoreRisk({ ...base, reaction: "trim", tradeoff: "a", goal: "preserve" });
    const high = scoreRisk({ ...base, reaction: "buy", tradeoff: "d", goal: "max", experience: "advanced" });
    expect(low.score).toBeLessThan(scoreRisk(base).score);
    expect(high.score).toBeGreaterThan(scoreRisk(base).score);
    expect(high.level).toBe(5);
  });
  it("caps short horizons, debt and missing safety nets, and says why", () => {
    const brave = { ...base, reaction: "buy", tradeoff: "d", goal: "max", experience: "advanced" };
    expect(scoreRisk({ ...brave, horizon: "lt3" }).level).toBe(1);
    expect(scoreRisk({ ...brave, horizon: "lt3" }).limits.length).toBe(1);
    expect(scoreRisk({ ...brave, debt: "yes" }).level).toBeLessThanOrEqual(2);
    expect(scoreRisk({ ...brave, buffer: "none" }).level).toBeLessThanOrEqual(3);
    expect(scoreRisk({ ...base, reaction: "sell" }).level).toBeLessThanOrEqual(2);
  });
  it("validates form input", () => {
    expect(validateAnswers({ ...base }).ok).toBe(true);
    const bad = validateAnswers({ ...base, age: 12, horizon: "forever" });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(Object.keys(bad.errors).sort()).toEqual(["age", "horizon"]);
  });
});

describe("monthly amount", () => {
  it("invests most of the surplus when the safety net exists", () => {
    const r = recommendMonthly({ incomeCents: 245000, spendingCents: 200000, buffer: "3to6", debt: "no" }, fmt);
    expect(r.surplusCents).toBe(45000);
    expect(r.amountCents).toBe(30000);
  });
  it("holds back for an emergency fund, and stops for debt or a deficit", () => {
    expect(recommendMonthly({ incomeCents: 245000, spendingCents: 200000, buffer: "none", debt: "no" }, fmt).amountCents).toBe(11000);
    expect(recommendMonthly({ incomeCents: 245000, spendingCents: 200000, buffer: "gt6", debt: "yes" }, fmt).amountCents).toBe(0);
    const deficit = recommendMonthly({ incomeCents: 150000, spendingCents: 200000, buffer: "gt6", debt: "no" }, fmt);
    expect(deficit.amountCents).toBe(0);
    expect(deficit.reasons.length).toBeGreaterThan(0);
  });
  it("never suggests more than the surplus or 40% of income", () => {
    const r = recommendMonthly({ incomeCents: 500000, spendingCents: 100000, buffer: "gt6", debt: "no" }, fmt);
    expect(r.amountCents).toBeLessThanOrEqual(200000);
    const unknown = recommendMonthly({ incomeCents: 200000, spendingCents: null, buffer: "3to6", debt: "no" }, fmt);
    expect(unknown.amountCents).toBe(30000);
  });
});

describe("portfolio", () => {
  it("weights and monthly amounts always add up", () => {
    for (const level of [1, 2, 3, 4, 5] as const) {
      for (const companies of [false, true]) {
        const holdings = buildPortfolio(level, 23333, companies);
        expect(holdings.reduce((s, h) => s + h.weight, 0)).toBeCloseTo(100, 6);
        expect(holdings.reduce((s, h) => s + h.monthlyCents, 0)).toBe(23333);
        expect(holdings.every((h) => h.weight > 0)).toBe(true);
      }
      const m = MIXES[level];
      expect(m.stocks + m.bonds + m.cash + m.gold).toBe(100);
    }
  });
  it("keeps individual companies out of cautious plans", () => {
    expect(buildPortfolio(2, 10000, true).some((h) => h.kind === "Stock")).toBe(false);
    expect(buildPortfolio(4, 10000, true).filter((h) => h.kind === "Stock").length).toBe(5);
  });
  it("gets riskier and more rewarding as the level rises", () => {
    const stats = ([1, 2, 3, 4, 5] as const).map((l) => portfolioStats(buildPortfolio(l, 10000, false)));
    for (let i = 1; i < stats.length; i++) {
      expect(stats[i].expectedReturn).toBeGreaterThan(stats[i - 1].expectedReturn);
      expect(stats[i].volatility).toBeGreaterThan(stats[i - 1].volatility);
    }
    expect(stats[4].badYear).toBeLessThan(-0.2);
    expect(stats[0].badYear).toBeGreaterThan(-0.1);
  });
  it("compounds correctly", () => {
    expect(futureValue(10000, 0, 10)).toBe(1200000);
    // 100 a month at 6% for 30 years is a little under 100k.
    expect(futureValue(10000, 0.06, 30) / 100).toBeGreaterThan(95000);
    expect(futureValue(10000, 0.06, 30) / 100).toBeLessThan(100000);
    const points = project(20000, { expectedReturn: 0.055, volatility: 0.12 }, 20);
    expect(points).toHaveLength(21);
    expect(points[0]).toMatchObject({ paid: 0, low: 0, mid: 0, high: 0 });
    const last = points.at(-1)!;
    expect(last.low).toBeLessThan(last.mid);
    expect(last.mid).toBeLessThan(last.high);
    expect(last.mid).toBeGreaterThan(last.paid);
  });
});

describe("suitability", () => {
  const world = UNIVERSE.find((u) => u.symbol === "VWCE.DE")!;
  const nvda = UNIVERSE.find((u) => u.symbol === "NVDA")!;
  it("rates a global fund well for a balanced investor", () => {
    const fit = assessFit({ type: "etf", name: world.name, metrics: EMPTY_METRICS, volatility: 14, known: world }, 3);
    expect(fit.label).toBe("Good fit");
    expect(fit.maxWeight).toBe(100);
  });
  it("rates a volatile single share poorly for a conservative investor", () => {
    const fit = assessFit({ type: "stock", name: "Nvidia", metrics: { ...EMPTY_METRICS, marketCap: 3e12, profitMargin: 50 }, volatility: 48, known: nvda }, 1);
    expect(fit.label).toBe("Poor fit");
    expect(fit.maxWeight).toBe(0);
    expect(fit.reasons.length).toBeGreaterThan(1);
  });
  it("improves with the investor's level and stays within 0-100", () => {
    const scores = ([1, 2, 3, 4, 5] as const).map(
      (l) => assessFit({ type: "stock", name: "x", metrics: EMPTY_METRICS, volatility: 30 }, l).score,
    );
    for (let i = 1; i < scores.length; i++) expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1]);
    expect(Math.min(...scores)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...scores)).toBeLessThanOrEqual(100);
  });
  it("measures volatility from prices", () => {
    const candles = sampleHistory("VWCE.DE", "1y", today.getTime());
    const vol = volatilityFrom(candles)!;
    expect(vol).toBeGreaterThan(10);
    expect(vol).toBeLessThan(30);
    expect(volatilityFrom(candles.slice(0, 5))).toBeNull();
  });
});

describe("sample market data", () => {
  it("is stable from call to call and covers every listed asset", () => {
    const now = today.getTime();
    for (const entry of UNIVERSE) {
      const quote = sampleQuote(entry.symbol, now)!;
      expect(quote.price).toBeGreaterThan(0);
      expect(sampleQuote(entry.symbol, now)).toEqual(quote);
    }
    const a = sampleHistory("AAPL", "1y", now);
    const b = sampleHistory("AAPL", "1y", now + 86_400_000);
    // Yesterday's history does not change when a new day is added.
    expect(b.find((c) => c.t === a.at(-2)!.t)!.c).toBe(a.at(-2)!.c);
  });
  it("has no duplicate symbols and searches by name", () => {
    expect(new Set(UNIVERSE.map((u) => u.symbol)).size).toBe(UNIVERSE.length);
    expect(sampleSearch("micro")[0].symbol).toBe("MSFT");
    expect(sampleSearch("")).toEqual([]);
  });
  it("accepts only plausible symbols", () => {
    expect(normaliseSymbol("vwce.de")).toBe("VWCE.DE");
    expect(normaliseSymbol("BRK-B")).toBe("BRK-B");
    expect(normaliseSymbol("../etc/passwd")).toBeNull();
    expect(normaliseSymbol("<script>")).toBeNull();
  });
});
