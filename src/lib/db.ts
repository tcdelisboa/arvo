import "server-only";
import path from "node:path";

/**
 * One small query function over two interchangeable Postgres engines:
 *
 * - DATABASE_URL set  -> a real Postgres server (Neon, Supabase, RDS...).
 * - DATABASE_URL unset -> PGlite, Postgres compiled to WASM, stored in
 *   ./.arvo-data. Zero setup for local development and demos.
 *
 * Both speak the same SQL, so there is exactly one schema and one set of
 * queries in the app.
 */

export type Row = Record<string, unknown>;

type Driver = {
  query: (text: string, params?: unknown[]) => Promise<Row[]>;
  exec: (text: string) => Promise<void>;
};

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  onboarded BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions (user_id);
CREATE TABLE IF NOT EXISTS auth_attempts (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL,
  at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_attempts_key ON auth_attempts (key, at);
CREATE TABLE IF NOT EXISTS password_resets (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE IF NOT EXISTS bank_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  institution TEXT,
  access_token_enc TEXT NOT NULL,
  cursor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_synced_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  institution TEXT,
  source TEXT NOT NULL,
  external_id TEXT,
  item_id TEXT REFERENCES bank_items(id) ON DELETE CASCADE,
  balance_cents INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS accounts_user ON accounts (user_id);
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  merchant TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  category TEXT NOT NULL,
  category_locked BOOLEAN NOT NULL DEFAULT FALSE,
  external_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS transactions_dedupe ON transactions (user_id, external_id);
CREATE INDEX IF NOT EXISTS transactions_user_date ON transactions (user_id, date);
CREATE TABLE IF NOT EXISTS investor_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  score INTEGER NOT NULL,
  level INTEGER NOT NULL,
  monthly_cents INTEGER NOT NULL,
  include_companies BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS watchlist (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, symbol)
);
CREATE TABLE IF NOT EXISTS cache (
  key TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS goal TEXT;
CREATE TABLE IF NOT EXISTS waitlist (
  email TEXT PRIMARY KEY,
  goal TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS activity (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  PRIMARY KEY (user_id, day)
);
CREATE TABLE IF NOT EXISTS plan_interest (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

async function createDriver(): Promise<Driver> {
  const url = process.env.DATABASE_URL;
  let driver: Driver;

  if (url) {
    const { default: postgres } = await import("postgres");
    const sql = postgres(url, {
      max: 5,
      idle_timeout: 20,
      // Works behind transaction poolers (PgBouncer, Neon/Supabase pooled URLs).
      prepare: false,
      onnotice: () => {},
    });
    driver = {
      query: async (text, params = []) =>
        (await sql.unsafe(text, params as never[])) as unknown as Row[],
      exec: async (text) => {
        await sql.unsafe(text);
      },
    };
  } else {
    if (process.env.VERCEL) {
      throw new Error(
        "DATABASE_URL is not set. Arvo needs a Postgres database in production. Add one (for example Neon from the Vercel Marketplace) and redeploy.",
      );
    }
    const { PGlite } = await import("@electric-sql/pglite");
    const dir = process.env.ARVO_DATA_DIR ?? path.join(process.cwd(), ".arvo-data");
    const db = new PGlite(dir);
    driver = {
      query: async (text, params = []) => (await db.query(text, params)).rows as Row[],
      exec: async (text) => {
        await db.exec(text);
      },
    };
  }

  try {
    await driver.exec(SCHEMA);
  } catch {
    // Two cold starts creating tables at the same moment can collide once.
    await driver.exec(SCHEMA);
  }
  return driver;
}

const globalForDb = globalThis as unknown as { __arvoDb?: Promise<Driver> };

function getDriver(): Promise<Driver> {
  if (!globalForDb.__arvoDb) {
    globalForDb.__arvoDb = createDriver().catch((err) => {
      globalForDb.__arvoDb = undefined;
      throw err;
    });
  }
  return globalForDb.__arvoDb;
}

/** Run a parameterised query ($1, $2, ...) and return the rows. */
export async function q<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  const driver = await getDriver();
  return (await driver.query(text, params)) as T[];
}

/** First row or null. */
export async function q1<T = Row>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await q<T>(text, params);
  return rows[0] ?? null;
}

/** Read a JSON value from the shared cache table, or null when missing/expired. */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const row = await q1<{ payload: T }>(
    "SELECT payload FROM cache WHERE key = $1 AND expires_at > now()",
    [key],
  );
  return row ? row.payload : null;
}

export async function cacheSet(key: string, payload: unknown, ttlSeconds: number): Promise<void> {
  await q(
    `INSERT INTO cache (key, payload, expires_at)
     VALUES ($1, $2::jsonb, now() + ($3 || ' seconds')::interval)
     ON CONFLICT (key) DO UPDATE SET payload = EXCLUDED.payload, expires_at = EXCLUDED.expires_at`,
    [key, JSON.stringify(payload), String(ttlSeconds)],
  );
}
