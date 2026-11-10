import "server-only";
import { randomUUID } from "node:crypto";
import { q, q1 } from "./db";
import { sha256 } from "./crypto";
import { categorize, cleanMerchant, isCategory } from "./categories";
import type { Tx } from "./spending";
import type { Answers, Level } from "./risk";

/** Data access for one user. Every query is scoped by user id. */

export type Account = {
  id: string;
  name: string;
  institution: string | null;
  source: "sample" | "csv" | "bank";
  count: number;
};

export async function listAccounts(userId: string): Promise<Account[]> {
  return q<Account>(
    `SELECT a.id, a.name, a.institution, a.source,
            (SELECT count(*)::int FROM transactions t WHERE t.account_id = a.id) AS count
       FROM accounts a WHERE a.user_id = $1 ORDER BY a.created_at`,
    [userId],
  );
}

export async function listTransactions(userId: string): Promise<Tx[]> {
  const rows = await q<{
    id: string; date: string; description: string; merchant: string;
    amount_cents: number; category: string; account_id: string;
  }>(
    `SELECT id, date, description, merchant, amount_cents, category, account_id
       FROM transactions WHERE user_id = $1 ORDER BY date DESC, created_at DESC, id`,
    [userId],
  );
  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    description: row.description,
    merchant: row.merchant,
    amountCents: Number(row.amount_cents),
    category: row.category,
    accountId: row.account_id,
  }));
}

export async function createAccount(
  userId: string,
  account: { name: string; institution?: string | null; source: Account["source"]; externalId?: string | null; itemId?: string | null },
): Promise<string> {
  if (account.externalId) {
    const existing = await q1<{ id: string }>(
      "SELECT id FROM accounts WHERE user_id = $1 AND external_id = $2",
      [userId, account.externalId],
    );
    if (existing) return existing.id;
  }
  const id = randomUUID();
  await q(
    `INSERT INTO accounts (id, user_id, name, institution, source, external_id, item_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, userId, account.name, account.institution ?? null, account.source, account.externalId ?? null, account.itemId ?? null],
  );
  return id;
}

export type NewTx = {
  date: string;
  description: string;
  amountCents: number;
  /** Stable id from the source. When missing, one is derived from the row. */
  externalId?: string;
  category?: string;
  merchant?: string;
};

/**
 * Insert transactions, skipping any already stored. Rows without a source id
 * get one from their content plus their position among identical rows, so the
 * same statement can be imported twice without duplicates while two genuine
 * identical purchases on the same day are both kept.
 */
export async function insertTransactions(userId: string, accountId: string, rows: NewTx[], prefix: string): Promise<number> {
  const seen = new Map<string, number>();
  const prepared = rows
    .filter((row) => Number.isInteger(row.amountCents) && Math.abs(row.amountCents) < 2_000_000_000)
    .map((row) => {
      let externalId = row.externalId;
      if (!externalId) {
        const base = `${row.date}|${row.amountCents}|${row.description}`;
        const n = seen.get(base) ?? 0;
        seen.set(base, n + 1);
        externalId = `${prefix}:${sha256(`${base}|${n}`).slice(0, 32)}`;
      }
      const category = row.category && isCategory(row.category) ? row.category : categorize(row.description, row.amountCents);
      return [
        randomUUID(), userId, accountId, row.date, row.description.slice(0, 200),
        (row.merchant ?? cleanMerchant(row.description)).slice(0, 60) || "Transaction", row.amountCents, category, externalId,
      ];
    });

  let inserted = 0;
  const CHUNK = 400;
  for (let i = 0; i < prepared.length; i += CHUNK) {
    const chunk = prepared.slice(i, i + CHUNK);
    const values = chunk
      .map((_, r) => `(${Array.from({ length: 9 }, (_, c) => `$${r * 9 + c + 1}`).join(", ")})`)
      .join(", ");
    const result = await q<{ id: string }>(
      `INSERT INTO transactions (id, user_id, account_id, date, description, merchant, amount_cents, category, external_id)
       VALUES ${values}
       ON CONFLICT (user_id, external_id) DO NOTHING
       RETURNING id`,
      chunk.flat(),
    );
    inserted += result.length;
  }
  return inserted;
}

export type StoredProfile = {
  answers: Answers;
  score: number;
  level: Level;
  monthlyCents: number;
  includeCompanies: boolean;
  updatedAt: string;
};

export async function getProfile(userId: string): Promise<StoredProfile | null> {
  const row = await q1<{
    answers: Answers; score: number; level: number; monthly_cents: number; include_companies: boolean; updated_at: Date | string;
  }>("SELECT answers, score, level, monthly_cents, include_companies, updated_at FROM investor_profiles WHERE user_id = $1", [userId]);
  if (!row) return null;
  return {
    answers: typeof row.answers === "string" ? JSON.parse(row.answers) : row.answers,
    score: Number(row.score),
    level: Math.min(5, Math.max(1, Number(row.level))) as Level,
    monthlyCents: Number(row.monthly_cents),
    includeCompanies: !!row.include_companies,
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function saveProfile(
  userId: string,
  profile: { answers: Answers; score: number; level: Level; monthlyCents: number },
): Promise<void> {
  await q(
    `INSERT INTO investor_profiles (user_id, answers, score, level, monthly_cents)
     VALUES ($1, $2::jsonb, $3, $4, $5)
     ON CONFLICT (user_id) DO UPDATE
       SET answers = EXCLUDED.answers, score = EXCLUDED.score, level = EXCLUDED.level,
           monthly_cents = EXCLUDED.monthly_cents, updated_at = now()`,
    [userId, JSON.stringify(profile.answers), profile.score, profile.level, profile.monthlyCents],
  );
}

export async function listWatchlist(userId: string): Promise<string[]> {
  const rows = await q<{ symbol: string }>("SELECT symbol FROM watchlist WHERE user_id = $1 ORDER BY created_at", [userId]);
  return rows.map((row) => row.symbol);
}
