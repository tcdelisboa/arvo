import type { Metadata } from "next";
import Link from "next/link";
import { FileSpreadsheet, FlaskConical, Landmark } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getProfile, listAccounts, listTransactions } from "@/lib/data";
import { loadSampleData } from "@/lib/actions/data";
import { money, month, percent, todayIso } from "@/lib/format";
import { categoryTotals, monthlyAverages, summarizeMonths, ymOf } from "@/lib/spending";
import { FREE_HISTORY_MONTHS } from "@/lib/plan";
import { buildInsights, totalPotentialSaving } from "@/lib/insights";
import { buildPortfolio, portfolioStats } from "@/lib/portfolio";
import { PROFILES } from "@/lib/risk";
import { ButtonLink, Notice, PageHeader, Panel, PanelHeader, Stat } from "@/components/ui";
import { MonthColumns } from "@/components/charts";
import { CategoryBars } from "@/components/category-bars";
import { PlanBar } from "@/components/plan-bar";
import { SubmitButton } from "@/components/submit-button";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage() {
  const user = await requireUser();
  const [txs, profile, accounts] = await Promise.all([
    listTransactions(user.id),
    getProfile(user.id),
    listAccounts(user.id),
  ]);
  const first = user.name.split(" ")[0];
  const fmt = (cents: number) => money(cents, user.currency, { whole: true });

  if (!txs.length) {
    return (
      <>
        <PageHeader title={`Hello, ${first}`} lead="Arvo needs your transactions before it can show you anything useful." />
        <Panel className="p-6 sm:p-10">
          <h2 className="display max-w-xl text-[30px] text-ink sm:text-[36px]">Start by bringing in your transactions</h2>
          <p className="mt-3 max-w-xl text-ink-2">
            Once Arvo can see what comes in and what goes out, it shows where your money goes, what you can afford to
            invest, and a plan that fits you.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <ButtonLink href="/accounts"><Landmark size={17} /> Add your transactions</ButtonLink>
            <form action={loadSampleData}>
              <SubmitButton variant="secondary" pendingLabel="Loading"><FlaskConical size={17} /> Try with sample data</SubmitButton>
            </form>
          </div>
          <p className="mt-5 flex items-center gap-2 text-[13.5px] text-ink-3">
            <FileSpreadsheet size={15} /> A CSV export from any bank works.
          </p>
        </Panel>
      </>
    );
  }

  const today = todayIso();
  const thisMonth = ymOf(today);
  const months = summarizeMonths(txs).slice(user.plan === "plus" ? -6 : -(FREE_HISTORY_MONTHS + 1));
  const averages = monthlyAverages(txs, today, 3);
  const current = months.find((m) => m.ym === thisMonth);
  const leftOver = averages.income - averages.spending;
  const rate = averages.income > 0 ? (leftOver / averages.income) * 100 : null;
  const totals = categoryTotals(txs, averages.months);
  const insights = buildInsights({ txs, todayIso: today, fmt });
  const saving = totalPotentialSaving(insights);
  const plus = user.plan === "plus";
  const lockedIdeas = insights.filter((i) => i.saveCents > 0).length;
  const hasSample = accounts.some((a) => a.source === "sample");
  const period = averages.months.length === 1 ? month(averages.months[0], "long") : `the last ${averages.months.length} full months`;

  const holdings = profile ? buildPortfolio(profile.level, profile.monthlyCents, profile.includeCompanies) : null;
  const stats = holdings ? portfolioStats(holdings) : null;

  return (
    <>
      <PageHeader title={`Hello, ${first}`} lead="Where your money stands, and what to do next." />

      {hasSample ? (
        <div className="mb-5">
          <Notice tone="accent" title="You are looking at sample data." action={<Link href="/accounts" className="font-medium underline underline-offset-2">Add your own</Link>}>
            These transactions are made up so you can explore.
          </Notice>
        </div>
      ) : null}

      <Panel className="p-5 sm:p-7">
        <div className="grid gap-7 sm:grid-cols-[1.3fr_1fr_1fr] sm:gap-8">
          <Stat
            size="lg"
            label={`Spent in ${month(thisMonth, "long").split(" ")[0]} so far`}
            value={fmt(current?.spending ?? 0)}
            note={averages.spending > 0 ? `A typical month is ${fmt(averages.spending)}` : undefined}
          />
          <Stat
            label="Usually left over each month"
            value={fmt(leftOver)}
            note={averages.income > 0 ? `From ${fmt(averages.income)} coming in` : "No income found yet"}
          />
          <Stat
            label="Share of income you keep"
            value={rate === null ? "—" : percent(rate, 0)}
            note={rate === null ? "Add an account that receives your salary" : rate >= 20 ? "Above the 20% rule of thumb" : "20% is a good target"}
          />
        </div>
      </Panel>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <Panel>
          <PanelHeader title="Money in and out" note="Per month" />
          <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
            <MonthColumns data={months.map((m) => ({ ym: m.ym, income: m.income, spending: m.spending }))} currency={user.currency} />
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Where it goes"
            note={`Monthly average over ${period}`}
            action={<Link href="/spending" className="text-[13.5px] font-medium text-brand-ink underline-offset-2 hover:underline">All spending</Link>}
          />
          <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
            <CategoryBars rows={totals} currency={user.currency} divisor={averages.months.length || 1} limit={6} hrefFor={(c) => `/spending?cat=${c}#transactions`} />
          </div>
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel className="flex flex-col">
          <PanelHeader title="Your plan" note={profile ? `${PROFILES[profile.level].name} investor` : "Not set up yet"} />
          <div className="flex flex-1 flex-col px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
            {profile && holdings && stats ? (
              <>
                <p className="text-[13px] text-ink-3">Investing each month</p>
                <p className="figure mb-5 mt-1 text-[34px] leading-none text-ink">{fmt(profile.monthlyCents)}</p>
                <PlanBar byClass={stats.byClass} />
                <div className="mt-auto pt-6">
                  <ButtonLink href="/portfolio" variant="secondary" size="sm">Open portfolio</ButtonLink>
                </div>
              </>
            ) : (
              <>
                <p className="max-w-md text-[15px] text-ink-2">
                  Answer ten questions about your situation and how you feel about risk. Arvo works out your investor
                  profile, how much you can afford to invest, and a portfolio to match.
                </p>
                <div className="mt-auto pt-6">
                  <ButtonLink href="/portfolio/profile">Find your investor profile</ButtonLink>
                </div>
              </>
            )}
          </div>
        </Panel>

        <Panel className="flex flex-col">
          <PanelHeader
            title="Ways to save"
            note={saving > 0 ? `Up to ${fmt(saving)} a month` : undefined}
          />
          <div className="flex flex-1 flex-col px-5 pb-5 pt-3 sm:px-6 sm:pb-6">
            {insights.length ? (
              <ul className="divide-y divide-line">
                {(plus
                  ? insights.filter((i) => i.saveCents > 0).concat(insights.filter((i) => i.saveCents === 0)).slice(0, 3)
                  : insights.filter((i) => i.saveCents === 0).slice(0, 2)
                ).map((insight) => (
                  <li key={insight.id} className="flex items-baseline justify-between gap-4 py-3">
                    <span className="text-[14.5px] text-ink">{insight.title}</span>
                    {insight.saveCents > 0 ? (
                      <span className="tnum shrink-0 text-[13.5px] font-medium text-pos">{fmt(insight.saveCents)}/mo</span>
                    ) : null}
                  </li>
                ))}
                {!plus && lockedIdeas > 0 ? (
                  <li className="py-3">
                    <Link href="/plus" className="text-[14.5px] font-medium text-brand-ink underline underline-offset-2">
                      {lockedIdeas} {lockedIdeas === 1 ? "way" : "ways"} to save with Plus
                    </Link>
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="text-[14.5px] text-ink-2">Savings ideas appear once Arvo has a full month of transactions.</p>
            )}
            <div className="mt-auto pt-5">
              <ButtonLink href="/spending#save" variant="secondary" size="sm">See the details</ButtonLink>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
