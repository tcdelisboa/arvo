import Link from "next/link";
import { Check, Lock, Trash2, Undo2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getI18n, titled } from "@/lib/i18n/server";
import { msg, type T } from "@/lib/i18n/core";
import type { Fmt } from "@/lib/format";
import { todayIso } from "@/lib/format";
import { choosePath, deleteGoal, depositToGoal, undoGoalDeposit } from "@/lib/actions/goals";
import { goalContext, lastDeposit, listGoals, type Goal, type GoalContext } from "@/lib/goals-data";
import { FREE_GOALS } from "@/lib/plan";
import { emergencyTarget } from "@/lib/progress";
import {
  goalPaths,
  keepFor,
  monthAfter,
  monthlyNeeded,
  monthsAt,
  monthsBetween,
  PATH_LABEL,
  rateFor,
  type GoalPath,
  type Keep,
} from "@/lib/savings-goals";
import { getTracking } from "@/lib/tracking";
import { GoalForm } from "@/components/goal-form";
import { GOAL_ICON } from "@/components/goal-icons";
import { SubmitButton } from "@/components/submit-button";
import { Badge, ButtonLink, cx, fieldClass, Notice, PageHeader, Panel, PanelHeader } from "@/components/ui";

export const generateMetadata = titled(msg("Goals"));

const PATH_NOTE: Record<GoalPath["key"], string> = {
  light: msg("Keep living as you do now and put aside what is already left over."),
  balanced: msg("Act on the biggest savings Arvo found, about half of what they are worth."),
  radical: msg("Act on every saving Arvo found and trim 15% more off the rest of your flexible spending."),
};

const KEEP_TEXT: Record<"br" | "eu", Record<Keep, string>> = {
  br: {
    cash: msg("Under two years away: keep it in Tesouro Selic, a CDB with daily liquidity from a large bank, or LFTS11. Not in shares: a fall just before the date would cost you the goal."),
    bonds: msg("Two to five years away: Tesouro IPCA+ maturing close to your date (or B5P211) protects it from inflation. Keep shares to a small part, if any."),
    mixed: msg("More than five years away: part of it can go into your portfolio and grow faster. Move it to Tesouro Selic as the date gets close."),
  },
  eu: {
    cash: msg("Under two years away: keep it in a high-interest savings account or a money-market fund such as XEON. Not in shares: a fall just before the date would cost you the goal."),
    bonds: msg("Two to five years away: short-term government bonds or a fixed-term deposit, maturing close to your date. Keep shares to a small part, if any."),
    mixed: msg("More than five years away: part of it can go into your portfolio and grow faster. Move it somewhere safe as the date gets close."),
  },
};

function eta(months: number | null, current: string, t: T, f: Fmt): string {
  if (months === null) return t("Not at this pace");
  if (months === 0) return t("Already there");
  const when = f.month(monthAfter(current, months), "long");
  return months === 1 ? t("Next month, {when}", { when }) : t("In {n} months, {when}", { n: months, when });
}

