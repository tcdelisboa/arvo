import { msg } from "./i18n/core";

/**
 * Investor profile: the questionnaire and how it is scored.
 *
 * Two things are measured separately, as regulators and textbooks both do:
 *  - capacity: how much risk the person's situation can absorb
 *    (time horizon, age, safety net, income stability, debt)
 *  - tolerance: how much risk the person is comfortable living with
 *    (reaction to losses, preferred trade-off, goal, experience)
 *
 * The lower of the two dominates, and a few hard limits apply on top, because
 * someone who needs the money in two years should not hold mostly shares no
 * matter how brave they feel.
 */

export type Choice = { value: string; label: string; hint?: string };
/** A range of outcomes over one year, as multiples of the amount invested (0.98 = lost 2%). */
export type RangeChoice = Choice & { range: [number, number] };

export const HORIZON: Choice[] = [
  { value: "lt3", label: msg("Less than 3 years") },
  { value: "3to5", label: msg("3 to 5 years") },
  { value: "5to10", label: msg("5 to 10 years") },
  { value: "10to20", label: msg("10 to 20 years") },
  { value: "gt20", label: msg("More than 20 years") },
];

export const BUFFER: Choice[] = [
  { value: "none", label: msg("No, not yet") },
  { value: "lt3", label: msg("Less than 3 months of expenses") },
  { value: "3to6", label: msg("3 to 6 months of expenses") },
  { value: "gt6", label: msg("More than 6 months of expenses") },
];

export const DEBT: Choice[] = [
  { value: "no", label: msg("No") },
  { value: "yes", label: msg("Yes"), hint: msg("Credit cards, overdraft or consumer loans") },
];

export const STABILITY: Choice[] = [
  { value: "low", label: msg("It varies a lot"), hint: msg("Freelance, commission, seasonal") },
  { value: "medium", label: msg("Fairly steady") },
  { value: "high", label: msg("Very steady"), hint: msg("Permanent contract or similar") },
];

export const EXPERIENCE: Choice[] = [
  { value: "none", label: msg("I have never invested") },
  { value: "some", label: msg("I have held funds or ETFs") },
  { value: "stocks", label: msg("I pick individual shares myself") },
  { value: "advanced", label: msg("I invest actively and follow markets closely") },
];

export const REACTION: Choice[] = [
  { value: "sell", label: msg("Sell everything to stop the losses") },
  { value: "trim", label: msg("Sell some of it") },
  { value: "hold", label: msg("Do nothing and wait") },
  { value: "buy", label: msg("Invest more while prices are lower") },
];

export const TRADEOFF: RangeChoice[] = [
  { value: "a", label: msg("Calm: it barely moves"), range: [0.98, 1.04] },
  { value: "b", label: msg("Gentle: small ups and downs"), range: [0.92, 1.1] },
  { value: "c", label: msg("Bumpy: some years clearly up or down"), range: [0.82, 1.22] },
  { value: "d", label: msg("Rollercoaster: big years both ways"), range: [0.65, 1.45] },
];

export const GOAL: Choice[] = [
  { value: "preserve", label: msg("Keep what I have safe from inflation") },
  { value: "steady", label: msg("Grow steadily without big swings") },
  { value: "growth", label: msg("Grow over the long term; swings are fine") },
  { value: "max", label: msg("Maximise growth, whatever the swings") },
];

export type Answers = {
  age: number;
  monthlyIncome: number; // cents
  horizon: string;
  buffer: string;
  debt: string;
  stability: string;
  experience: string;
  reaction: string;
  tradeoff: string;
  goal: string;
};

export type Level = 1 | 2 | 3 | 4 | 5;

export const PROFILES: Record<Level, { name: string; summary: string }> = {
  1: {
    name: msg("Conservative"),
    summary: msg("Protecting what you have comes first. Most of the plan sits in bonds and cash-like funds, with a small share in stocks for growth."),
  },
  2: {
    name: msg("Cautious"),
    summary: msg("You want growth but not at the cost of sleep. The plan balances stocks against a large cushion of bonds."),
  },
  3: {
    name: msg("Balanced"),
    summary: msg("You accept ups and downs in exchange for growth. Stocks lead, bonds steady the ride."),
  },
  4: {
    name: msg("Growth"),
    summary: msg("You have time and the nerve to sit through falls. Most of the plan is in stocks."),
  },
  5: {
    name: msg("Ambitious"),
    summary: msg("You are investing for the long run and want as much growth as a diversified plan allows. Nearly everything is in stocks."),
  },
};

