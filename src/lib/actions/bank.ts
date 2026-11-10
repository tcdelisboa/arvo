"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "../auth";
import { q } from "../db";
import { bankEnabled, connectItem, createLinkToken, removeItem, syncItem } from "../plaid";

function refresh() {
  for (const path of ["/overview", "/spending", "/accounts", "/portfolio"]) revalidatePath(path);
}

function message(error: unknown): string {
  // Plaid errors carry a human-readable message in the response body.
  const data = (error as { response?: { data?: { error_message?: string; display_message?: string } } })?.response?.data;
  return data?.display_message || data?.error_message || "We couldn't reach your bank. Try again in a moment.";
}

export async function getLinkToken(): Promise<{ token?: string; error?: string }> {
  const user = await requireUser();
  if (!bankEnabled()) return { error: "Bank connection isn't switched on yet." };
  try {
    return { token: await createLinkToken(user.id) };
  } catch (error) {
    console.error("[plaid] link token failed:", message(error));
    return { error: message(error) };
  }
}

export async function connectBank(publicToken: string, institution: string | null): Promise<{ count?: number; error?: string }> {
  const user = await requireUser();
  if (!bankEnabled()) return { error: "Bank connection isn't switched on yet." };
  try {
    const count = await connectItem(user.id, publicToken, institution);
    await q("UPDATE users SET onboarded = TRUE WHERE id = $1", [user.id]);
    refresh();
    return { count };
  } catch (error) {
    console.error("[plaid] connect failed:", message(error));
    return { error: message(error) };
  }
}

export async function syncBank(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!bankEnabled()) return;
  try {
    await syncItem(user.id, String(formData.get("itemId") ?? ""));
  } catch (error) {
    console.error("[plaid] sync failed:", message(error));
  }
  refresh();
}

export async function disconnectBank(formData: FormData): Promise<void> {
  const user = await requireUser();
  await removeItem(user.id, String(formData.get("itemId") ?? ""));
  refresh();
}
