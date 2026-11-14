import "server-only";
import { categoryLabel, isCategory, CATEGORIES } from "./categories";
import type { Insight } from "./insights";
import { getProfile, listTransactions } from "./data";
import { q, q1 } from "./db";
import { todayIso } from "./format";
import type { T } from "./i18n/core";
import { buildInsights } from "./insights";
import { regionFor, type Region } from "./portfolio";
import type { Cut, GoalKind, PathKey } from "./savings-goals";
import { categoryTotals, monthlyAverages } from "./spending";

export type Goal = {
  id: string;
  kind: GoalKind;
  name: string;
  targetCents: number;
  savedCents: number;
  targetYm: string | null;
  path: PathKey | "date" | null;
  monthlyCents: number | null;
  createdAt: string;
  done: boolean;
};

type Row = {
  id: string;
  kind: GoalKind;
  name: string;
  target_cents: number | string;
  saved_cents: number | string;
  target_ym: string | null;
  path: PathKey | "date" | null;
  monthly_cents: number | null;
  created_at: string | Date;
  done_at: string | Date | null;
};

const toGoal = (row: Row): Goal => ({
  id: row.id,
  kind: row.kind,
  name: row.name,
  targetCents: Number(row.target_cents),
  savedCents: Number(row.saved_cents),
  targetYm: row.target_ym,
  path: row.path,
  monthlyCents: row.monthly_cents == null ? null : Number(row.monthly_cents),
  createdAt: new Date(row.created_at).toISOString(),
  done: row.done_at != null,
});

export async function listGoals(userId: string): Promise<Goal[]> {
  const rows = await q<Row>("SELECT * FROM goals WHERE user_id = $1 ORDER BY done_at NULLS FIRST, created_at", [userId]);
  return rows.map(toGoal);
}

export async function getGoal(userId: string, id: string): Promise<Goal | null> {
  const row = await q1<Row>("SELECT * FROM goals WHERE id = $1 AND user_id = $2", [id, userId]);
  return row ? toGoal(row) : null;
}

export async function lastDeposit(goalId: string): Promise<{ id: string; cents: number } | null> {
  const row = await q1<{ id: string; amount_cents: number }>(
    "SELECT id, amount_cents FROM goal_deposits WHERE goal_id = $1 ORDER BY created_at DESC LIMIT 1",
    [goalId],
  );
  return row ? { id: row.id, cents: Number(row.amount_cents) } : null;
}

/** A savings idea as a short action, for the list under each path. */
function cutLabel(insight: Insight, t: T): string {
  switch (insight.id) {
    case "dining":
      return t("Eat out less, cook more");
    case "subscriptions":
      return t("Cancel the subscriptions you use least");
    case "small":
      return t("Halve the small purchases");
    case "fees":
      return t("Move to a free bank account");
    case "rising":
      return insight.category ? t("Bring {category} back to normal", { category: t(categoryLabel(insight.category)).toLowerCase() }) : insight.title;
    default:
      return insight.title;
  }
}

export type GoalContext = {
  region: Region;
  /** True when Arvo has transactions to work from. */
  hasSpending: boolean;
  /** Average income minus spending, minus the monthly investing plan. Null without transactions. */
  leftOverCents: number | null;
  investingCents: number;
  ideas: Cut[];
  flexibleCents: number;
  /** Average monthly spending and income, for the emergency fund check. */
  spendingCents: number | null;
  incomeCents: number | null;
  stability: string | null;
};

/** What the goal paths are built from: money left over, the savings ideas and flexible spending. */
export async function goalContext(userId: string, currency: string, t: T, fmt: (cents: number) => string): Promise<GoalContext> {
  const [txs, profile] = await Promise.all([listTransactions(userId), getProfile(userId)]);
  const today = todayIso();
  const averages = monthlyAverages(txs, today, 3);
  const hasSpending = averages.months.length > 0 && averages.spending > 0;
  const investingCents = profile?.monthlyCents ?? 0;
  const ideas = hasSpending
    ? buildInsights({ txs, todayIso: today, fmt, t })
        .filter((insight) => insight.saveCents > 0)
        .map((insight) => ({ title: cutLabel(insight, t), cents: insight.saveCents }))
    : [];
  const flexibleCents = hasSpending
    ? Math.round(
        categoryTotals(txs, averages.months)
          .filter((row) => isCategory(row.category) && CATEGORIES[row.category].group === "wants")
          .reduce((sum, row) => sum + row.cents, 0) / averages.months.length,
      )
    : 0;
  return {
    region: regionFor(currency),
    hasSpending,
    leftOverCents: hasSpending ? averages.income - averages.spending - investingCents : null,
    investingCents,
    ideas,
    flexibleCents,
    spendingCents: hasSpending ? averages.spending : null,
    incomeCents: profile?.answers.monthlyIncome ?? (averages.income > 0 ? averages.income : null),
    stability: profile?.answers.stability ?? null,
  };
}
