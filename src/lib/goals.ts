import { msg } from "./i18n/core";

/** What a person says they came for, asked once on the welcome screen. */
export const GOALS = [
  {
    id: "spending",
    title: msg("See where my money goes"),
    text: msg("Sort every payment into categories and find the big costs."),
    short: msg("Track spending"),
  },
  {
    id: "saving",
    title: msg("Spend less and save more"),
    text: msg("Spot the regular payments and habits worth cutting."),
    short: msg("Save more"),
  },
  {
    id: "investing",
    title: msg("Start investing"),
    text: msg("Find out what kind of investor I am and what a suitable portfolio looks like."),
    short: msg("Start investing"),
  },
  {
    id: "learning",
    title: msg("Understand shares and funds"),
    text: msg("Look up companies and funds and read what they are in plain words."),
    short: msg("Learn about markets"),
  },
] as const;

export type Goal = (typeof GOALS)[number]["id"];

export function isGoal(value: unknown): value is Goal {
  return GOALS.some((goal) => goal.id === value);
}

export function goalLabel(value: unknown): string | null {
  return GOALS.find((goal) => goal.id === value)?.short ?? null;
}

/** Whether the goal needs the person's own transactions to be useful. */
export function needsTransactions(goal: Goal): boolean {
  return goal === "spending" || goal === "saving";
}