const score = (map: Record<string, number>, key: string, fallback = 0) => map[key] ?? fallback;

export type RiskResult = {
  capacity: number;
  tolerance: number;
  score: number;
  level: Level;
  /** Plain-language reasons the result was limited, shown to the person. */
  limits: string[];
};

export function scoreRisk(a: Answers): RiskResult {
  // Capacity (0-100)
  const horizon = score({ lt3: 5, "3to5": 30, "5to10": 60, "10to20": 85, gt20: 100 }, a.horizon);
  const age = a.age <= 30 ? 100 : a.age <= 40 ? 85 : a.age <= 50 ? 65 : a.age <= 60 ? 40 : 20;
  const buffer = score({ none: 10, lt3: 45, "3to6": 80, gt6: 100 }, a.buffer);
  const stability = score({ low: 35, medium: 70, high: 100 }, a.stability);
  const debt = a.debt === "yes" ? 20 : 100;
  const capacity = Math.round(horizon * 0.4 + age * 0.15 + buffer * 0.2 + stability * 0.15 + debt * 0.1);

  // Tolerance (0-100)
  const reaction = score({ sell: 0, trim: 35, hold: 70, buy: 100 }, a.reaction);
  const tradeoff = score({ a: 5, b: 40, c: 75, d: 100 }, a.tradeoff);
  const goal = score({ preserve: 10, steady: 40, growth: 75, max: 100 }, a.goal);
  const experience = score({ none: 30, some: 60, stocks: 80, advanced: 100 }, a.experience);
  const tolerance = Math.round(reaction * 0.35 + tradeoff * 0.3 + goal * 0.2 + experience * 0.15);

  let result = Math.round(Math.min(capacity, tolerance) * 0.7 + Math.max(capacity, tolerance) * 0.3);

  const limits: string[] = [];
  const cap = (max: number, reason: string) => {
    if (result > max) {
      result = max;
      limits.push(reason);
    }
  };
  if (a.horizon === "lt3") cap(24, msg("You need the money within three years, so the plan stays conservative. Stocks can take longer than that to recover from a fall."));
  else if (a.horizon === "3to5") cap(44, msg("With three to five years to invest, the plan is capped at Cautious."));
  if (a.debt === "yes") cap(44, msg("You have high-interest debt. Paying it off is a guaranteed return, so the plan stays cautious until it is gone."));
  if (a.buffer === "none") cap(64, msg("You don't have an emergency fund yet, so the plan stops at Balanced. A safety net keeps you from selling at a bad moment."));
  if (a.reaction === "sell") cap(44, msg("You said you would sell after a sharp fall. A calmer plan is one you are more likely to stick with."));

  const level: Level = result < 25 ? 1 : result < 45 ? 2 : result < 65 ? 3 : result < 83 ? 4 : 5;
  return { capacity, tolerance, score: result, level, limits };
}

export function validateAnswers(raw: Record<string, unknown>): { ok: true; answers: Answers } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const age = Number(raw.age);
  if (!Number.isInteger(age) || age < 18 || age > 100) errors.age = msg("Enter your age (18 or over).");
  const monthlyIncome = Number(raw.monthlyIncome);
  if (!Number.isFinite(monthlyIncome) || monthlyIncome <= 0) errors.monthlyIncome = msg("Enter what you earn in a typical month, after tax.");

  const pickFrom = (field: keyof Answers, choices: Choice[], message: string) => {
    const value = String(raw[field] ?? "");
    if (!choices.some((choice) => choice.value === value)) errors[field] = message;
    return value;
  };
  const answers: Answers = {
    age,
    monthlyIncome: Math.round(monthlyIncome),
    horizon: pickFrom("horizon", HORIZON, msg("Choose how long you plan to invest for.")),
    buffer: pickFrom("buffer", BUFFER, msg("Choose the option closest to your situation.")),
    debt: pickFrom("debt", DEBT, msg("Choose yes or no.")),
    stability: pickFrom("stability", STABILITY, msg("Choose the option closest to your situation.")),
    experience: pickFrom("experience", EXPERIENCE, msg("Choose the option closest to your experience.")),
    reaction: pickFrom("reaction", REACTION, msg("Choose what you would most likely do.")),
    tradeoff: pickFrom("tradeoff", TRADEOFF, msg("Choose the range you would be comfortable with.")),
    goal: pickFrom("goal", GOAL, msg("Choose your main goal.")),
  };
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, answers };
}
