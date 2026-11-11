import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { q, q1 } from "./db";
import { randomToken, sha256 } from "./crypto";
import type { Currency } from "./format";
import { isPlan, type Plan } from "./plan";

const COOKIE = "arvo_session";
const SESSION_DAYS = 30;

export type User = {
  id: string;
  email: string;
  name: string;
  currency: Currency;
  onboarded: boolean;
  plan: Plan;
  /** True when the email is listed in ADMIN_EMAILS. */
  isAdmin: boolean;
};

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function createSession(userId: string): Promise<void> {
  const token = randomToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await q("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)", [
    sha256(token),
    userId,
    expires.toISOString(),
  ]);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await q("DELETE FROM sessions WHERE token_hash = $1", [sha256(token)]);
  jar.delete(COOKIE);
}

/** The signed-in user for this request, or null. Deduplicated per request. */
export const getUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const row = await q1<Omit<User, "isAdmin"> & { last_seen_at: Date | string | null }>(
    `SELECT u.id, u.email, u.name, u.currency, u.onboarded, u.plan, u.last_seen_at
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [sha256(token)],
  );
  if (!row) return null;

  // One write per person per day: which days they used Arvo (for retention).
  const today = new Date().toISOString().slice(0, 10);
  const lastSeen = row.last_seen_at ? new Date(row.last_seen_at).toISOString().slice(0, 10) : null;
  if (lastSeen !== today) {
    q("INSERT INTO activity (user_id, day) VALUES ($1, $2) ON CONFLICT DO NOTHING", [row.id, today])
      .then(() => q("UPDATE users SET last_seen_at = now() WHERE id = $1", [row.id]))
      .catch(() => {});
  }

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    currency: row.currency,
    onboarded: row.onboarded,
    plan: isPlan(row.plan) ? row.plan : "free",
    isAdmin: adminEmails().includes(row.email.toLowerCase()),
  };
});

/** Use at the top of every signed-in page, action and route. */
export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

/** Admin pages and actions. Everyone else gets the ordinary not-found page. */
export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (!user.isAdmin) notFound();
  return user;
}

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

const WINDOW_MINUTES = 15;
const MAX_ATTEMPTS = 8;

/** Throttle sign-in and reset attempts per email + IP. */
export async function tooManyAttempts(scope: string, email: string): Promise<boolean> {
  const key = `${scope}:${email.toLowerCase()}:${await clientIp()}`;
  const row = await q1<{ n: number }>(
    `SELECT count(*)::int AS n FROM auth_attempts
      WHERE key = $1 AND at > now() - ($2 || ' minutes')::interval`,
    [key, String(WINDOW_MINUTES)],
  );
  return (row?.n ?? 0) >= MAX_ATTEMPTS;
}

export async function recordAttempt(scope: string, email: string): Promise<void> {
  const key = `${scope}:${email.toLowerCase()}:${await clientIp()}`;
  await q("INSERT INTO auth_attempts (key) VALUES ($1)", [key]);
  // Opportunistic clean-up so the table never grows without bound.
  await q("DELETE FROM auth_attempts WHERE at < now() - interval '1 day'");
}
