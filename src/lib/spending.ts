import { CATEGORIES, isCategory, isSpend, type Category } from "./categories";

/** Pure calculations over a list of transactions. No database, no clock. */

export type Tx = {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  merchant: string;
  amountCents: number; // negative = money out
  category: string;
  accountId: string;
};

export type MonthSummary = {
  ym: string;
  income: number;
  spending: number;
  saved: number;
  net: number;
};

export const ymOf = (date: string) => date.slice(0, 7);

export function addMonths(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthRange(fromYm: string, toYm: string): string[] {
  const out: string[] = [];
  for (let ym = fromYm; ym <= toYm; ym = addMonths(ym, 1)) out.push(ym);
  return out;
}

/** Income, spending and savings per calendar month, oldest first, with gaps filled. */
export function summarizeMonths(txs: Tx[]): MonthSummary[] {
  if (!txs.length) return [];
  const byMonth = new Map<string, MonthSummary>();
  let min = ymOf(txs[0].date);
  let max = min;
  for (const tx of txs) {
    const ym = ymOf(tx.date);
    if (ym < min) min = ym;
    if (ym > max) max = ym;
    let row = byMonth.get(ym);
    if (!row) {
      row = { ym, income: 0, spending: 0, saved: 0, net: 0 };
      byMonth.set(ym, row);
    }
    const group = isCategory(tx.category) ? CATEGORIES[tx.category].group : "wants";
    if (group === "income") row.income += tx.amountCents;
    else if (group === "savings") row.saved -= tx.amountCents;
    else if (group === "needs" || group === "wants") row.spending -= tx.amountCents;
  }
  return monthRange(min, max).map((ym) => {
    const row = byMonth.get(ym) ?? { ym, income: 0, spending: 0, saved: 0, net: 0 };
    row.net = row.income - row.spending;
    return row;
  });
}

/**
 * Months that can be trusted for averages: not the current month (still in
 * progress) and not a first month that starts part-way through.
 */
export function completeMonths(txs: Tx[], todayIso: string): string[] {
  if (!txs.length) return [];
  const current = ymOf(todayIso);
  let firstDate = txs[0].date;
  let lastDate = txs[0].date;
  for (const tx of txs) {
    if (tx.date < firstDate) firstDate = tx.date;
    if (tx.date > lastDate) lastDate = tx.date;
  }
  const firstYm = ymOf(firstDate);
  const startsLate = Number(firstDate.slice(8, 10)) > 7;
  const lastYm = ymOf(lastDate) < current ? ymOf(lastDate) : addMonths(current, -1);
  const from = startsLate ? addMonths(firstYm, 1) : firstYm;
  return from <= lastYm ? monthRange(from, lastYm) : [];
}

export type Averages = {
  months: string[];
  income: number;
  spending: number;
  saved: number;
  /** True when averages come from a partial month because nothing better exists. */
  estimated: boolean;
};

/** Average monthly income and spending over the last `window` complete months. */
export function monthlyAverages(txs: Tx[], todayIso: string, window = 3): Averages {
  const summaries = summarizeMonths(txs);
  let months = completeMonths(txs, todayIso).slice(-window);
  let estimated = false;
  if (!months.length && summaries.length) {
    months = [summaries[summaries.length - 1].ym];
    estimated = true;
  }
  if (!months.length) return { months, income: 0, spending: 0, saved: 0, estimated: true };
  const rows = summaries.filter((row) => months.includes(row.ym));
  const avg = (pick: (row: MonthSummary) => number) =>
    Math.round(rows.reduce((sum, row) => sum + pick(row), 0) / months.length);
  return { months, income: avg((r) => r.income), spending: avg((r) => r.spending), saved: avg((r) => r.saved), estimated };
}

export type CategoryTotal = { category: Category; cents: number; share: number; count: number };

/** Net spending per category (refunds subtract), biggest first. */
export function categoryTotals(txs: Tx[], months?: string[]): CategoryTotal[] {
  const totals = new Map<Category, { cents: number; count: number }>();
  for (const tx of txs) {
    if (months && !months.includes(ymOf(tx.date))) continue;
    if (!isSpend(tx.category)) continue;
    const key: Category = isCategory(tx.category) ? tx.category : "other";
    const row = totals.get(key) ?? { cents: 0, count: 0 };
    row.cents -= tx.amountCents;
    row.count += 1;
    totals.set(key, row);
  }
  const rows = [...totals.entries()]
    .map(([category, row]) => ({ category, cents: Math.max(0, row.cents), count: row.count }))
    .filter((row) => row.cents > 0);
  const total = rows.reduce((sum, row) => sum + row.cents, 0);
  return rows
    .map((row) => ({ ...row, share: total ? row.cents / total : 0 }))
    .sort((a, b) => b.cents - a.cents);
}

export type MerchantTotal = { merchant: string; cents: number; count: number; category: string };

export function topMerchants(txs: Tx[], months?: string[], limit = 8): MerchantTotal[] {
  const totals = new Map<string, MerchantTotal>();
  for (const tx of txs) {
    if (months && !months.includes(ymOf(tx.date))) continue;
    if (!isSpend(tx.category) || tx.amountCents >= 0) continue;
    const key = tx.merchant.toLowerCase();
    const row = totals.get(key) ?? { merchant: tx.merchant, cents: 0, count: 0, category: tx.category };
    row.cents -= tx.amountCents;
    row.count += 1;
    totals.set(key, row);
  }
  return [...totals.values()].sort((a, b) => b.cents - a.cents).slice(0, limit);
}

export type Recurring = { merchant: string; category: string; monthlyCents: number; months: number };

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
};

