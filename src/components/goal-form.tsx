"use client";

import { useActionState, useState } from "react";
import { createGoal, type GoalFormState } from "@/lib/actions/goals";
import { GOAL_KIND_LABEL, GOAL_KINDS, type GoalKind } from "@/lib/savings-goals";
import { cx, Field, inputClass, Notice } from "./ui";
import { SubmitButton } from "./submit-button";
import { useI18n } from "./i18n";
import { GOAL_ICON } from "./goal-icons";

/** New savings goal: what, how much, what is already there, and optionally by when. */
export function GoalForm({ currency, askMonthly }: { currency: string; askMonthly: boolean }) {
  const [state, action] = useActionState<GoalFormState, FormData>(createGoal, null);
  const [kind, setKind] = useState<GoalKind | null>(null);
  const { t, f } = useI18n();
  const symbol = f.money(0, currency, { whole: true }).replace(/[\d\s]/g, "");
  const error = (field: string) => (state?.fields?.[field] ? t(state.fields[field]) : undefined);

  return (
    <form action={action} className="space-y-5">
      {state?.error ? <Notice tone="neg">{t(state.error)}</Notice> : null}
      <fieldset>
        <legend className="mb-2 text-[13.5px] font-medium text-ink">{t("What are you saving for?")}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {GOAL_KINDS.map((key) => {
            const Icon = GOAL_ICON[key];
            return (
              <label
                key={key}
                className={cx(
                  "flex cursor-pointer flex-col items-center gap-1.5 rounded-control border px-3 py-3 text-center text-[13.5px] transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus",
                  kind === key ? "border-brand bg-brand-soft font-medium text-brand-ink" : "border-line-strong bg-raised text-ink hover:border-ink-3",
                )}
              >
                <input type="radio" name="kind" value={key} className="sr-only" onChange={() => setKind(key)} required />
                <Icon size={20} aria-hidden />
                {t(GOAL_KIND_LABEL[key])}
              </label>
            );
          })}
        </div>
        {error("kind") ? <p role="alert" className="mt-2 text-[13px] text-neg">{error("kind")}</p> : null}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("Name it (optional)")} htmlFor="goal-name">
          <input id="goal-name" name="name" maxLength={60} placeholder={kind ? t(GOAL_KIND_LABEL[kind]) : ""} className={inputClass} />
        </Field>
        <Field
          label={t("How much it costs ({symbol})", { symbol })}
          htmlFor="goal-target"
          hint={kind === "home" ? t("For a home, use the down payment you need, not the full price.") : undefined}
          error={error("target")}
        >
          <input id="goal-target" name="target" inputMode="decimal" required className={inputClass} />
        </Field>
        <Field label={t("Already saved for it ({symbol})", { symbol })} htmlFor="goal-saved" error={error("saved")}>
          <input id="goal-saved" name="saved" inputMode="decimal" placeholder="0" className={inputClass} />
        </Field>
        <Field label={t("By when? (optional)")} htmlFor="goal-date" hint={t("Leave it empty to see how soon you could get there.")} error={error("date")}>
          <input id="goal-date" name="date" type="month" placeholder={t("MM/YYYY")} className={inputClass} />
        </Field>
        {askMonthly ? (
          <Field
            label={t("How much can you put aside each month? ({symbol})", { symbol })}
            htmlFor="goal-monthly"
            hint={t("Arvo has no transactions yet, so start from your own estimate.")}
          >
            <input id="goal-monthly" name="monthly" inputMode="decimal" className={inputClass} />
          </Field>
        ) : null}
      </div>
      <SubmitButton pendingLabel={t("Working it out")}>{t("See how to get there")}</SubmitButton>
    </form>
  );
}
