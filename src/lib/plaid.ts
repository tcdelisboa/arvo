import "server-only";
import { Configuration, CountryCode, PlaidApi, PlaidEnvironments, Products } from "plaid/legacy";
import { q, q1 } from "./db";
import { decrypt, encrypt } from "./crypto";
import { createAccount, insertTransactions, type NewTx } from "./data";
import type { Category } from "./categories";
import { randomUUID } from "node:crypto";
import { appUrl } from "./url";

/**
 * Bank connection through Plaid (open banking in the UK and 17 EU countries,
 * plus the US and Canada).
 *
 * Switched on by setting PLAID_CLIENT_ID and PLAID_SECRET. Without them the
 * app still works with statement import and sample data.
 */

export function bankEnabled(): boolean {
  return !!(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET);
}

function client(): PlaidApi {
  const env = process.env.PLAID_ENV === "production" ? "production" : "sandbox";
  return new PlaidApi(
    new Configuration({
      basePath: PlaidEnvironments[env],
      baseOptions: {
        headers: {
          "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
          "PLAID-SECRET": process.env.PLAID_SECRET,
        },
      },
    }),
  );
}

function countryCodes(): CountryCode[] {
  const raw = process.env.PLAID_COUNTRY_CODES ?? "GB,IE,FR,ES,NL,DE,PT,EE";
  const valid = new Set<string>(Object.values(CountryCode));
  return raw
    .split(",")
    .map((code) => code.trim().toUpperCase())
    .filter((code) => valid.has(code)) as CountryCode[];
}

/** European banks sign in on their own site and send the person back to this address. */
export function redirectUri(): string {
  return `${appUrl()}/accounts/return`;
}

export async function createLinkToken(userId: string): Promise<string> {
  const response = await client().linkTokenCreate({
    user: { client_user_id: userId },
    client_name: "Arvo",
    products: [Products.Transactions],
    country_codes: countryCodes(),
    language: "en",
    redirect_uri: redirectUri(),
    transactions: { days_requested: 365 },
  });
  return response.data.link_token;
}

// Plaid's primary categories -> Arvo categories.
const CATEGORY_MAP: Record<string, Category> = {
  INCOME: "income",
  TRANSFER_IN: "transfers",
  TRANSFER_OUT: "transfers",
  LOAN_PAYMENTS: "fees",
  BANK_FEES: "fees",
  ENTERTAINMENT: "entertainment",
  FOOD_AND_DRINK: "dining",
  GENERAL_MERCHANDISE: "shopping",
  HOME_IMPROVEMENT: "shopping",
  MEDICAL: "health",
  PERSONAL_CARE: "health",
  GENERAL_SERVICES: "other",
  GOVERNMENT_AND_NON_PROFIT: "other",
  TRANSPORTATION: "transport",
  TRAVEL: "travel",
  RENT_AND_UTILITIES: "utilities",
};

function mapCategory(primary: string | undefined, detailed: string | undefined): Category | undefined {
  if (detailed === "FOOD_AND_DRINK_GROCERIES") return "groceries";
  if (detailed === "RENT_AND_UTILITIES_RENT") return "housing";
  if (detailed?.startsWith("TRANSFER_OUT_SAVINGS") || detailed?.startsWith("TRANSFER_OUT_INVESTMENT")) return "savings";
  if (detailed === "ENTERTAINMENT_TV_AND_MOVIES" || detailed === "ENTERTAINMENT_MUSIC_AND_AUDIO") return "subscriptions";
  return primary ? CATEGORY_MAP[primary] : undefined;
}

/** Exchange the one-time token from Plaid Link, store the item, and pull transactions. */
export async function connectItem(userId: string, publicToken: string, institution: string | null): Promise<number> {
  const exchange = await client().itemPublicTokenExchange({ public_token: publicToken });
  const itemId = randomUUID();
  await q(
    `INSERT INTO bank_items (id, user_id, provider, institution, access_token_enc)
     VALUES ($1, $2, 'plaid', $3, $4)`,
    [itemId, userId, institution, encrypt(exchange.data.access_token)],
  );
  return syncItem(userId, itemId);
}

/** Pull new transactions for one connected bank. Safe to call repeatedly. */
export async function syncItem(userId: string, itemId: string): Promise<number> {
  const item = await q1<{ access_token_enc: string; cursor: string | null; institution: string | null }>(
    "SELECT access_token_enc, cursor, institution FROM bank_items WHERE id = $1 AND user_id = $2",
    [itemId, userId],
  );
  if (!item) return 0;
  const accessToken = decrypt(item.access_token_enc);
  const api = client();

  const accounts = await api.accountsGet({ access_token: accessToken });
  const accountIds = new Map<string, string>();
  for (const account of accounts.data.accounts) {
    const id = await createAccount(userId, {
      name: account.name || account.official_name || "Account",
      institution: item.institution,
      source: "bank",
      externalId: `plaid:${account.account_id}`,
      itemId,
    });
    accountIds.set(account.account_id, id);
  }

  let cursor = item.cursor ?? undefined;
  let inserted = 0;
  let more = true;
  while (more) {
    const page = await api.transactionsSync({ access_token: accessToken, cursor, count: 500 });
    const byAccount = new Map<string, NewTx[]>();
    for (const tx of page.data.added) {
      if (tx.pending) continue;
      const accountId = accountIds.get(tx.account_id);
      if (!accountId) continue;
      const list = byAccount.get(accountId) ?? [];
      list.push({
        date: tx.date,
        description: tx.name,
        merchant: tx.merchant_name ?? undefined,
        // Plaid reports money out as positive; Arvo stores it as negative.
        amountCents: -Math.round(tx.amount * 100),
        externalId: `plaid:${tx.transaction_id}`,
        category: mapCategory(tx.personal_finance_category?.primary, tx.personal_finance_category?.detailed),
      });
      byAccount.set(accountId, list);
    }
    for (const [accountId, rows] of byAccount) {
      inserted += await insertTransactions(userId, accountId, rows, "plaid");
    }
    for (const removed of page.data.removed) {
      await q("DELETE FROM transactions WHERE user_id = $1 AND external_id = $2", [userId, `plaid:${removed.transaction_id}`]);
    }
    cursor = page.data.next_cursor;
    more = page.data.has_more;
  }

  await q("UPDATE bank_items SET cursor = $1, last_synced_at = now() WHERE id = $2 AND user_id = $3", [cursor ?? null, itemId, userId]);
  return inserted;
}

/** Disconnect a bank: revoke access at Plaid, then delete its accounts and transactions. */
export async function removeItem(userId: string, itemId: string): Promise<void> {
  const item = await q1<{ access_token_enc: string }>(
    "SELECT access_token_enc FROM bank_items WHERE id = $1 AND user_id = $2",
    [itemId, userId],
  );
  if (!item) return;
  try {
    await client().itemRemove({ access_token: decrypt(item.access_token_enc) });
  } catch (error) {
    console.warn("[plaid] item removal failed remotely:", error instanceof Error ? error.message : error);
  }
  await q("DELETE FROM bank_items WHERE id = $1 AND user_id = $2", [itemId, userId]);
}
