import "server-only";
import { q, q1 } from "./db";
import type { MonthTotal } from "./progress";

/** Money invested per month, as the person logged it. */
export async function contributionTotals(userId: string, fromYm = "0000-00"): Promise<MonthTotal[]> {
  const rows = await q<{ ym: string; cents: number }>(
    "SELECT ym, sum(amount_cents)::int AS cents FROM contributions WHERE user_id = $1 AND ym >= $2 GROUP BY ym ORDER BY ym",
    [userId, fromYm],
  );
  return rows.map((row) => ({ ym: row.ym, cents: Number(row.cents) }));
}

export async function lastContribution(userId: string): Promise<{ id: string; ym: string; cents: number } | null> {
  const row = await q1<{ id: string; ym: string; amount_cents: number }>(
    "SELECT id, ym, amount_cents FROM contributions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
    [userId],
  );
  return row ? { id: row.id, ym: row.ym, cents: Number(row.amount_cents) } : null;
}

export async function getTracking(userId: string): Promise<{ emergencyCents: number | null; monthlyEmail: boolean }> {
  const row = await q1<{ emergency_cents: number | null; monthly_email: boolean }>(
    "SELECT emergency_cents, monthly_email FROM users WHERE id = $1",
    [userId],
  );
  return {
    emergencyCents: row?.emergency_cents == null ? null : Number(row.emergency_cents),
    monthlyEmail: row ? !!row.monthly_email : true,
  };
}
