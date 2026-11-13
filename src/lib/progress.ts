import { addMonths } from "./spending";

/**
 * The monthly habit: what was actually invested each month, how many months in
 * a row, and how far the emergency fund is from its target. Pure functions, so
 * the page, the monthly email and the tests all agree.
 */

export type MonthTotal = { ym: string; cents: number };

/** Months in a row with something invested, counting back from this month (or last month, if this one is still empty). */
export function streak(totals: MonthTotal[], currentYm: string): number {
  const invested = new Set(totals.filter((t) => t.cents > 0).map((t) => t.ym));
  let ym = invested.has(currentYm) ? currentYm : addMonths(currentYm, -1);
  let count = 0;
  while (invested.has(ym)) {
    count += 1;
    ym = addMonths(ym, -1);
  }
  return count;
}

/** The last `count` months, oldest first, with zero where nothing was logged. */
export function lastMonths(totals: MonthTotal[], currentYm: string, count = 6): MonthTotal[] {
  const byYm = new Map(totals.map((t) => [t.ym, t.cents]));
  return Array.from({ length: count }, (_, i) => {
    const ym = addMonths(currentYm, i - count + 1);
    return { ym, cents: byYm.get(ym) ?? 0 };
  });
}

export type EmergencyTarget = { targetCents: number; months: number; basis: "spending" | "income" };

/**
 * Three months of expenses with a steady income, six when it varies. Based on
 * real spending when Arvo has it, otherwise on income as a rough stand-in.
 */
export function emergencyTarget(input: { spendingCents: number | null; incomeCents: number | null; stability?: string | null }): EmergencyTarget | null {
  const months = input.stability === "low" ? 6 : 3;
  if (input.spendingCents && input.spendingCents > 0) {
    return { targetCents: roundUp(input.spendingCents * months), months, basis: "spending" };
  }
  if (input.incomeCents && input.incomeCents > 0) {
    return { targetCents: roundUp(input.incomeCents * months), months, basis: "income" };
  }
  return null;
}

const roundUp = (cents: number) => Math.ceil(cents / 10000) * 10000;
