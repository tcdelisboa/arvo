"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { destroySession, requireUser } from "../auth";
import { q, q1 } from "../db";
import { hashPassword, verifyPassword } from "../crypto";
import { removeItem } from "../plaid";

export type SettingsState = { error?: string; ok?: string } | null;

export async function updateName(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 80) return { error: "Enter your name." };
  await q("UPDATE users SET name = $1 WHERE id = $2", [name, user.id]);
  revalidatePath("/", "layout");
  return { ok: "Name saved." };
}

export async function changePassword(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  if (next.length < 10) return { error: "Use at least 10 characters for the new password." };
  if (next.length > 200) return { error: "Use 200 characters or fewer." };
  const row = await q1<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = $1", [user.id]);
  if (!row || !(await verifyPassword(current, row.password_hash))) return { error: "Your current password is not right." };
  await q("UPDATE users SET password_hash = $1 WHERE id = $2", [await hashPassword(next), user.id]);
  return { ok: "Password changed." };
}

/** Permanently delete the account and everything attached to it. */
export async function deleteAccount(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireUser();
  const password = String(formData.get("password") ?? "");
  const row = await q1<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = $1", [user.id]);
  if (!row || !(await verifyPassword(password, row.password_hash))) return { error: "That password is not right. Nothing was deleted." };

  // Revoke bank access at the provider before the tokens disappear.
  const items = await q<{ id: string }>("SELECT id FROM bank_items WHERE user_id = $1", [user.id]);
  for (const item of items) await removeItem(user.id, item.id);

  await destroySession();
  // Every table references users with ON DELETE CASCADE.
  await q("DELETE FROM users WHERE id = $1", [user.id]);
  await q("DELETE FROM cache WHERE key LIKE $1", [`ai-insights:${user.id}:%`]);
  redirect("/login?deleted=1");
}
