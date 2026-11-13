import { Undo2 } from "lucide-react";
import { addContribution, setEmergencySaved, undoContribution } from "@/lib/actions/tracking";
import { todayIso } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { emergencyTarget, lastMonths, streak } from "@/lib/progress";
import { addMonths } from "@/lib/spending";
import { contributionTotals, getTracking, lastContribution } from "@/lib/tracking";
import { cx, fieldClass, Panel, PanelHeader } from "./ui";
import { SubmitButton } from "./submit-button";

function Bar({ value, max, tone = "brand" }: { value: number; max: number; tone?: "brand" | "accent" }) {
  const width = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-sunken">
      <div className={cx("h-full rounded-full", tone === "brand" ? "bg-brand" : "bg-accent")} style={{ width: `${width}%` }} />
    </div>
  );
}

/**
 * The monthly habit, on the overview and the portfolio: this month's
 * contribution against the plan, the last six months, and the emergency fund.
 */
export async function MonthlyPanel({
  userId,
  currency,
  plannedCents,
  spendingCents,
  incomeCents,
  stability,
}: {
  userId: string;
  currency: string;
  /** The monthly amount from the investor profile, if there is one. */
  plannedCents: number | null;
  spendingCents: number | null;
  incomeCents: number | null;
  stability: string | null;
}) {
  const { t, f } = await getI18n();
  const current = todayIso().slice(0, 7);
  const [totals, last, tracking] = await Promise.all([
    contributionTotals(userId, addMonths(current, -24)),
    lastContribution(userId),
    getTracking(userId),
  ]);
  const fmt = (cents: number) => f.money(cents, currency, { whole: true });
  const thisMonth = totals.find((row) => row.ym === current)?.cents ?? 0;
  const months = lastMonths(totals, current, 6);
  const run = streak(totals, current);
  const peak = Math.max(plannedCents ?? 0, ...months.map((m) => m.cents), 1);
  const target = emergencyTarget({ spendingCents, incomeCents, stability });
  const saved = tracking.emergencyCents;
  const symbol = f.money(0, currency, { whole: true }).replace(/[\d\s]/g, "");
  const monthOptions = [current, addMonths(current, -1), addMonths(current, -2)];

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel className="flex flex-col">
        <PanelHeader
          title={t("Invested this month")}
          note={
            run >= 2
              ? t("{n} months in a row", { n: run })
              : run === 1
                ? t("1 month so far. Keep it going next month.")
                : t("Log what you actually put in, so you can see the habit grow.")
          }
        />
        <div className="flex flex-1 flex-col px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
          <p className="figure text-[34px] leading-none text-ink">
            {fmt(thisMonth)}
            {plannedCents ? <span className="font-sans text-[14px] font-normal text-ink-3"> {t("of {amount} planned", { amount: fmt(plannedCents) })}</span> : null}
          </p>
          {plannedCents ? (
            <div className="mt-3">
              <Bar value={thisMonth} max={plannedCents} />
            </div>
          ) : null}

          <ol className="mt-5 grid grid-cols-6 items-end gap-2" aria-label={t("Invested in the last six months")}>
            {months.map((m) => (
              <li key={m.ym} className="flex flex-col items-center gap-1.5">
                <div className="relative flex h-16 w-full items-end justify-center rounded-md bg-sunken" title={`${f.month(m.ym, "long")}: ${fmt(m.cents)}`}>
                  {plannedCents ? (
                    <span className="absolute inset-x-0 border-t border-dashed border-ink-3/60" style={{ bottom: `${(plannedCents / peak) * 100}%` }} />
                  ) : null}
                  <span
                    className={cx("w-full rounded-md", m.cents > 0 ? "bg-brand" : "")}
                    style={{ height: `${(m.cents / peak) * 100}%` }}
                  />
                </div>
                <span className={cx("text-[11.5px]", m.ym === current ? "font-semibold text-ink" : "text-ink-3")}>{f.month(m.ym)}</span>
              </li>
            ))}
          </ol>
          {plannedCents ? <p className="mt-2 text-[12px] text-ink-3">{t("The dashed line is your plan.")}</p> : null}

          <form action={addContribution} className="mt-auto flex flex-wrap items-end gap-2 pt-5">
            <div className="min-w-[120px] flex-1">
              <label htmlFor="contribution" className="mb-1.5 block text-[13px] text-ink-3">
                {t("Amount invested ({symbol})", { symbol })}
              </label>
              <input id="contribution" name="amount" inputMode="decimal" required placeholder={plannedCents ? String(Math.round(plannedCents / 100)) : ""} className={cx(fieldClass, "block h-11 w-full px-3.5 text-base sm:text-[15px]")} />
            </div>
            <select name="ym" aria-label={t("Month")} defaultValue={current} className={cx(fieldClass, "h-11 px-3 text-base sm:text-[15px]")}>
              {monthOptions.map((ym) => (
                <option key={ym} value={ym}>{f.month(ym, "long")}</option>
              ))}
            </select>
            <SubmitButton pendingLabel={t("Saving")}>{t("Log it")}</SubmitButton>
          </form>
          {last ? (
            <form action={undoContribution} className="mt-2">
              <button type="submit" className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-3 underline-offset-2 hover:text-ink hover:underline">
                <Undo2 size={13} /> {t("Undo the last entry ({amount}, {month})", { amount: fmt(last.cents), month: f.month(last.ym, "long") })}
              </button>
            </form>
          ) : null}
        </div>
      </Panel>

      <Panel className="flex flex-col">
        <PanelHeader
          title={t("Emergency fund")}
          note={
            target
              ? target.basis === "spending"
                ? t("Goal: {n} months of your usual spending", { n: target.months })
                : t("Goal: about {n} months of your income, until Arvo sees your spending", { n: target.months })
              : t("Add your transactions or answer the investor questions to get a goal.")
          }
        />
        <div className="flex flex-1 flex-col px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
          {target ? (
            <>
              <p className="figure text-[34px] leading-none text-ink">
                {saved === null ? "—" : fmt(saved)}
                <span className="font-sans text-[14px] font-normal text-ink-3"> {t("of {amount}", { amount: fmt(target.targetCents) })}</span>
              </p>
              <div className="mt-3">
                <Bar value={saved ?? 0} max={target.targetCents} tone={saved !== null && saved >= target.targetCents ? "brand" : "accent"} />
              </div>
              <p className="mt-3 text-[13.5px] text-ink-2">
                {saved === null
                  ? t("Tell Arvo how much you already have set aside.")
                  : saved >= target.targetCents
                    ? t("Done. Your safety net is in place, so more of what you save can be invested.")
                    : t("{amount} to go. Keep it somewhere safe and easy to reach, not in shares.", { amount: fmt(target.targetCents - saved) })}
              </p>
            </>
          ) : null}
          <form action={setEmergencySaved} className="mt-auto flex items-end gap-2 pt-5">
            <div className="flex-1">
              <label htmlFor="saved" className="mb-1.5 block text-[13px] text-ink-3">
                {t("Already set aside ({symbol})", { symbol })}
              </label>
              <input id="saved" name="saved" inputMode="decimal" required defaultValue={saved === null ? "" : Math.round(saved / 100)} key={saved ?? "none"} className={cx(fieldClass, "block h-11 w-full px-3.5 text-base sm:text-[15px]")} />
            </div>
            <SubmitButton variant="secondary" pendingLabel={t("Saving")}>{t("Update")}</SubmitButton>
          </form>
        </div>
      </Panel>
    </div>
  );
}
