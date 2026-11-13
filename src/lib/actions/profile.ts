"use server";

import { msg } from "../i18n/core";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "../auth";
import { q } from "../db";
import { saveProfile } from "../data";
import { parseAmountToCents } from "../format";
import { scoreRisk, validateAnswers } from "../risk";

export type ProfileState = { errors?: Record<string, string> } | null;

const MAX_MONTHLY = 5_000_000; // 50,000 a month in any currency

function monthlyFrom(raw: FormDataEntryValue | null): number | null {
  const cents = parseAmountToCents(String(raw ?? ""));
  if (cents === null || cents < 0 || cents > MAX_MONTHLY) return null;
  return cents;
}

export async function saveInvestorProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const raw = Object.fromEntries(formData.entries());
  const income = parseAmountToCents(String(raw.monthlyIncome ?? ""));
  const result = validateAnswers({ ...raw, age: Number(raw.age), monthlyIncome: income ?? NaN });
  const monthly = monthlyFrom(formData.get("monthly"));

  const errors: Record<string, string> = result.ok ? {} : { ...result.errors };
  if (monthly === null) errors.monthly = msg("Enter the amount you want to invest each month.");
  if (!result.ok || monthly === null) return { errors };

  const risk = scoreRisk(result.answers);
  await saveProfile(user.id, { answers: result.answers, score: risk.score, level: risk.level, monthlyCents: monthly });
  revalidatePath("/portfolio");
  revalidatePath("/overview");
  revalidatePath("/markets");
  redirect("/portfolio");
}

export async function setMonthly(formData: FormData): Promise<void> {
  const user = await requireUser();
  const monthly = monthlyFrom(formData.get("monthly"));
  if (monthly === null) return;
  await q("UPDATE investor_profiles SET monthly_cents = $1, updated_at = now() WHERE user_id = $2", [monthly, user.id]);
  revalidatePath("/portfolio");
  revalidatePath("/overview");
}

export async function setCompanies(formData: FormData): Promise<void> {
  const user = await requireUser();
  const include = formData.get("include") === "yes";
  await q("UPDATE investor_profiles SET include_companies = $1, updated_at = now() WHERE user_id = $2", [include, user.id]);
  revalidatePath("/portfolio");
  revalidatePath("/overview");
}
