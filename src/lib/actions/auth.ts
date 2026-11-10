"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { q, q1 } from "../db";
import { hashPassword, randomToken, sha256, verifyPassword } from "../crypto";
import { createSession, destroySession, recordAttempt, tooManyAttempts } from "../auth";
import { sendEmail } from "../email";

export type AuthState = {
  error?: string;
  fields?: Partial<Record<"name" | "email" | "password" | "terms", string>>;
  values?: { name?: string; email?: string };
  sent?: boolean;
} | null;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function read(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const name = read(formData, "name");
  const email = read(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const terms = formData.get("terms") === "on";
  const values = { name, email };

  const fields: NonNullable<AuthState>["fields"] = {};
  if (name.length < 2 || name.length > 80) fields.name = "Enter your name.";
  if (!EMAIL.test(email) || email.length > 200) fields.email = "Enter a valid email address.";
  if (password.length < 10) fields.password = "Use at least 10 characters.";
  else if (password.length > 200) fields.password = "Use 200 characters or fewer.";
  if (!terms) fields.terms = "Agree to the terms to create an account.";
  if (Object.keys(fields).length) return { fields, values };

  if (await tooManyAttempts("signup", email)) {
    return { error: "Too many attempts. Wait a few minutes and try again.", values };
  }
  await recordAttempt("signup", email);

  const existing = await q1("SELECT id FROM users WHERE email = $1", [email]);
  if (existing) {
    return { fields: { email: "An account with this email already exists. Sign in instead." }, values };
  }

  const id = randomUUID();
  await q("INSERT INTO users (id, email, name, password_hash) VALUES ($1, $2, $3, $4)", [
    id,
    email,
    name,
    await hashPassword(password),
  ]);
  await createSession(id);
  redirect("/welcome");
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = read(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const values = { email };
  if (!EMAIL.test(email) || !password) {
    return { error: "Enter your email and password.", values };
  }
  if (await tooManyAttempts("login", email)) {
    return { error: "Too many attempts. Wait 15 minutes and try again, or reset your password.", values };
  }

  const user = await q1<{ id: string; password_hash: string; onboarded: boolean }>(
    "SELECT id, password_hash, onboarded FROM users WHERE email = $1",
    [email],
  );
  // Always spend the hashing time, so the response doesn't reveal whether the email exists.
  const ok = user
    ? await verifyPassword(password, user.password_hash)
    : (await hashPassword(password), false);
  if (!user || !ok) {
    await recordAttempt("login", email);
    return { error: "That email and password don't match. Check them and try again.", values };
  }

  await createSession(user.id);
  redirect(user.onboarded ? "/overview" : "/welcome");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/");
}

export async function requestReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = read(formData, "email").toLowerCase();
  if (!EMAIL.test(email)) return { fields: { email: "Enter a valid email address." }, values: { email } };
  if (await tooManyAttempts("reset", email)) {
    return { error: "Too many attempts. Wait a few minutes and try again.", values: { email } };
  }
  await recordAttempt("reset", email);

  const user = await q1<{ id: string; name: string }>("SELECT id, name FROM users WHERE email = $1", [email]);
  if (user) {
    const token = randomToken();
    await q(
      "INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '1 hour')",
      [sha256(token), user.id],
    );
    const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
    await sendEmail(
      email,
      "Reset your Arvo password",
      `Hello ${user.name},\n\nUse this link to choose a new password. It works once and expires in one hour.\n\n${base}/reset?token=${token}\n\nIf you didn't ask for this, you can ignore this email.\n\nArvo`,
    );
  }
  // Same answer either way, so this form can't be used to find out who has an account.
  return { sent: true, values: { email } };
}

export async function resetPassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const token = read(formData, "token");
  const password = String(formData.get("password") ?? "");
  if (password.length < 10) return { fields: { password: "Use at least 10 characters." } };
  if (password.length > 200) return { fields: { password: "Use 200 characters or fewer." } };

  const row = await q1<{ user_id: string }>(
    "SELECT user_id FROM password_resets WHERE token_hash = $1 AND used = FALSE AND expires_at > now()",
    [sha256(token)],
  );
  if (!row) return { error: "This reset link has expired or was already used. Request a new one." };

  await q("UPDATE users SET password_hash = $1 WHERE id = $2", [await hashPassword(password), row.user_id]);
  await q("UPDATE password_resets SET used = TRUE WHERE user_id = $1", [row.user_id]);
  // Sign out everywhere: anyone holding an old session loses it.
  await q("DELETE FROM sessions WHERE user_id = $1", [row.user_id]);
  redirect("/login?reset=1");
}
