import Link from "next/link";
import { Plus } from "lucide-react";
import { todayIso } from "@/lib/format";
import { listGoals } from "@/lib/goals-data";
import { getI18n } from "@/lib/i18n/server";
import { regionFor } from "@/lib/portfolio";
import { monthAfter, monthsAt } from "@/lib/savings-goals";
import { GOAL_ICON } from "./goal-icons";
import { ButtonLink, Panel, PanelHeader } from "./ui";

/** Open goals on the overview, each with its progress and when it should be reached. */
export async function GoalsPanel({ userId, currency }: { userId: string; currency: string }) {
  const { t, f } = await getI18n();
  const goals = (await listGoals(userId)).filter((g) => !g.done);
  const fmt = (cents: number) => f.money(cents, currency, { whole: true });
  const current = todayIso().slice(0, 7);
  const region = regionFor(currency);

  return (
    <Panel>
      <PanelHeader
        title={t("Your goals")}
        note={goals.length ? undefined : t("A car, a trip, the down payment on a home: see how long it takes and how to get there sooner.")}
        action={goals.length ? <Link href="/goals" className="text-[13.5px] font-medium text-brand-ink underline-offset-2 hover:underline">{t("All goals")}</Link> : null}
      />
      <div className="px-5 pb-5 pt-3 sm:px-6 sm:pb-6">
        {goals.length ? (
          <ul className="space-y-4">
            {goals.slice(0, 3).map((goal) => {
              const Icon = GOAL_ICON[goal.kind];
              const months = goal.monthlyCents != null ? monthsAt(goal.targetCents, goal.savedCents, goal.monthlyCents, region) : null;
              const pct = Math.min(100, (goal.savedCents / goal.targetCents) * 100);
              return (
                <li key={goal.id}>
                  <Link href={`/goals#goal-${goal.id}`} className="group block">
                    <div className="flex items-center justify-between gap-3 text-[14.5px]">
                      <span className="flex min-w-0 items-center gap-2 font-medium text-ink group-hover:underline">
                        <Icon size={16} className="shrink-0 text-ink-3" aria-hidden />
                        <span className="truncate">{goal.name}</span>
                      </span>
                      <span className="tnum shrink-0 text-ink-2">{t("{saved} of {target}", { saved: fmt(goal.savedCents), target: fmt(goal.targetCents) })}</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-sunken">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-[12.5px] text-ink-3">
                      {goal.monthlyCents == null
                        ? t("Pick a path to see when you get there")
                        : months === null
                          ? t("Not reachable at {amount} a month", { amount: fmt(goal.monthlyCents) })
                          : t("{amount} a month, ready in {month}", { amount: fmt(goal.monthlyCents), month: f.month(monthAfter(current, months), "long") })}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <ButtonLink href="/goals" variant="secondary" size="sm"><Plus size={16} /> {t("Set a goal")}</ButtonLink>
        )}
      </div>
    </Panel>
  );
}
