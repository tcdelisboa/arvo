import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getProfile, listTransactions } from "@/lib/data";
import { todayIso } from "@/lib/format";
import { monthlyAverages } from "@/lib/spending";
import { ProfileForm } from "@/components/profile-form";

export const metadata: Metadata = { title: "Your investor profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const [txs, profile] = await Promise.all([listTransactions(user.id), getProfile(user.id)]);
  const averages = monthlyAverages(txs, todayIso(), 3);
  const hasSpending = averages.months.length > 0 && averages.spending > 0;

  const initial: Record<string, string> = profile
    ? {
        ...Object.fromEntries(Object.entries(profile.answers).map(([key, value]) => [key, String(value)])),
        monthlyIncome: String(Math.round(profile.answers.monthlyIncome / 100)),
        monthly: String(Math.round(profile.monthlyCents / 100)),
      }
    : averages.income > 0
      ? { monthlyIncome: String(Math.round(averages.income / 100)) }
      : {};

  return (
    <div className="mx-auto max-w-[620px]">
      <Link href="/portfolio" className="text-[13.5px] text-ink-2 underline underline-offset-2 hover:text-ink">
        Back to portfolio
      </Link>
      <p className="mb-8 mt-4 text-[15px] text-ink-2">
        Ten questions, about three minutes. Your answers decide how much risk your portfolio takes and how much Arvo
        suggests you invest. Nothing here is shared with anyone.
      </p>
      <ProfileForm
        initial={initial}
        currency={user.currency}
        averageSpendingCents={hasSpending ? averages.spending : null}
        spendingMonths={averages.months.length}
      />
    </div>
  );
}
