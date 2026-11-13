import { categoryLabel } from "./categories";
import { enT, type T } from "./i18n/core";
import {
  categoryTotals,
  completeMonths,
  findRecurring,
  monthlyAverages,
  needsWantsSplit,
  summarizeMonths,
  ymOf,
  type Tx,
} from "./spending";

/**
 * Savings insights computed directly from the transactions. These always
 * work, with or without an AI key; the AI layer (insights-ai.ts) rewrites
 * them into a more personal narrative when it is available.
 */

export type Insight = {
  id: string;
  title: string;
  body: string;
  /** Estimated monthly saving in cents if the person acts on it (0 = informational). */
  saveCents: number;
  category?: string;
};

export type InsightInput = {
  txs: Tx[];
  todayIso: string;
  /** Formats cents for display, e.g. (c) => "€12". */
  fmt: (cents: number) => string;
  /** Translator for the text; English when left out. */
  t?: T;
  /** Formats a whole percentage, e.g. (12) => "12%". */
  pctFmt?: (whole: number) => string;
};


export function buildInsights({ txs, todayIso, fmt, t = enT, pctFmt = (n) => `${n}%` }: InsightInput): Insight[] {
  const insights: Insight[] = [];
  const pct = (value: number) => pctFmt(Math.round(value * 100));
  const label = (category: string) => t(categoryLabel(category));
  const lower = (category: string) => label(category).toLowerCase();
  const averages = monthlyAverages(txs, todayIso, 3);
  if (!averages.months.length || averages.spending <= 0) return insights;

  const months = averages.months;
  const n = months.length;
  const totals = categoryTotals(txs, months);
  const perMonth = (cents: number) => Math.round(cents / n);
  const span = n === 1 ? t("last month") : t("the last {n} months", { n });

  // 1. Where most of the money goes.
  const top = totals.slice(0, 3);
  if (top.length) {
    const flexible = totals.find((t) => !["housing", "utilities"].includes(t.category));
    insights.push({
      id: "top-categories",
      title: t("{category} is your biggest cost", { category: label(top[0].category) }),
      body:
        t("Over {span}, {list} made up {share} of what you spent.", {
          span,
          list: top.map((row) => `${lower(row.category)} (${pct(row.share)})`).join(", "),
          share: pctFmt(top.reduce((sum, row) => sum + Math.round(row.share * 100), 0)),
        }) +
        (flexible && flexible.category !== top[0].category
          ? " " +
            t("Your largest flexible cost is {category} at about {amount} a month.", {
              category: lower(flexible.category),
              amount: fmt(perMonth(flexible.cents)),
            })
          : ""),
      saveCents: 0,
      category: top[0].category,
    });
  }

  // 2. Eating out next to groceries.
  const dining = totals.find((t) => t.category === "dining");
  const groceries = totals.find((t) => t.category === "groceries");
  if (dining && perMonth(dining.cents) >= 6000) {
    const food = dining.cents + (groceries?.cents ?? 0);
    const share = dining.cents / food;
    if (share >= 0.35) {
      const save = Math.round(perMonth(dining.cents) * 0.3);
      insights.push({
        id: "dining",
        title: t("Eating out takes a large share of your food budget"),
        body: t(
          "You spend about {amount} a month on restaurants, delivery and coffee across {count} purchases. That is {share} of everything you spend on food. Cooking for three of those meals out of ten would free up roughly {save} a month.",
          { amount: fmt(perMonth(dining.cents)), count: Math.round(dining.count / n), share: pct(share), save: fmt(save) },
        ),
        saveCents: save,
        category: "dining",
      });
    }
  }

  // 3. Subscriptions.
  const recurring = findRecurring(txs);
  const subs = recurring.filter((r) => r.category === "subscriptions");
  if (subs.length >= 2) {
    const total = subs.reduce((sum, r) => sum + r.monthlyCents, 0);
    const cheapestTwo = [...subs].sort((a, b) => a.monthlyCents - b.monthlyCents).slice(0, Math.min(2, subs.length - 1));
    const save = cheapestTwo.reduce((sum, r) => sum + r.monthlyCents, 0);
    insights.push({
      id: "subscriptions",
      title: t("{count} subscriptions cost you {amount} a year", { count: subs.length, amount: fmt(total * 12) }),
      body:
        `${subs.map((r) => `${r.merchant} (${fmt(r.monthlyCents)})`).join(", ")}. ` +
        t(
          cheapestTwo.length === 1
            ? "Together that is {total} every month. Cancelling the one you use least would save about {save} a month, and you can always re-subscribe for a month when something you want comes out."
            : "Together that is {total} every month. Cancelling the two you use least would save about {save} a month, and you can always re-subscribe for a month when something you want comes out.",
          { total: fmt(total), save: fmt(save) },
        ),
      saveCents: save,
      category: "subscriptions",
    });
  }

  // 4. A category that is running hot.
  const all = summarizeMonths(txs).map((m) => m.ym);
  const lastMonth = months[months.length - 1];
  const earlier = completeMonths(txs, todayIso).filter((ym) => ym < lastMonth).slice(-3);
  if (earlier.length >= 2 && all.includes(lastMonth)) {
    const now = categoryTotals(txs, [lastMonth]);
    const before = categoryTotals(txs, earlier);
    let best: { category: string; now: number; usual: number } | null = null;
    for (const row of now) {
      if (["housing", "travel"].includes(row.category)) continue;
      const usual = (before.find((b) => b.category === row.category)?.cents ?? 0) / earlier.length;
      const rise = row.cents - usual;
      if (usual > 0 && rise >= 4000 && row.cents >= usual * 1.25 && (!best || rise > best.now - best.usual)) {
        best = { category: row.category, now: row.cents, usual };
      }
    }
    if (best) {
      insights.push({
        id: "rising",
        title: t("{category} jumped last month", { category: label(best.category) }),
        body: t(
          "You spent {now} on {category} last month, against a usual {usual}. If that was a one-off, nothing to do. If it is becoming the new normal, going back to your usual level is worth {diff} a month.",
          {
            now: fmt(best.now),
            category: lower(best.category),
            usual: fmt(Math.round(best.usual)),
            diff: fmt(Math.round(best.now - best.usual)),
          },
        ),
        saveCents: Math.round((best.now - best.usual) * 0.5),
        category: best.category,
      });
    }
  }

  // 5. Small purchases that add up.
  const small = txs.filter(
    (tx) => months.includes(ymOf(tx.date)) && tx.amountCents < 0 && tx.amountCents > -700 && ["dining", "shopping", "other"].includes(tx.category),
  );
  if (small.length / n >= 8) {
    const total = perMonth(small.reduce((sum, tx) => sum - tx.amountCents, 0));
    insights.push({
      id: "small",
      title: t("Small purchases add up quietly"),
      body: t(
        "You make about {count} purchases under {limit} each month. They come to {total} a month, or {year} a year. Halving them is one of the least painful cuts there is.",
        { count: Math.round(small.length / n), limit: fmt(700), total: fmt(total), year: fmt(total * 12) },
      ),
      saveCents: Math.round(total * 0.5),
    });
  }

  // 6. Bank fees.
  const fees = totals.find((t) => t.category === "fees");
  if (fees && perMonth(fees.cents) >= 300) {
    insights.push({
      id: "fees",
      title: t("You are paying your bank to hold your money"),
      body: t(
        "Account and card fees cost you about {month} a month ({year} a year). Several banks offer a free current account; switching removes this cost entirely.",
        { month: fmt(perMonth(fees.cents)), year: fmt(perMonth(fees.cents) * 12) },
      ),
      saveCents: perMonth(fees.cents),
      category: "fees",
    });
  }

  // 7. The overall picture against 50/30/20.
  if (averages.income > 0) {
    const { needs, wants } = needsWantsSplit(txs, months);
    const left = averages.income - averages.spending;
    const rate = left / averages.income;
    if (rate < 0) {
      insights.push({
        id: "rate",
        title: t("You are spending more than you earn"),
        body: t(
          "On average you spend {spending} a month against {income} coming in. Before investing anything, the goal is to close that {gap} gap. The ideas above are the fastest way there.",
          { spending: fmt(averages.spending), income: fmt(averages.income), gap: fmt(-left) },
        ),
        saveCents: 0,
      });
    } else {
      insights.push({
        id: "rate",
        title:
          rate >= 0.2
            ? t("You keep {share} of your income", { share: pct(rate) })
            : t("You keep {share} of your income; 20% is a good target", { share: pct(rate) }),
        body:
          t(
            "Needs take {needs} of your income and wants {wants}, leaving {left} a month. A common rule of thumb is 50% needs, 30% wants, 20% saved or invested.",
            { needs: pct(needs / averages.income), wants: pct(wants / averages.income), left: fmt(left) },
          ) +
          (rate < 0.2
            ? " " + t("Getting to 20% means finding another {amount} a month.", { amount: fmt(Math.round(averages.income * 0.2 - left)) })
            : ""),
        saveCents: 0,
      });
    }
  }

  return insights;
}

export function totalPotentialSaving(insights: Insight[]): number {
  return insights.reduce((sum, insight) => sum + insight.saveCents, 0);
}
