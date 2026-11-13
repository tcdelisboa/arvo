"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "../auth";
import { q, q1 } from "../db";
import { isCategory } from "../categories";
import { parseStatement, type ParsedRow } from "../csv";
import { isOfx, parseOfx } from "../ofx";
import { createAccount, insertTransactions } from "../data";
import { generateDemoRows, seedFrom } from "../demo";
import { isCurrency } from "../format";
import { isGoal } from "../goals";
import { getI18n } from "../i18n/server";
import { msg } from "../i18n/core";

export type ImportState = { error?: string; ok?: string } | null;

function refresh() {
  for (const path of ["/overview", "/spending", "/accounts", "/portfolio", "/welcome"]) revalidatePath(path);
}

async function markOnboarded(userId: string) {
  await q("UPDATE users SET onboarded = TRUE WHERE id = $1", [userId]);
}

async function addSampleData(userId: string) {
  const accountId = await createAccount(userId, {
    name: msg("Sample current account"),
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

const MAX_FILES = 24;
const MAX_TOTAL_BYTES = 40 * 1024 * 1024;

/** Import one or more bank statements (CSV or PDF) into one account. */
export async function importStatement(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const user = await requireUser();
  const { t } = await getI18n();
  const files = formData.getAll("file").filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (!files.length) return { error: t("Choose one or more statements to import, as CSV or PDF files.") };
  if (files.length > MAX_FILES) return { error: t("That is {n} files. Import up to {max} at a time.", { n: files.length, max: MAX_FILES }) };
  if (files.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_BYTES) {
    return { error: t("Those files add up to more than 40 MB. Import them in two or three batches.") };
  }

  const rows: ParsedRow[] = [];
  const failed: string[] = [];
  let skipped = 0;
  let read = 0;
  let pdfs = 0;
  for (const file of files) {
    const label = files.length > 1 ? `${file.name}: ` : "";
    if (file.size > MAX_BYTES) {
      failed.push(label + t("That file is larger than 5 MB. Export a shorter period and try again."));
      continue;
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const magic = buffer.subarray(0, 8).toString("hex");
    const isPdf = buffer.subarray(0, 5).toString("latin1") === "%PDF-";
    const isXlsx = magic.startsWith("504b0304") && /\.xlsx$/i.test(file.name);
    if (magic.startsWith("d0cf11e0") || /\.(ods|numbers)$/i.test(file.name)) {
      failed.push(label + t("This is an older spreadsheet format. Save it as .xlsx or CSV, or download the statement again as CSV, OFX or PDF."));
      continue;
    }
    let parsed;
    if (isPdf) {
      const { readPdfStatement } = await import("../pdf-read");
      parsed = await readPdfStatement(new Uint8Array(buffer));
    } else if (isXlsx) {
      const { readXlsxStatement } = await import("../xlsx-read");
      parsed = await readXlsxStatement(buffer);
    } else {
      // Most banks export UTF-8; some still use Windows-1252. Fall back if decoding left replacement characters.
      let text = new TextDecoder("utf-8").decode(buffer);
      if (text.includes("\ufffd")) text = new TextDecoder("windows-1252").decode(buffer);
      parsed = isOfx(text) ? parseOfx(text) : parseStatement(text);
    }
    if (parsed.error) {
      failed.push(label + t(parsed.error));
      continue;
    }
    rows.push(...parsed.rows);
    skipped += parsed.skipped;
    read += 1;
    if (isPdf) pdfs += 1;
  }

  const problems = failed.join(" ");
  if (!read) return { error: problems };

  // Either add to an account imported before, or start a new one.
  const target = String(formData.get("account") ?? "");
  const existing = target
    ? await q1<{ id: string; name: string }>("SELECT id, name FROM accounts WHERE id = $1 AND user_id = $2 AND source = 'csv'", [target, user.id])
    : null;
  const rawName = String(formData.get("name") ?? "").trim();
  const fallback = files.length === 1 ? files[0].name.replace(/\.[^.]+$/, "") : t("Imported statements");
  const name = existing?.name ?? (rawName || fallback || t("Imported account")).slice(0, 60);
  const accountId =
    existing?.id ??
    (await createAccount(user.id, {
      name,
      institution: "Statement import",
      source: "csv",
      externalId: `csv:${name.toLowerCase()}`,
    }));
  const inserted = await insertTransactions(user.id, accountId, rows, "csv");
  await markOnboarded(user.id);
  refresh();

  const already = rows.length - inserted;
  const parts = [
    read > 1
      ? t("Imported {n} transactions from {files} files into {name}.", { n: inserted, files: read, name })
      : inserted === 1
        ? t("Imported 1 transaction into {name}.", { name })
        : t("Imported {n} transactions into {name}.", { n: inserted, name }),
  ];
  if (already > 0) parts.push(t("{n} were already there and were skipped.", { n: already }));
  if (skipped > 0) parts.push(t("{n} rows had no date or amount and were ignored.", { n: skipped }));
  if (pdfs > 0) parts.push(t("PDFs are read from the page layout, so check a few amounts in Spending against your statement."));
  const notImported = failed.length === 1 ? t("1 file was not imported.") : t("{n} files were not imported.", { n: failed.length });
  return problems ? { ok: parts.join(" "), error: `${notImported} ${problems}` } : { ok: parts.join(" ") };
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
