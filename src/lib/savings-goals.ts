import { msg } from "./i18n/core";
import type { Region } from "./portfolio";

/**
 * Saving towards something concrete: a car, a trip, a home. Given what is left
 * over each month and the savings Arvo found in the transactions, work out
 * three ways to get there (light, balanced, radical), how long each takes,
 * and where the money should wait in the meantime. Pure functions.
 */

export const GOAL_KINDS = ["car", "trip", "home", "study", "other"] as const;
export type GoalKind = (typeof GOAL_KINDS)[number];
export const isGoalKind = (value: unknown): value is GoalKind => typeof value === "string" && (GOAL_KINDS as readonly string[]).includes(value);

export const GOAL_KIND_LABEL: Record<GoalKind, string> = {
  car: msg("A car"),
  trip: msg("A trip"),
  home: msg("A home"),
  study: msg("Studies"),
  other: msg("Something else"),
};

export const PATHS = ["light", "balanced", "radical"] as const;
export type PathKey = (typeof PATHS)[number];
export const isPathKey = (value: unknown): value is PathKey => typeof value === "string" && (PATHS as readonly string[]).includes(value);

export const PATH_LABEL: Record<PathKey, string> = {
  light: msg("Light"),
  balanced: msg("Balanced"),
  radical: msg("Radical"),
};

export type Cut = { title: string; cents: number };

export type GoalPath = {
  key: PathKey;
  monthlyCents: number;
  /** Months until the goal is reached; null if it never is at this pace (or within 50 years). */
  months: number | null;
  /** The cuts this path relies on, largest first. */
  cuts: Cut[];
  /** Extra cut across flexible spending beyond the specific ideas (radical only). */
  extraCents: number;
};

/** Where money for a goal should wait, by how far away the goal is. */
export type Keep = "cash" | "bonds" | "mixed";

export function keepFor(months: number | null): Keep {
  if (months === null || months < 24) return "cash";
  if (months <= 60) return "bonds";
  return "mixed";
}

/**
 * Yearly returns used for goals. For savings in reais they are after
 * inflation, like the rest of the Brazilian plan.
 */
const RATE: Record<Region, Record<Keep, number>> = {
  eu: { cash: 0.02, bonds: 0.03, mixed: 0.045 },
  br: { cash: 0.045, bonds: 0.05, mixed: 0.055 },
};

export function rateFor(region: Region, keep: Keep): number {
  return RATE[region][keep];
}

/** Months to grow `saved` into `target` putting in `monthly` each month at a yearly `rate`. */
export function monthsTo(targetCents: number, savedCents: number, monthlyCents: number, rate: number): number | null {
  if (savedCents >= targetCents) return 0;
  if (monthlyCents <= 0 && rate <= 0) return null;
  const r = rate / 12;
  let balance = savedCents;
  for (let month = 1; month <= 600; month++) {
    balance = balance * (1 + r) + monthlyCents;
    if (balance >= targetCents) return month;
  }
  return null;
}

/** What has to go in each month to reach the target in `months`. */
export function monthlyNeeded(targetCents: number, savedCents: number, months: number, rate: number): number {
  if (savedCents >= targetCents) return 0;
  if (months <= 0) return targetCents - savedCents;
  const r = rate / 12;
  const grownSaved = savedCents * (1 + r) ** months;
  const factor = r === 0 ? months : ((1 + r) ** months - 1) / r;
  return Math.max(0, Math.ceil((targetCents - grownSaved) / factor));
}

/** Months to reach a goal, choosing the rate by its own horizon (a short goal earns cash rates). */
export function monthsAt(targetCents: number, savedCents: number, monthlyCents: number, region: Region): number | null {
  let months = monthsTo(targetCents, savedCents, monthlyCents, rateFor(region, "cash"));
  // Re-run with the rate of the horizon the first answer lands in, until it settles.
  for (let i = 0; i < 3; i++) {
    const next = monthsTo(targetCents, savedCents, monthlyCents, rateFor(region, keepFor(months)));
    if (next === months) break;
    months = next;
  }
  return months;
}

export type PathInput = {
  targetCents: number;
  savedCents: number;
  /** Left over each month after spending, investing and other goals; null when Arvo has no transactions. */
  availableCents: number | null;
  /** What the person said they can put aside, used when there are no transactions. */
  statedMonthlyCents?: number | null;
  /** Savings Arvo found in the transactions, in cents a month. */
  ideas: Cut[];
  /** Average monthly spending on flexible things (eating out, shopping, leisure...). */
  flexibleCents: number;
  region: Region;
};

/**
 * Light keeps today's habits and uses what is already left over. Balanced
 * acts on the biggest savings ideas up to half of what they are worth.
 * Radical acts on all of them and trims a further 15% off the rest of the
 * flexible spending.
 */
export function goalPaths(input: PathInput): GoalPath[] {
  const base = Math.max(0, input.availableCents ?? input.statedMonthlyCents ?? 0);
  const ideas = [...input.ideas].filter((idea) => idea.cents > 0).sort((a, b) => b.cents - a.cents);
  const allIdeas = ideas.reduce((sum, idea) => sum + idea.cents, 0);

  const half: Cut[] = [];
  let halfTotal = 0;
  for (const idea of ideas) {
    if (halfTotal >= allIdeas / 2) break;
    half.push(idea);
    halfTotal += idea.cents;
  }
  const extra = Math.round(0.15 * Math.max(0, input.flexibleCents - allIdeas));

  const make = (key: PathKey, monthlyCents: number, cuts: Cut[], extraCents = 0): GoalPath => ({
    key,
    monthlyCents,
    months: monthsAt(input.targetCents, input.savedCents, monthlyCents, input.region),
    cuts,
    extraCents,
  });
  return [make("light", base, []), make("balanced", base + halfTotal, half), make("radical", base + allIdeas + extra, ideas, extra)];
}

/** "2026-11" plus n months, as "yyyy-mm". */
export function monthAfter(ym: string, months: number): string {
  const [y, m] = ym.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/** Whole months from one "yyyy-mm" to another. */
export function monthsBetween(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}
