"use server";

import { headers } from "next/headers";
import { recordAttempt, tooManyAttempts } from "../auth";
import { q } from "../db";
import { isGoal } from "../goals";
import { msg } from "../i18n/core";

export type WaitlistState = { error?: string; email?: string; done?: boolean } | null;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Where the visitor came from, taken from ?src= or ?utm_source= on the page they signed up on. */
async function sourceOf(): Promise<string | null> {
  try {
    const referer = (await headers()).get("referer");
    if (!referer) return null;
    const params = new URL(referer).searchParams;
    const value = (params.get("src") ?? params.get("utm_source") ?? "").toLowerCase().replace(/[^a-z0-9_-]/g, "");
    return value ? value.slice(0, 30) : null;
  } catch {
    return null;
  }
}

/** Public: leave an email to hear when Arvo opens. */
export async function joinWaitlist(_prev: WaitlistState, formData: FormData): Promise<WaitlistState> {
  // Filled only by scripts that complete every field; people never see it.
  if (String(formData.get("company") ?? "")) return { done: true, email: "" };

  // Second step: the optional "what do you want help with" answer.
  const goal = formData.get("goal");
  const known = String(formData.get("known") ?? "").trim().toLowerCase();
  if (known && isGoal(goal)) {
    await q("UPDATE waitlist SET goal = $1 WHERE email = $2 AND goal IS NULL", [goal, known]);
    return { email: known, done: true };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 200) return { error: msg("Enter a valid email address.") };
  if (await tooManyAttempts("waitlist", "any", 30)) return { error: msg("Too many sign-ups from this connection. Try again in a few minutes.") };
  await recordAttempt("waitlist", "any");

  await q("INSERT INTO waitlist (email, source) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING", [email, await sourceOf()]);
  return { email };
}
