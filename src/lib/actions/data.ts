"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "../auth";
import { q } from "../db";
import { isCategory } from "../categories";
import { parseStatement } from "../csv";
import { createAccount, insertTransactions } from "../data";
import { generateDemoRows, seedFrom } from "../demo";
import { isCurrency } from "../format";
import { isGoal } from "../goals";

export type ImportState = { error?: string; ok?: string } | null;

function refresh() {
  for (const path of ["/overview", "/spending", "/accounts", "/portfolio", "/welcome"]) revalidatePath(path);
}

async function markOnboarded(userId: string) {
  await q("UPDATE users SET onboarded = TRUE WHERE id = $1", [userId]);
}

async function addSampleData(userId: string) {
  const accountId = await createAccount(userId, {
    name: "Sample current account",
    institution: "Sample data",
    source: "sample",
    externalId: "sample",
  });
  await insertTransactions(userId, accountId, generateDemoRows(seedFrom(userId)), "sample");
}

/** Fill the account with clearly labelled sample transactions. */
export async function loadSampleData(formData?: FormData): Promise<void> {
  const user = await requireUser();
  const currency = formData?.get("currency");
  if (isCurrency(currency)) await q("UPDATE users SET currency = $1 WHERE id = $2", [currency, user.id]);
  await addSampleData(user.id);
  await markOnboarded(user.id);
  refresh();
  redirect("/overview");
}

export async function removeAccount(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("accountId") ?? "");
  // Transactions go with the account (ON DELETE CASCADE).
  await q("DELETE FROM accounts WHERE id = $1 AND user_id = $2", [id, user.id]);
  refresh();
}

const MAX_BYTES = 5 * 1024 * 1024;

export async function importStatement(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const user = await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file to import." };
  if (file.size > MAX_BYTES) return { error: "That file is larger than 5 MB. Export a shorter period and try again." };
  if (/\.(xlsx?|pdf|ods|numbers)$/i.test(file.name)) {
    return { error: "That looks like a spreadsheet or PDF. In your bank's website, choose CSV as the export format." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  // Most banks export UTF-8; some still use Windows-1252. Fall back if decoding left replacement characters.
  let text = new TextDecoder("utf-8").decode(buffer);
  if (text.includes("�")) text = new TextDecoder("windows-1252").decode(buffer);

  const parsed = parseStatement(text);
  if (parsed.error) return { error: parsed.error };

  const rawName = String(formData.get("name") ?? "").trim();
  const name = (rawName || file.name.replace(/\.[^.]+$/, "") || "Imported account").slice(0, 60);
  const accountId = await createAccount(user.id, {
    name,
    institution: "Statement import",
    source: "csv",
    externalId: `csv:${name.toLowerCase()}`,
  });
  const inserted = await insertTransactions(user.id, accountId, parsed.rows, "csv");
  await markOnboarded(user.id);
  refresh();

  const already = parsed.rows.length - inserted;
  const parts = [`Imported ${inserted} ${inserted === 1 ? "transaction" : "transactions"} into ${name}.`];
  if (already > 0) parts.push(`${already} were already there and were skipped.`);
  if (parsed.skipped > 0) parts.push(`${parsed.skipped} rows had no date or amount and were ignored.`);
  return { ok: parts.join(" ") };
}

/** Change one transaction's category and lock it against future automatic changes. */
export async function setCategory(transactionId: string, category: string): Promise<void> {
  const user = await requireUser();
  if (!isCategory(category)) return;
  await q("UPDATE transactions SET category = $1, category_locked = TRUE WHERE id = $2 AND user_id = $3", [
    category,
    transactionId,
    user.id,
  ]);
  refresh();
}

export async function finishWelcome(formData: FormData): Promise<void> {
  const user = await requireUser();
  const currency = formData.get("currency");
  if (isCurrency(currency)) await q("UPDATE users SET currency = $1 WHERE id = $2", [currency, user.id]);
  const goal = formData.get("goal");
  if (isGoal(goal)) await q("UPDATE users SET goal = $1 WHERE id = $2", [goal, user.id]);
  const start = String(formData.get("start") ?? "");
  if (start === "sample") await addSampleData(user.id);
  await markOnboarded(user.id);
  refresh();
  const next: Record<string, string> = { import: "/accounts", invest: "/portfolio/profile", markets: "/markets" };
  redirect(next[start] ?? "/overview");
}

export async function setCurrency(formData: FormData): Promise<void> {
  const user = await requireUser();
  const currency = formData.get("currency");
  if (isCurrency(currency)) await q("UPDATE users SET currency = $1 WHERE id = $2", [currency, user.id]);
  refresh();
  revalidatePath("/settings");
}

export async function toggleWatch(symbol: string): Promise<void> {
  const user = await requireUser();
  if (!/^[A-Z0-9.\-^=]{1,15}$/.test(symbol)) return;
  const removed = await q<{ symbol: string }>(
    "DELETE FROM watchlist WHERE user_id = $1 AND symbol = $2 RETURNING symbol",
    [user.id, symbol],
  );
  if (!removed.length) {
    await q("INSERT INTO watchlist (user_id, symbol) VALUES ($1, $2) ON CONFLICT DO NOTHING", [user.id, symbol]);
  }
  revalidatePath("/markets");
  revalidatePath(`/markets/${symbol}`);
}
