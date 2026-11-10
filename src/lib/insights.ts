import { categoryLabel } from "./categories";
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
};

const pct = (value: number) => `${Math.round(value * 100)}%`;

export function buildInsights({ txs, todayIso, fmt }: InsightInput): Insight[] {
  const insights: Insight[] = [];
  const averages = monthlyAverages(txs, todayIso, 3);
  if (!averages.months.length || averages.spending <= 0) return insights;

  const months = averages.months;
  const n = months.length;
  const totals = categoryTotals(txs, months);
  const perMonth = (cents: number) => Math.round(cents / n);
  const span = n === 1 ? "last month" : `the last ${n} months`;

  // 1. Where most of the money goes.
  const top = totals.slice(0, 3);
  if (top.length) {
    const flexible = totals.find((t) => !["housing", "utilities"].includes(t.category));
    insights.push({
      id: "top-categories",
      title: `${categoryLabel(top[0].category)} is your biggest cost`,
      body:
        `Over ${span}, ${top.map((t) => `${categoryLabel(t.category).toLowerCase()} (${pct(t.share)})`).join(", ")} ` +
        `made up ${top.reduce((s, t) => s + Math.round(t.share * 100), 0)}% of what you spent.` +
        (flexible && flexible.category !== top[0].category
          ? ` Your largest flexible cost is ${categoryLabel(flexible.category).toLowerCase()} at about ${fmt(perMonth(flexible.cents))} a month.`
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
        title: "Eating out takes a large share of your food budget",
        body:
          `You spend about ${fmt(perMonth(dining.cents))} a month on restaurants, delivery and coffee across ` +
          `${Math.round(dining.count / n)} purchases. That is ${pct(share)} of everything you spend on food. ` +
          `Cooking for three of those meals out of ten would free up roughly ${fmt(save)} a month.`,
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
      title: `${subs.length} subscriptions cost you ${fmt(total * 12)} a year`,
      body:
        `${subs.map((r) => `${r.merchant} (${fmt(r.monthlyCents)})`).join(", ")}. ` +
        `Together that is ${fmt(total)} every month. Cancelling the ${cheapestTwo.length === 1 ? "one" : "two"} you use least ` +
        `would save about ${fmt(save)} a month, and you can always re-subscribe for a month when something you want comes out.`,
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
        title: `${categoryLabel(best.category)} jumped last month`,
        body:
          `You spent ${fmt(best.now)} on ${categoryLabel(best.category).toLowerCase()} last month, against a usual ` +
          `${fmt(Math.round(best.usual))}. If that was a one-off, nothing to do. If it is becoming the new normal, ` +
          `going back to your usual level is worth ${fmt(Math.round(best.now - best.usual))} a month.`,
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
      title: "Small purchases add up quietly",
      body:
        `You make about ${Math.round(small.length / n)} purchases under ${fmt(700)} each month. ` +
        `They come to ${fmt(total)} a month, or ${fmt(total * 12)} a year. Halving them is one of the least painful cuts there is.`,
      saveCents: Math.round(total * 0.5),
    });
  }

  // 6. Bank fees.
  const fees = totals.find((t) => t.category === "fees");
  if (fees && perMonth(fees.cents) >= 300) {
    insights.push({
      id: "fees",
      title: "You are paying your bank to hold your money",
      body:
        `Account and card fees cost you about ${fmt(perMonth(fees.cents))} a month (${fmt(perMonth(fees.cents) * 12)} a year). ` +
        `Several banks offer a free current account; switching removes this cost entirely.`,
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
        title: "You are spending more than you earn",
        body:
          `On average you spend ${fmt(averages.spending)} a month against ${fmt(averages.income)} coming in. ` +
          `Before investing anything, the goal is to close that ${fmt(-left)} gap. The ideas above are the fastest way there.`,
        saveCents: 0,
      });
    } else {
      insights.push({
        id: "rate",
        title: rate >= 0.2 ? `You keep ${pct(rate)} of your income` : `You keep ${pct(rate)} of your income; 20% is a good target`,
        body:
          `Needs take ${pct(needs / averages.income)} of your income and wants ${pct(wants / averages.income)}, ` +
          `leaving ${fmt(left)} a month. A common rule of thumb is 50% needs, 30% wants, 20% saved or invested.` +
          (rate < 0.2 ? ` Getting to 20% means finding another ${fmt(Math.round(averages.income * 0.2 - left))} a month.` : ""),
        saveCents: 0,
      });
    }
  }

  return insights;
}

export function totalPotentialSaving(insights: Insight[]): number {
  return insights.reduce((sum, insight) => sum + insight.saveCents, 0);
}
