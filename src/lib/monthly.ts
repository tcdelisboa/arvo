import "server-only";
import { q1 } from "./db";
import { sign } from "./crypto";
import { getProfile, listTransactions } from "./data";
import { fmtFor } from "./format";
import { isLang, makeT, type Lang } from "./i18n/core";
import { categoryLabel } from "./categories";
import { emergencyTarget } from "./progress";
import { addMonths, categoryTotals, monthlyAverages, summarizeMonths } from "./spending";
import { contributionTotals, getTracking } from "./tracking";
import { appUrl } from "./url";

export type MonthlyEmail = { to: string; subject: string; text: string; unsubscribe: string };

export function unsubscribeUrl(userId: string): string {
  return `${appUrl()}/api/unsubscribe?u=${encodeURIComponent(userId)}&s=${sign(`unsubscribe:${userId}`)}`;
}

/**
 * One short email about the month that just ended: money in and out, what was
 * invested against the plan, and the emergency fund. Null when Arvo has
 * nothing useful to say yet (no transactions and no investor profile).
 */
export async function monthlyEmail(userId: string, ym: string): Promise<MonthlyEmail | null> {
  const user = await q1<{ email: string; name: string; currency: string; lang: string | null }>(
    "SELECT email, name, currency, lang FROM users WHERE id = $1",
    [userId],
  );
  if (!user) return null;
  const lang: Lang = isLang(user.lang) ? user.lang : "en";
  const t = makeT(lang);
  const f = fmtFor(lang);
  const fmt = (cents: number) => f.money(cents, user.currency, { whole: true });

  const [txs, profile, totals, tracking] = await Promise.all([
    listTransactions(userId),
    getProfile(userId),
    contributionTotals(userId, ym),
    getTracking(userId),
  ]);
  const month = f.month(ym, "long");
  const summary = summarizeMonths(txs).find((m) => m.ym === ym);
  if (!summary && !profile) return null;

  const lines: string[] = [];
  if (summary && (summary.income > 0 || summary.spending > 0)) {
    lines.push(
      t("Money in: {amount}", { amount: fmt(summary.income) }),
      t("Spent: {amount}", { amount: fmt(summary.spending) }),
      t("Left over: {amount}", { amount: fmt(summary.income - summary.spending) }),
    );
    const top = categoryTotals(txs, [ym])[0];
    if (top) lines.push(t("Biggest cost: {category}, {amount}", { category: t(categoryLabel(top.category)).toLowerCase(), amount: fmt(top.cents) }));
  } else {
    lines.push(t("No transactions for {month} yet. Import that month's statement to see where the money went.", { month }));
  }

  const invested = totals.find((row) => row.ym === ym)?.cents ?? 0;
  if (profile) {
    lines.push(
      invested > 0
        ? t("Invested: {amount} of the {planned} you planned", { amount: fmt(invested), planned: fmt(profile.monthlyCents) })
        : t("Invested: nothing logged. If you did invest, log it in Arvo so the habit counts."),
    );
  }

  // As seen on the first day of the next month, so the month just ended counts as complete.
  const averages = monthlyAverages(txs, `${addMonths(ym, 1)}-01`, 3);
  const target = emergencyTarget({
    spendingCents: averages.spending > 0 ? averages.spending : null,
    incomeCents: profile?.answers.monthlyIncome ?? null,
    stability: profile?.answers.stability ?? null,
  });
  if (target && tracking.emergencyCents !== null) {
    lines.push(
      t("Emergency fund: {saved} of {target} ({share})", {
        saved: fmt(tracking.emergencyCents),
        target: fmt(target.targetCents),
        share: f.percent(Math.min(100, (tracking.emergencyCents / target.targetCents) * 100), 0),
      }),
    );
  }

  const unsubscribe = unsubscribeUrl(userId);
  const text = [
    t("Hello {name},", { name: user.name.split(" ")[0] }),
    "",
    t("Here is {month} in numbers:", { month }),
    "",
    ...lines.map((line) => `- ${line}`),
    "",
    t("Open Arvo: {link}", { link: `${appUrl()}/overview` }),
    "",
    t("Arvo sends this once a month. To stop it, open this link: {link}", { link: unsubscribe }),
  ].join("\n");

  return { to: user.email, subject: t("Your {month} with Arvo", { month }), text, unsubscribe };
}
