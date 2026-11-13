"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireUser } from "../auth";
import { q } from "../db";
import { parseAmountToCents, todayIso } from "../format";
import { addMonths } from "../spending";
import { lastContribution } from "../tracking";

function refresh() {
  for (const path of ["/overview", "/portfolio", "/settings"]) revalidatePath(path);
}

/** Log money actually invested in a month (this month or one of the two before). */
export async function addContribution(formData: FormData): Promise<void> {
  const user = await requireUser();
  const cents = parseAmountToCents(String(formData.get("amount") ?? ""));
  if (cents === null || cents <= 0 || cents > 100_000_000_00) return;
  const current = todayIso().slice(0, 7);
  const allowed = [current, addMonths(current, -1), addMonths(current, -2)];
  const ym = String(formData.get("ym") ?? current);
  if (!allowed.includes(ym)) return;
  await q("INSERT INTO contributions (id, user_id, ym, amount_cents) VALUES ($1, $2, $3, $4)", [randomUUID(), user.id, ym, cents]);
  refresh();
}

/** Undo the most recent entry, for typos. */
export async function undoContribution(): Promise<void> {
  const user = await requireUser();
  const last = await lastContribution(user.id);
  if (last) await q("DELETE FROM contributions WHERE id = $1 AND user_id = $2", [last.id, user.id]);
  refresh();
}

/** How much is already in the emergency fund. */
export async function setEmergencySaved(formData: FormData): Promise<void> {
  const user = await requireUser();
  const cents = parseAmountToCents(String(formData.get("saved") ?? ""));
  if (cents === null || cents < 0) return;
  await q("UPDATE users SET emergency_cents = $1 WHERE id = $2", [Math.min(cents, 2_000_000_000), user.id]);
  refresh();
}

export async function setMonthlyEmail(formData: FormData): Promise<void> {
  const user = await requireUser();
  await q("UPDATE users SET monthly_email = $1 WHERE id = $2", [formData.get("on") === "yes", user.id]);
  refresh();
}
