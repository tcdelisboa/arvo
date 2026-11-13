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
  { value: "lt3", label: "Less than 3 years" },
  { value: "3to5", label: "3 to 5 years" },
  { value: "5to10", label: "5 to 10 years" },
  { value: "10to20", label: "10 to 20 years" },
  { value: "gt20", label: "More than 20 years" },
];

export const BUFFER: Choice[] = [
  { value: "none", label: "No, not yet" },
  { value: "lt3", label: "Less than 3 months of expenses" },
  { value: "3to6", label: "3 to 6 months of expenses" },
  { value: "gt6", label: "More than 6 months of expenses" },
];

export const DEBT: Choice[] = [
  { value: "no", label: "No" },
  { value: "yes", label: "Yes", hint: "Credit cards, overdraft or consumer loans" },
];

export const STABILITY: Choice[] = [
  { value: "low", label: "It varies a lot", hint: "Freelance, commission, seasonal" },
  { value: "medium", label: "Fairly steady" },
  { value: "high", label: "Very steady", hint: "Permanent contract or similar" },
];

export const EXPERIENCE: Choice[] = [
  { value: "none", label: "I have never invested" },
  { value: "some", label: "I have held funds or ETFs" },
  { value: "stocks", label: "I pick individual shares myself" },
  { value: "advanced", label: "I invest actively and follow markets closely" },
];

export const REACTION: Choice[] = [
  { value: "sell", label: "Sell everything to stop the losses" },
  { value: "trim", label: "Sell some of it" },
  { value: "hold", label: "Do nothing and wait" },
  { value: "buy", label: "Invest more while prices are lower" },
];

export const TRADEOFF: RangeChoice[] = [
  { value: "a", label: "Calm: it barely moves", range: [0.98, 1.04] },
  { value: "b", label: "Gentle: small ups and downs", range: [0.92, 1.1] },
  { value: "c", label: "Bumpy: some years clearly up or down", range: [0.82, 1.22] },
  { value: "d", label: "Rollercoaster: big years both ways", range: [0.65, 1.45] },
];

export const GOAL: Choice[] = [
  { value: "preserve", label: "Keep what I have safe from inflation" },
  { value: "steady", label: "Grow steadily without big swings" },
  { value: "growth", label: "Grow over the long term; swings are fine" },
  { value: "max", label: "Maximise growth, whatever the swings" },
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
    name: "Conservative",
    summary: "Protecting what you have comes first. Most of the plan sits in bonds and cash-like funds, with a small share in stocks for growth.",
  },
  2: {
    name: "Cautious",
    summary: "You want growth but not at the cost of sleep. The plan balances stocks against a large cushion of bonds.",
  },
  3: {
    name: "Balanced",
    summary: "You accept ups and downs in exchange for growth. Stocks lead, bonds steady the ride.",
  },
  4: {
    name: "Growth",
    summary: "You have time and the nerve to sit through falls. Most of the plan is in stocks.",
  },
  5: {
    name: "Ambitious",
    summary: "You are investing for the long run and want as much growth as a diversified plan allows. Nearly everything is in stocks.",
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
  if (a.horizon === "lt3") cap(24, "You need the money within three years, so the plan stays conservative. Stocks can take longer than that to recover from a fall.");
  else if (a.horizon === "3to5") cap(44, "With three to five years to invest, the plan is capped at Cautious.");
  if (a.debt === "yes") cap(44, "You have high-interest debt. Paying it off is a guaranteed return, so the plan stays cautious until it is gone.");
  if (a.buffer === "none") cap(64, "You don't have an emergency fund yet, so the plan stops at Balanced. A safety net keeps you from selling at a bad moment.");
  if (a.reaction === "sell") cap(44, "You said you would sell after a sharp fall. A calmer plan is one you are more likely to stick with.");

  const level: Level = result < 25 ? 1 : result < 45 ? 2 : result < 65 ? 3 : result < 83 ? 4 : 5;
  return { capacity, tolerance, score: result, level, limits };
}

export function validateAnswers(raw: Record<string, unknown>): { ok: true; answers: Answers } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const age = Number(raw.age);
  if (!Number.isInteger(age) || age < 18 || age > 100) errors.age = "Enter your age (18 or over).";
  const monthlyIncome = Number(raw.monthlyIncome);
  if (!Number.isFinite(monthlyIncome) || monthlyIncome <= 0) errors.monthlyIncome = "Enter what you earn in a typical month, after tax.";

  const pickFrom = (field: keyof Answers, choices: Choice[], message: string) => {
    const value = String(raw[field] ?? "");
    if (!choices.some((choice) => choice.value === value)) errors[field] = message;
    return value;
  };
  const answers: Answers = {
    age,
    monthlyIncome: Math.round(monthlyIncome),
    horizon: pickFrom("horizon", HORIZON, "Choose how long you plan to invest for."),
    buffer: pickFrom("buffer", BUFFER, "Choose the option closest to your situation."),
    debt: pickFrom("debt", DEBT, "Choose yes or no."),
    stability: pickFrom("stability", STABILITY, "Choose the option closest to your situation."),
    experience: pickFrom("experience", EXPERIENCE, "Choose the option closest to your experience."),
    reaction: pickFrom("reaction", REACTION, "Choose what you would most likely do."),
    tradeoff: pickFrom("tradeoff", TRADEOFF, "Choose the range you would be comfortable with."),
    goal: pickFrom("goal", GOAL, "Choose your main goal."),
  };
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, answers };
}
