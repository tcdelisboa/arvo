/**
 * How much to invest each month.
 *
 * Starts from what is actually left over (income minus average spending) and
 * holds part of it back while the person has no safety net or carries
 * expensive debt. Every step is explained, never just a number.
 */

import { enT, type T } from "./i18n/core";

export type RecommendInput = {
  incomeCents: number;
  /** Average monthly spending from transactions, or null when unknown. */
  spendingCents: number | null;
  buffer: string; // none | lt3 | 3to6 | gt6
  debt: string; // yes | no
};

export type Recommendation = {
  amountCents: number;
  surplusCents: number | null;
  /** Share of the surplus that goes to investing. */
  share: number;
  reasons: string[];
  /** Where the rest of the surplus should go first, if anywhere. */
  first?: string;
};

const roundTo = (cents: number, step: number) => Math.floor(cents / step) * step;

export function recommendMonthly(input: RecommendInput, fmt: (cents: number) => string, t: T = enT): Recommendation {
  const { incomeCents, spendingCents, buffer, debt } = input;
  const reasons: string[] = [];

  // Without spending data, fall back to a share of income.
  if (spendingCents === null) {
    const base = debt === "yes" ? 0 : buffer === "none" ? 0.05 : buffer === "lt3" ? 0.08 : 0.15;
    const amount = roundTo(incomeCents * base, 500);
    reasons.push(t("We don't have your spending yet, so this is a share of your income rather than of what is actually left over. Add your transactions for a sharper number."));
    if (debt === "yes") reasons.push(t("Clear high-interest debt before investing. Card interest costs more than markets usually return."));
    else if (buffer === "none" || buffer === "lt3") reasons.push(t("Most of your spare money should build an emergency fund first."));
    return { amountCents: amount, surplusCents: null, share: base, reasons };
  }

  const surplus = incomeCents - spendingCents;
  if (surplus <= 0) {
    reasons.push(
      t("You spend about {spending} a month against {income} coming in, so there is nothing spare to invest yet.", {
        spending: fmt(spendingCents),
        income: fmt(incomeCents),
      }),
      t("Start with the savings ideas on the Spending page. Even a small surplus is enough to begin."),
    );
    return { amountCents: 0, surplusCents: surplus, share: 0, reasons };
  }

  reasons.push(t("After your usual spending of {spending}, about {surplus} a month is left over.", { spending: fmt(spendingCents), surplus: fmt(surplus) }));

  let share: number;
  let first: string | undefined;
  if (debt === "yes") {
    share = 0;
    first = t("Pay down high-interest debt");
    reasons.push(t("You have high-interest debt. Paying it off is a guaranteed return that investing can't match, so put the surplus there first and come back when it is cleared."));
  } else if (buffer === "none") {
    share = 0.25;
    first = t("Build an emergency fund");
    reasons.push(t("You don't have an emergency fund yet. Put about three quarters of the surplus into easy-access savings until it covers three months of expenses, and invest the rest so the habit starts now."));
  } else if (buffer === "lt3") {
    share = 0.5;
    first = t("Top up your emergency fund");
    reasons.push(t("Your emergency fund covers less than three months, so half the surplus keeps building it and half is invested."));
  } else if (buffer === "3to6") {
    share = 0.7;
    reasons.push(t("Your emergency fund is in place, so most of the surplus can be invested. The rest stays free for irregular costs."));
  } else {
    share = 0.8;
    reasons.push(t("With more than six months of expenses set aside, most of the surplus can go to work. A fifth stays free for irregular costs."));
  }

  let amount = surplus * share;
  const ceiling = incomeCents * 0.4;
  if (amount > ceiling) {
    amount = ceiling;
    reasons.push(t("We cap the suggestion at 40% of income so the plan survives an expensive month."));
  }
  const step = amount >= 20000 ? 2500 : amount >= 5000 ? 1000 : 500;
  return { amountCents: roundTo(amount, step), surplusCents: surplus, share, reasons, first };
}