async function GoalCard({ goal, context, otherGoalsCents, plus, currency }: { goal: Goal; context: GoalContext; otherGoalsCents: number; plus: boolean; currency: string }) {
  const { t, f } = await getI18n();
  const current = todayIso().slice(0, 7);
  const fmt = (cents: number) => f.money(cents, currency, { whole: true });
  const Icon = GOAL_ICON[goal.kind];
  const progress = goal.targetCents > 0 ? Math.min(100, (goal.savedCents / goal.targetCents) * 100) : 0;
  const last = await lastDeposit(goal.id);
  const available = context.leftOverCents === null ? null : context.leftOverCents - otherGoalsCents;
  const paths = goalPaths({
    targetCents: goal.targetCents,
    savedCents: goal.savedCents,
    availableCents: available,
    statedMonthlyCents: context.hasSpending ? null : goal.monthlyCents,
    ideas: context.ideas,
    flexibleCents: context.flexibleCents,
    region: context.region,
  });
  const chosen = goal.path ? paths.find((p) => p.key === goal.path) : null;
  const committedMonths = goal.monthlyCents != null ? monthsAt(goal.targetCents, goal.savedCents, goal.monthlyCents, context.region) : null;
  const byDateFirst = goal.targetYm ? Math.max(1, monthsBetween(current, goal.targetYm)) : null;
  // Where the money waits depends on when it will be spent: the committed plan, else the chosen date, else the light path.
  const keep = keepFor(goal.monthlyCents != null ? committedMonths : (byDateFirst ?? paths[0].months ?? paths[1].months));
  const byDate = goal.targetYm ? Math.max(1, monthsBetween(current, goal.targetYm)) : null;
  const needed = byDate ? monthlyNeeded(goal.targetCents, goal.savedCents, byDate, rateFor(context.region, keepFor(byDate))) : null;
  const symbol = f.money(0, currency, { whole: true }).replace(/[\d\s]/g, "");

  return (
    <Panel id={`goal-${goal.id}`} className="scroll-mt-6">
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-brand-ink"><Icon size={21} aria-hidden /></span>
          <div>
            <h2 className="text-[19px] font-semibold text-ink">{goal.name}</h2>
            <p className="text-[13.5px] text-ink-3">
              {goal.targetYm ? t("{amount} by {month}", { amount: fmt(goal.targetCents), month: f.month(goal.targetYm, "long") }) : fmt(goal.targetCents)}
            </p>
          </div>
        </div>
        {goal.done ? <Badge tone="brand"><Check size={13} /> {t("Reached")}</Badge> : null}
      </div>

      <div className="px-5 pt-5 sm:px-6">
        <p className="figure text-[32px] leading-none text-ink">
          {fmt(goal.savedCents)}
          <span className="font-sans text-[14px] font-normal text-ink-3"> {t("of {amount}", { amount: fmt(goal.targetCents) })}</span>
        </p>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-sunken">
          <div className="h-full rounded-full bg-brand" style={{ width: `${progress}%` }} />
        </div>
        {!goal.done && goal.monthlyCents != null ? (
          <p className="mt-3 text-[14px] text-ink-2">
            {t("Your plan: {amount} a month.", { amount: fmt(goal.monthlyCents) })} <span className="font-medium text-ink">{eta(committedMonths, current, t, f)}</span>
            {goal.targetYm && committedMonths !== null && byDate !== null
              ? committedMonths <= byDate
                ? <span className="text-pos"> {t("On time for {month}.", { month: f.month(goal.targetYm, "long") })}</span>
                : <span className="text-neg"> {t("Later than {month}.", { month: f.month(goal.targetYm, "long") })}</span>
              : null}
          </p>
        ) : null}
        {!goal.done && needed !== null && goal.targetYm && byDate !== null ? (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="text-[13.5px] text-ink-3">
              {t("To have it by {month} you need about {amount} a month.", { month: f.month(goal.targetYm, "long"), amount: fmt(needed) })}
              {context.hasSpending && paths[2].months !== null && paths[2].months > byDate ? (
                <span className="text-ink-2">
                  {" "}
                  {t("Even the radical path gets there later. Either move the date to {month} or find another {amount} a month.", {
                    month: f.month(monthAfter(current, paths[2].months), "long"),
                    amount: fmt(Math.max(0, needed - paths[2].monthlyCents)),
                  })}
                </span>
              ) : null}
            </p>
            {goal.path === "date" && goal.monthlyCents === needed ? null : (
              <form action={choosePath}>
                <input type="hidden" name="goal" value={goal.id} />
                <input type="hidden" name="path" value="date" />
                <input type="hidden" name="monthly" value={needed} />
                <button type="submit" className="text-[13px] font-medium text-brand-ink underline underline-offset-2">
                  {t("Plan for {amount} a month to keep the date", { amount: fmt(needed) })}
                </button>
              </form>
            )}
          </div>
        ) : null}
      </div>

      {!goal.done ? (
        <div className="mt-5 border-t border-line px-5 py-5 sm:px-6">
          <h3 className="text-[14.5px] font-semibold text-ink">{t("Three ways to get there")}</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {paths.map((path) => {
              const isChosen = chosen?.key === path.key;
              const blocked = path.key !== "light" && !context.hasSpending;
              return (
                <div key={path.key} className={cx("flex flex-col rounded-control border p-4", isChosen ? "border-brand bg-brand-soft" : "border-line bg-raised")}>
                  <p className="text-[14px] font-semibold text-ink-2">{t(PATH_LABEL[path.key])}</p>
                  {blocked ? (
                    <p className="mt-2 flex-1 text-[13.5px] text-ink-2">{t("Import a statement and Arvo shows how cutting specific costs gets you there faster.")}</p>
                  ) : (
                    <>
                      <p className="figure mt-1.5 text-[24px] leading-none text-ink">
                        {fmt(path.monthlyCents)}<span className="font-sans text-[13px] font-normal text-ink-3"> {t("a month")}</span>
                      </p>
                      <p className="mt-1.5 text-[14px] font-medium text-ink">{eta(path.months, current, t, f)}</p>
                      <p className="mt-2 text-[13px] text-ink-3">{t(PATH_NOTE[path.key])}</p>
                      {path.cuts.length || path.extraCents ? (
                        plus ? (
                          <ul className="mt-3 space-y-1.5 text-[13px] text-ink-2">
                            {path.cuts.map((cut) => (
                              <li key={cut.title} className="flex justify-between gap-3">
                                <span>{cut.title}</span>
                                <span className="tnum shrink-0 text-ink">{t("+{amount}", { amount: fmt(cut.cents) })}</span>
                              </li>
                            ))}
                            {path.extraCents ? (
                              <li className="flex justify-between gap-3">
                                <span>{t("15% less on other flexible spending")}</span>
                                <span className="tnum shrink-0 text-ink">{t("+{amount}", { amount: fmt(path.extraCents) })}</span>
                              </li>
                            ) : null}
                          </ul>
                        ) : (
                          <Link href="/plus" className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-ink underline-offset-2 hover:underline">
                            <Lock size={13} />
                            {t("See the exact cuts with Plus")}
                          </Link>
                        )
                      ) : null}
                      <div className="mt-auto pt-4">
                        {isChosen ? (
                          <div className="space-y-2">
                            <p className="flex items-center gap-1.5 text-[13.5px] font-medium text-brand-ink"><Check size={15} /> {t("Your path")}</p>
                            {goal.monthlyCents !== path.monthlyCents && path.monthlyCents > 0 ? (
                              <form action={choosePath}>
                                <input type="hidden" name="goal" value={goal.id} />
                                <input type="hidden" name="path" value={path.key} />
                                <input type="hidden" name="monthly" value={path.monthlyCents} />
                                <button type="submit" className="text-[12.5px] text-ink-2 underline underline-offset-2 hover:text-ink">
                                  {t("Your numbers changed. Update the plan to {amount}", { amount: fmt(path.monthlyCents) })}
                                </button>
                              </form>
                            ) : null}
                          </div>
                        ) : (
                          <form action={choosePath}>
                            <input type="hidden" name="goal" value={goal.id} />
                            <input type="hidden" name="path" value={path.key} />
                            <input type="hidden" name="monthly" value={path.monthlyCents} />
                            <SubmitButton variant="secondary" size="sm" pendingLabel={t("Saving")} disabled={path.monthlyCents <= 0}>{t("Choose this path")}</SubmitButton>
                          </form>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          {context.hasSpending && (available ?? 0) <= 0 ? (
            <p className="mt-3 text-[13px] text-ink-3">
              {t("Right now nothing is left over after your spending, your investing plan and your other goals, so the light path stays at zero. The other two show what cutting would free up.")}
            </p>
          ) : null}
        </div>
      ) : null}

      {!goal.done ? (
        <div className="border-t border-line px-5 py-5 sm:px-6">
          <h3 className="text-[14.5px] font-semibold text-ink">{t("Where to keep this money")}</h3>
          <p className="mt-1.5 max-w-3xl text-[14px] text-ink-2">{t(KEEP_TEXT[context.region][keep])}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-4 border-t border-line px-5 py-5 sm:px-6">
        <form action={depositToGoal} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="goal" value={goal.id} />
          <div>
            <label htmlFor={`deposit-${goal.id}`} className="mb-1.5 block text-[13px] text-ink-3">{t("Put money in ({symbol})", { symbol })}</label>
            <input id={`deposit-${goal.id}`} name="amount" inputMode="decimal" required placeholder={goal.monthlyCents ? String(Math.round(goal.monthlyCents / 100)) : ""} className={cx(fieldClass, "block h-11 w-40 px-3.5 text-base sm:text-[15px]")} />
          </div>
          <SubmitButton pendingLabel={t("Saving")}>{t("Add")}</SubmitButton>
        </form>
        <div className="flex flex-wrap items-center gap-4">
          {last ? (
            <form action={undoGoalDeposit}>
              <input type="hidden" name="goal" value={goal.id} />
              <button type="submit" className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-3 underline-offset-2 hover:text-ink hover:underline">
                <Undo2 size={13} /> {t("Undo the last one ({amount})", { amount: fmt(last.cents) })}
              </button>
            </form>
          ) : null}
          <form action={deleteGoal}>
            <input type="hidden" name="goal" value={goal.id} />
            <button type="submit" className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-3 underline-offset-2 hover:text-neg hover:underline">
              <Trash2 size={13} /> {t("Remove goal")}
            </button>
          </form>
        </div>
      </div>
    </Panel>
  );
}

export default async function GoalsPage() {
  const user = await requireUser();
  const { t, f } = await getI18n();
  const fmt = (cents: number) => f.money(cents, user.currency, { whole: true });
  const [goals, context, tracking] = await Promise.all([listGoals(user.id), goalContext(user.id, user.currency, t, fmt), getTracking(user.id)]);
  const plus = user.plan === "plus";
  const open = goals.filter((g) => !g.done);
  const canAdd = plus || open.length < FREE_GOALS;
  const committed = (g: Goal) => (!g.done && g.monthlyCents != null ? g.monthlyCents : 0);
  const emergency = emergencyTarget({ spendingCents: context.spendingCents, incomeCents: context.incomeCents, stability: context.stability });
  const emergencyShort = emergency && (tracking.emergencyCents ?? 0) < emergency.targetCents;

  return (
    <>
      <PageHeader title={t("Goals")} lead={t("Something you want to buy or do. Arvo shows how long it takes and what would get you there sooner.")} />

      {emergencyShort ? (
        <div className="mb-5">
          <Notice action={<Link href="/overview" className="font-medium underline underline-offset-2">{t("Update it")}</Link>}>
            {t("Your emergency fund is not complete yet. Finishing it first means an unexpected bill does not eat into your goals.")}
          </Notice>
        </div>
      ) : null}

      <div className="space-y-5">
        {goals.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            context={context}
            otherGoalsCents={goals.filter((g) => g.id !== goal.id).reduce((sum, g) => sum + committed(g), 0)}
            plus={plus}
            currency={user.currency}
          />
        ))}

        <Panel>
          <PanelHeader title={goals.length ? t("Add another goal") : t("Set your first goal")} note={goals.length ? undefined : t("A car, a trip, the down payment on a home: anything with a price.")} />
          <div className="px-5 pb-6 pt-4 sm:px-6">
            {canAdd ? (
              <GoalForm currency={user.currency} askMonthly={!context.hasSpending} />
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="max-w-lg text-[14.5px] text-ink-2">{t("Free keeps one goal open at a time. With Plus you can save for as many things as you like, each with its own plan.")}</p>
                <ButtonLink href="/plus" variant="secondary" size="sm">{t("See what Plus includes")}</ButtonLink>
              </div>
            )}
          </div>
        </Panel>
      </div>

      <p className="mt-6 max-w-3xl text-[12.5px] leading-relaxed text-ink-3">
        {context.region === "br"
          ? t("Times include a modest return on the money while it waits, after inflation, so they are in today's money. They are estimates, not promises.")
          : t("Times include a modest return on the money while it waits, before inflation and tax. They are estimates, not promises.")}
      </p>
    </>
  );
}
