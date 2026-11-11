import { addMonths } from "./spending";

/**
 * Plans. Free covers the basics; Plus adds the savings ideas, full history
 * and Excel export. Payments are not switched on yet: people join a waitlist,
 * and an admin can grant Plus by hand (for testers).
 */
export type Plan = "free" | "plus";

export const PLUS_PRICE = "€5";

/** Free shows the month in progress plus this many full months before it. */
export const FREE_HISTORY_MONTHS = 3;

export function isPlan(value: unknown): value is Plan {
  return value === "free" || value === "plus";
}

/** The earliest month ("YYYY-MM") a free account can browse. */
export function freeHistoryStart(todayIso: string): string {
  return addMonths(todayIso.slice(0, 7), -FREE_HISTORY_MONTHS);
}

export const FREE_FEATURES = [
  "Import statements from any bank",
  "Spending by category and regular payments",
  `The last ${FREE_HISTORY_MONTHS} months of history`,
  "Investor profile and model portfolio",
  "Markets, with a fit rating for your profile",
];

export const PLUS_FEATURES = [
  "Every way to save Arvo finds, with the amount each is worth",
  "Your full history, however far back it goes",
  "Export to Excel",
  "Everything in Free",
];