/**
 * Charges that repeat monthly at a steady amount: the same merchant, in at
 * least three different months, once a month, within 15% of their median,
 * on about the same day of the month.
 */
export function findRecurring(txs: Tx[]): Recurring[] {
  const groups = new Map<string, Tx[]>();
  for (const tx of txs) {
    if (tx.amountCents >= 0 || !isSpend(tx.category)) continue;
    const key = tx.merchant.toLowerCase();
    const list = groups.get(key);
    if (list) list.push(tx);
    else groups.set(key, [tx]);
  }
  const out: Recurring[] = [];
  for (const list of groups.values()) {
    const months = new Set(list.map((tx) => ymOf(tx.date)));
    if (months.size < 3) continue;
    if (list.length > months.size * 1.34) continue; // several a month is a habit, not a subscription
    const amounts = list.map((tx) => -tx.amountCents);
    const mid = median(amounts);
    const steady = amounts.filter((a) => Math.abs(a - mid) <= mid * 0.15).length;
    if (steady / amounts.length < 0.8) continue;
    // A subscription is charged on about the same day each month; shopping is not.
    const days = list.map((tx) => Math.min(28, Number(tx.date.slice(8, 10))));
    if (Math.max(...days) - Math.min(...days) > 6) continue;
    out.push({ merchant: list[0].merchant, category: list[0].category, monthlyCents: mid, months: months.size });
  }
  return out.sort((a, b) => b.monthlyCents - a.monthlyCents);
}

/** Needs / wants / saved split against the 50/30/20 rule of thumb. */
export function needsWantsSplit(txs: Tx[], months: string[]) {
  let needs = 0;
  let wants = 0;
  for (const tx of txs) {
    if (!months.includes(ymOf(tx.date))) continue;
    const group = isCategory(tx.category) ? CATEGORIES[tx.category].group : "wants";
    if (group === "needs") needs -= tx.amountCents;
    else if (group === "wants") wants -= tx.amountCents;
  }
  const n = Math.max(1, months.length);
  return { needs: Math.round(Math.max(0, needs) / n), wants: Math.round(Math.max(0, wants) / n) };
}
