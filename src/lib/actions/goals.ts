"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "../auth";
import { q, q1 } from "../db";
import { parseAmountToCents, todayIso } from "../format";
import { getGoal, lastDeposit } from "../goals-data";
import { msg } from "../i18n/core";
import { GOAL_KIND_LABEL, isGoalKind, isPathKey, monthsBetween } from "../savings-goals";
import { getI18n } from "../i18n/server";
import { FREE_GOALS } from "../plan";

export type GoalFormState = { error?: string; fields?: Record<string, string> } | null;

function refresh() {
  for (const path of ["/goals", "/overview"]) revalidatePath(path);
}

export async function createGoal(_prev: GoalFormState, formData: FormData): Promise<GoalFormState> {
  const user = await requireUser();
  const { t } = await getI18n();
  const kind = formData.get("kind");
  const fields: Record<string, string> = {};
  if (!isGoalKind(kind)) fields.kind = msg("Choose what you are saving for.");
  const target = parseAmountToCents(String(formData.get("target") ?? ""));
  if (target === null || target <= 0 || target > 1_000_000_000_00) fields.target = msg("Enter how much it costs.");
  const savedRaw = String(formData.get("saved") ?? "").trim();
  const saved = savedRaw ? parseAmountToCents(savedRaw) : 0;
  if (saved === null || saved < 0) fields.saved = msg("Enter what you already have, or leave it empty.");
  const dateRaw = String(formData.get("date") ?? "").trim();
  // A month picker sends "2028-12"; browsers without one may get "12/2028" typed in.
  const slash = dateRaw.match(/^(\d{1,2})\s*[/.-]\s*(\d{4})$/);
  const targetYm = dateRaw ? (slash ? `${slash[2]}-${slash[1].padStart(2, "0")}` : dateRaw.slice(0, 7)) : null;
  if (targetYm && (!/^\d{4}-\d{2}$/.test(targetYm) || monthsBetween(todayIso().slice(0, 7), targetYm) < 1)) {
    fields.date = msg("Pick a month from next month on, or leave it empty.");
  }
  if (Object.keys(fields).length) return { fields };

  if (user.plan !== "plus") {
    const open = await q1<{ n: number }>("SELECT count(*)::int AS n FROM goals WHERE user_id = $1 AND done_at IS NULL", [user.id]);
    if ((open?.n ?? 0) >= FREE_GOALS) return { error: msg("Free keeps one goal open at a time. Finish or remove it, or get Plus for as many goals as you like.") };
  }

  // Without transactions, the person says what they can put aside; that becomes the light path.
  const statedRaw = String(formData.get("monthly") ?? "").trim();
  const stated = statedRaw ? parseAmountToCents(statedRaw) : null;
  const name = (String(formData.get("name") ?? "").trim() || t(GOAL_KIND_LABEL[kind as keyof typeof GOAL_KIND_LABEL])).slice(0, 60);
  const id = randomUUID();
  await q(
    "INSERT INTO goals (id, user_id, kind, name, target_cents, saved_cents, target_ym, path, monthly_cents) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
    [id, user.id, kind, name, target, saved, targetYm, stated && stated > 0 ? "light" : null, stated && stated > 0 ? stated : null],
  );
  refresh();
  redirect(`/goals#goal-${id}`);
}

/** Commit to one of the three paths: that monthly amount becomes the plan for this goal. */
export async function choosePath(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("goal") ?? "");
  const path = formData.get("path");
  const monthly = Number(formData.get("monthly"));
  // "date" is the amount that reaches the goal by the month the person chose.
  if (!(isPathKey(path) || path === "date") || !Number.isFinite(monthly) || monthly < 0) return;
  await q("UPDATE goals SET path = $1, monthly_cents = $2 WHERE id = $3 AND user_id = $4", [path, Math.round(monthly), id, user.id]);
  refresh();
}

/** Money put towards the goal. Reaching the target marks it done. */
export async function depositToGoal(formData: FormData): Promise<void> {
  const user = await requireUser();
  const goal = await getGoal(user.id, String(formData.get("goal") ?? ""));
  const cents = parseAmountToCents(String(formData.get("amount") ?? ""));
  if (!goal || cents === null || cents === 0 || Math.abs(cents) > 1_000_000_000_00) return;
  await q("INSERT INTO goal_deposits (id, goal_id, user_id, amount_cents) VALUES ($1, $2, $3, $4)", [randomUUID(), goal.id, user.id, cents]);
  const saved = Math.max(0, goal.savedCents + cents);
  await q("UPDATE goals SET saved_cents = $1, done_at = CASE WHEN $1 >= target_cents THEN COALESCE(done_at, now()) ELSE NULL END WHERE id = $2", [saved, goal.id]);
  refresh();
}

export async function undoGoalDeposit(formData: FormData): Promise<void> {
  const user = await requireUser();
  const goal = await getGoal(user.id, String(formData.get("goal") ?? ""));
  if (!goal) return;
  const last = await lastDeposit(goal.id);
  if (!last) return;
  await q("DELETE FROM goal_deposits WHERE id = $1", [last.id]);
  const saved = Math.max(0, goal.savedCents - last.cents);
  await q("UPDATE goals SET saved_cents = $1, done_at = CASE WHEN $1 >= target_cents THEN done_at ELSE NULL END WHERE id = $2", [saved, goal.id]);
  refresh();
}

export async function deleteGoal(formData: FormData): Promise<void> {
  const user = await requireUser();
  await q("DELETE FROM goals WHERE id = $1 AND user_id = $2", [String(formData.get("goal") ?? ""), user.id]);
  refresh();
}
