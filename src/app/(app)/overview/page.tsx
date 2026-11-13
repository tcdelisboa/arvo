import { getI18n, titled } from "@/lib/i18n/server";
import { msg } from "@/lib/i18n/core";
import Link from "next/link";
import { ChartPie, FileSpreadsheet, FlaskConical, Landmark } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getProfile, listAccounts, listTransactions } from "@/lib/data";
import { loadSampleData } from "@/lib/actions/data";
import { todayIso } from "@/lib/format";
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

export const generateMetadata = titled(msg("Overview"));

export default async function OverviewPage() {
  const user = await requireUser();
  const [txs, profile, accounts] = await Promise.all([
    listTransactions(user.id),
    getProfile(user.id),
    listAccounts(user.id),
  ]);
  const first = user.name.split(" ")[0];
  const { t, f } = await getI18n();
  const fmt = (cents: number) => f.money(cents, user.currency, { whole: true });

  if (!txs.length) {
    const profileName = profile ? t(PROFILES[profile.level].name) : null;
    return (
      <>
        <PageHeader
          title={t("Hello, {name}", { name: first })}
          lead={profile ? t("Your investing plan is ready. Add your spending whenever you want the full picture.") : t("Two ways to begin. Pick whichever suits you today.")}
        />
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel className="p-6 sm:p-8">
            <h2 className="display text-[27px] text-ink sm:text-[30px]">
              {profile ? t("Your investor profile is {name}", { name: profileName ?? "" }) : t("Start with investing")}
            </h2>
            <p className="mt-3 text-ink-2">
              {profile
                ? t("See the funds that fit your profile, the share to put into each, and what it could grow into.")
                : t("Ten questions about your situation and how you feel about risk. You get your investor profile and a model portfolio. No bank data needed.")}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {profile ? (
                <>
                  <ButtonLink href="/portfolio"><ChartPie size={17} /> {t("Open your portfolio")}</ButtonLink>
                  <ButtonLink href="/markets" variant="secondary">{t("Browse the markets")}</ButtonLink>
                </>
              ) : (
                <ButtonLink href="/portfolio/profile"><ChartPie size={17} /> {t("Find your investor profile")}</ButtonLink>
              )}
            </div>
          </Panel>

          <Panel className="p-6 sm:p-8">
            <h2 className="display text-[27px] text-ink sm:text-[30px]">{profile ? t("Add your spending") : t("Start with your spending")}</h2>
            <p className="mt-3 text-ink-2">
              {profile
                ? t("Bring in a statement and Arvo shows where your money goes and checks how much you can really afford to invest.")
                : t("Bring in a statement and Arvo shows where your money goes, then what you can afford to invest.")}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="/accounts" variant={profile ? "primary" : "secondary"}><Landmark size={17} /> {t("Add your transactions")}</ButtonLink>
              <form action={loadSampleData}>
                <SubmitButton variant="secondary" pendingLabel={t("Loading")}><FlaskConical size={17} /> {t("Try with sample data")}</SubmitButton>
              </form>
            </div>
            <p className="mt-5 flex items-center gap-2 text-[13.5px] text-ink-3">
              <FileSpreadsheet size={15} /> {t("A CSV or PDF statement from any bank works.")}
            </p>
          </Panel>
        </div>
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
  const insights = buildInsights({ txs, todayIso: today, fmt, t, pctFmt: (n) => f.percent(n, 0) });
  const saving = totalPotentialSaving(insights);
  const plus = user.plan === "plus";
  const lockedIdeas = insights.filter((i) => i.saveCents > 0).length;
  const hasSample = accounts.some((a) => a.source === "sample");
  const period =
    averages.months.length === 1 ? f.month(averages.months[0], "long") : t("the last {n} full months", { n: averages.months.length });

  const holdings = profile ? buildPortfolio(profile.level, profile.monthlyCents, profile.includeCompanies) : null;
  const stats = holdings ? portfolioStats(holdings) : null;

  return (
    <>
      <PageHeader title={t("Hello, {name}", { name: first })} lead={t("Where your money stands, and what to do next.")} />

      {hasSample ? (
        <div className="mb-5">
          <Notice tone="accent" title={t("You are looking at sample data.")} action={<Link href="/accounts" className="font-medium underline underline-offset-2">{t("Add your own")}</Link>}>
            {t("These transactions are made up so you can explore.")}
          </Notice>
        </div>
      ) : null}

      <Panel className="p-5 sm:p-7">
        <div className="grid gap-7 sm:grid-cols-[1.3fr_1fr_1fr] sm:gap-8">
          <Stat
            size="lg"
            label={t("Spent in {month} so far", { month: f.month(thisMonth, "long").split(" ")[0] })}
            value={fmt(current?.spending ?? 0)}
            note={averages.spending > 0 ? t("A typical month is {amount}", { amount: fmt(averages.spending) }) : undefined}
          />
          <Stat
            label={t("Usually left over each month")}
            value={fmt(leftOver)}
            note={averages.income > 0 ? t("From {amount} coming in", { amount: fmt(averages.income) }) : t("No income found yet")}
          />
          <Stat
            label={t("Share of income you keep")}
            value={rate === null ? "—" : f.percent(rate, 0)}
            note={rate === null ? t("Add an account that receives your salary") : rate >= 20 ? t("Above the 20% rule of thumb") : t("20% is a good target")}
          />
        </div>
      </Panel>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <Panel>
          <PanelHeader title={t("Money in and out")} note={t("Per month")} />
          <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
            <MonthColumns data={months.map((m) => ({ ym: m.ym, income: m.income, spending: m.spending }))} currency={user.currency} />
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title={t("Where it goes")}
            note={t("Monthly average over {period}", { period })}
            action={<Link href="/spending" className="text-[13.5px] font-medium text-brand-ink underline-offset-2 hover:underline">{t("All spending")}</Link>}
          />
          <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
            <CategoryBars rows={totals} currency={user.currency} divisor={averages.months.length || 1} limit={6} hrefFor={(c) => `/spending?cat=${c}#transactions`} />
          </div>
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel className="flex flex-col">
          <PanelHeader title={t("Your plan")} note={profile ? t("{profile} investor", { profile: t(PROFILES[profile.level].name) }) : t("Not set up yet")} />
          <div className="flex flex-1 flex-col px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
            {profile && holdings && stats ? (
              <>
                <p className="text-[13px] text-ink-3">{t("Investing each month")}</p>
                <p className="figure mb-5 mt-1 text-[34px] leading-none text-ink">{fmt(profile.monthlyCents)}</p>
                <PlanBar byClass={stats.byClass} />
                <div className="mt-auto pt-6">
                  <ButtonLink href="/portfolio" variant="secondary" size="sm">{t("Open portfolio")}</ButtonLink>
                </div>
              </>
            ) : (
              <>
                <p className="max-w-md text-[15px] text-ink-2">
                  {t("Answer ten questions about your situation and how you feel about risk. Arvo works out your investor profile, how much you can afford to invest, and a portfolio to match.")}
                </p>
                <div className="mt-auto pt-6">
                  <ButtonLink href="/portfolio/profile">{t("Find your investor profile")}</ButtonLink>
                </div>
              </>
            )}
          </div>
        </Panel>

        <Panel className="flex flex-col">
          <PanelHeader
            title={t("Ways to save")}
            note={saving > 0 ? t("Up to {amount} a month", { amount: fmt(saving) }) : undefined}
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
                      <span className="tnum shrink-0 text-[13.5px] font-medium text-pos">{t("{amount}/mo", { amount: fmt(insight.saveCents) })}</span>
                    ) : null}
                  </li>
                ))}
                {!plus && lockedIdeas > 0 ? (
                  <li className="py-3">
                    <Link href="/plus" className="text-[14.5px] font-medium text-brand-ink underline underline-offset-2">
                      {lockedIdeas === 1 ? t("1 way to save with Plus") : t("{n} ways to save with Plus", { n: lockedIdeas })}
                    </Link>
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="text-[14.5px] text-ink-2">{t("Savings ideas appear once Arvo has a full month of transactions.")}</p>
            )}
            <div className="mt-auto pt-5">
              <ButtonLink href="/spending#save" variant="secondary" size="sm">{t("See the details")}</ButtonLink>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
