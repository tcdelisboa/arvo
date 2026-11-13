"use client";

import { useActionState, useMemo, useState } from "react";
import { saveInvestorProfile, type ProfileState } from "@/lib/actions/profile";
import { parseAmountToCents } from "@/lib/format";
import { msg } from "@/lib/i18n/core";
import { useI18n } from "./i18n";
import { recommendMonthly } from "@/lib/recommend";
import {
  BUFFER, DEBT, EXPERIENCE, GOAL, HORIZON, REACTION, STABILITY, TRADEOFF, type Choice,
} from "@/lib/risk";
import { Button, cx, Field, fieldClass, inputClass, Notice } from "./ui";
import { SubmitButton } from "./submit-button";

type Values = Record<string, string>;

const STEPS = [
  { title: msg("About you"), fields: ["age", "monthlyIncome", "stability"] },
  { title: msg("Your safety net"), fields: ["buffer", "debt"] },
  { title: msg("Your time frame"), fields: ["horizon", "goal"] },
  { title: msg("Your nerve"), fields: ["reaction", "tradeoff", "experience"] },
  { title: msg("How much to invest"), fields: ["monthly"] },
] as const;

function Choices({
  name,
  legend,
  help,
  choices,
  value,
  error,
  onChange,
}: {
  name: string;
  legend: string;
  help?: string;
  choices: Choice[];
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const { t } = useI18n();
  return (
    <fieldset>
      <legend className="text-[15.5px] font-semibold text-ink">{legend}</legend>
      {help ? <p className="mt-1 text-[13.5px] text-ink-2">{help}</p> : null}
      <div className="mt-3 grid gap-2">
        {choices.map((choice) => (
          <label
            key={choice.value}
            className="flex cursor-pointer items-center gap-3 rounded-control border border-line-strong bg-raised px-4 py-3 transition-colors hover:border-ink-3 has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus"
          >
            <input
              type="radio"
              name={name}
              value={choice.value}
              checked={value === choice.value}
              onChange={() => onChange(choice.value)}
              className="h-[18px] w-[18px] shrink-0 accent-[var(--brand)]"
            />
            <span className="min-w-0">
              <span className="block text-[14.5px] text-ink">{t(choice.label)}</span>
              {choice.hint ? <span className="block text-[12.5px] text-ink-3">{t(choice.hint)}</span> : null}
            </span>
          </label>
        ))}
      </div>
      {error ? <p role="alert" className="mt-2 text-[13px] text-neg">{t(error)}</p> : null}
    </fieldset>
  );
}

export function ProfileForm({
  initial,
  currency,
  averageSpendingCents,
  spendingMonths,
}: {
  initial: Values;
  currency: string;
  averageSpendingCents: number | null;
  spendingMonths: number;
}) {
  const [state, action] = useActionState<ProfileState, FormData>(saveInvestorProfile, null);
  const [values, setValues] = useState<Values>(initial);
  const [step, setStep] = useState(0);
  const [local, setLocal] = useState<Record<string, string>>({});
  const [touchedMonthly, setTouchedMonthly] = useState(!!initial.monthly);

  const set = (key: string) => (value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setLocal((e) => ({ ...e, [key]: "" }));
  };
  const { t, f } = useI18n();
  const money = f.money;
  const fmt = (cents: number) => money(cents, currency, { whole: true });
  const symbol = money(0, currency, { whole: true }).replace(/[\d\s]/g, "");

  const incomeCents = parseAmountToCents(values.monthlyIncome ?? "") ?? 0;
  const recommendation = useMemo(
    () =>
      recommendMonthly(
        { incomeCents, spendingCents: averageSpendingCents, buffer: values.buffer ?? "", debt: values.debt ?? "" },
        (cents) => money(cents, currency, { whole: true }),
        t,
      ),
    [incomeCents, averageSpendingCents, values.buffer, values.debt, currency, money, t],
  );

  // Until the person types their own amount, the field follows the suggestion.
  const monthlyText = touchedMonthly ? (values.monthly ?? "") : String(Math.round(recommendation.amountCents / 100));
  const monthlyCents = parseAmountToCents(monthlyText) ?? 0;
  const sliderMax = Math.max(500, Math.ceil(Math.max(incomeCents * 0.5, recommendation.amountCents * 2) / 100 / 50) * 50);
  const overSurplus = recommendation.surplusCents !== null && monthlyCents > Math.max(0, recommendation.surplusCents);

  const serverErrors = state?.errors ?? {};
  const errorFor = (key: string) => local[key] || serverErrors[key] || undefined;

  const validateStep = (index: number): boolean => {
    const errors: Record<string, string> = {};
    for (const field of STEPS[index].fields) {
      const value = (field === "monthly" ? monthlyText : values[field]) ?? "";
      if (field === "age") {
        const age = Number(value);
        if (!Number.isInteger(age) || age < 18 || age > 100) errors.age = msg("Enter your age (18 or over).");
      } else if (field === "monthlyIncome") {
        const cents = parseAmountToCents(value);
        if (cents === null || cents <= 0) errors.monthlyIncome = msg("Enter what you earn in a typical month, after tax.");
      } else if (field === "monthly") {
        const cents = parseAmountToCents(value);
        if (cents === null || cents < 0) errors.monthly = msg("Enter the amount you want to invest each month.");
      } else if (!value) {
        errors[field] = msg("Choose one of the options.");
      }
    }
    setLocal(errors);
    return Object.keys(errors).length === 0;
  };

  const next = () => {
    if (validateStep(step)) {
      setStep((s) => Math.min(STEPS.length - 1, s + 1));
      window.scrollTo({ top: 0 });
    }
  };

  const last = step === STEPS.length - 1;
  // If the server rejected something, say so on the last step with the field names.
  const serverErrorList = Object.values(serverErrors);

  return (
    <form
      action={action}
      noValidate
      onSubmit={(event) => {
        if (!last) {
          event.preventDefault();
          next();
        } else if (!validateStep(step)) {
          event.preventDefault();
        }
      }}
    >
      <div className="mb-7">
        <p className="text-[13px] text-ink-3">
          {t("Step {step} of {total}", { step: step + 1, total: STEPS.length })}
        </p>
        <div className="mt-2 flex gap-1.5" aria-hidden="true">
          {STEPS.map((s, i) => (
            <span key={s.title} className={cx("h-1 flex-1 rounded-full transition-colors", i <= step ? "bg-brand" : "bg-line-strong")} />
          ))}
        </div>
        <h2 className="display mt-5 text-[30px] text-ink sm:text-[34px]">{t(STEPS[step].title)}</h2>
      </div>

      {/* Every step stays in the form so all answers are submitted together. */}
      <div hidden={step !== 0} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("Your age")} htmlFor="age" error={errorFor("age") && t(errorFor("age")!)}>
            <input id="age" name="age" inputMode="numeric" autoComplete="off" value={values.age ?? ""} onChange={(e) => set("age")(e.target.value.replace(/\D/g, "").slice(0, 3))} className={inputClass} />
          </Field>
          <Field label={t("Monthly income after tax ({symbol})", { symbol })} htmlFor="monthlyIncome" hint={initial.monthlyIncome ? t("Filled in from your transactions. Change it if it is wrong.") : undefined} error={errorFor("monthlyIncome") && t(errorFor("monthlyIncome")!)}>
            <input id="monthlyIncome" name="monthlyIncome" inputMode="decimal" autoComplete="off" value={values.monthlyIncome ?? ""} onChange={(e) => set("monthlyIncome")(e.target.value)} className={inputClass} />
          </Field>
        </div>
        <Choices name="stability" legend={t("How steady is your income?")} choices={STABILITY} value={values.stability ?? ""} error={errorFor("stability")} onChange={set("stability")} />
      </div>

      <div hidden={step !== 1} className="space-y-7">
        <Choices
          name="buffer"
          legend={t("Do you have an emergency fund?")}
          help={t("Money you could reach within a few days if you lost your income or faced a large bill.")}
          choices={BUFFER}
          value={values.buffer ?? ""}
          error={errorFor("buffer")}
          onChange={set("buffer")}
        />
        <Choices name="debt" legend={t("Do you have any high-interest debt?")} choices={DEBT} value={values.debt ?? ""} error={errorFor("debt")} onChange={set("debt")} />
      </div>

      <div hidden={step !== 2} className="space-y-7">
        <Choices
          name="horizon"
          legend={t("When will you need this money?")}
          help={t("Think of the earliest point at which you would have to sell most of it.")}
          choices={HORIZON}
          value={values.horizon ?? ""}
          error={errorFor("horizon")}
          onChange={set("horizon")}
        />
        <Choices name="goal" legend={t("What matters most to you?")} choices={GOAL} value={values.goal ?? ""} error={errorFor("goal")} onChange={set("goal")} />
      </div>

      <div hidden={step !== 3} className="space-y-7">
        <Choices
          name="reaction"
          legend={t("You invested {amount} and in a few months it is worth {now}. What do you do?", { amount: fmt(100000), now: fmt(80000) })}
          help={t("Be honest. There is no right answer, only the one you would really give.")}
          choices={REACTION}
          value={values.reaction ?? ""}
          error={errorFor("reaction")}
          onChange={set("reaction")}
        />
        <Choices
          name="tradeoff"
          legend={t("Which kind of ride could you live with?")}
          help={t("What {amount} could be worth after one year. Bigger possible gains always come with bigger possible falls.", { amount: fmt(100000) })}
          choices={TRADEOFF.map((choice) => ({ ...choice, hint: t("{low} to {high}", { low: fmt(Math.round(100000 * choice.range[0])), high: fmt(Math.round(100000 * choice.range[1])) }) }))}
          value={values.tradeoff ?? ""}
          error={errorFor("tradeoff")}
          onChange={set("tradeoff")}
        />
        <Choices name="experience" legend={t("How much investing have you done?")} choices={EXPERIENCE} value={values.experience ?? ""} error={errorFor("experience")} onChange={set("experience")} />
      </div>

      <div hidden={step !== 4} className="space-y-6">
        <div className="rounded-panel border border-line bg-surface p-5 sm:p-6">
          <p className="text-[13px] text-ink-3">{t("Arvo suggests investing")}</p>
          <p className="figure mt-1 text-[44px] leading-none text-ink">
            {fmt(recommendation.amountCents)}
            <span className="font-sans text-[15px] font-normal text-ink-3"> {t("a month")}</span>
          </p>
          {recommendation.first ? (
            <p className="mt-3 text-[14px] font-medium text-accent-ink">{t("First: {step}.", { step: recommendation.first.toLowerCase() })}</p>
          ) : null}
          <ul className="mt-4 space-y-2 text-[14px] leading-relaxed text-ink-2">
            {recommendation.reasons.map((reason) => (
              <li key={reason} className="flex gap-2.5">
                <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-ink-3" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
          {averageSpendingCents !== null ? (
            <p className="mt-4 text-[12.5px] text-ink-3">
              {spendingMonths === 1
                ? t("Based on your spending over the last full month.")
                : t("Based on your spending over the last {n} full months.", { n: spendingMonths })}
            </p>
          ) : null}
        </div>

        <Field label={t("Amount you will invest each month ({symbol})", { symbol })} htmlFor="monthly" hint={t("Start with the suggestion or set your own. You can change it at any time.")} error={errorFor("monthly") && t(errorFor("monthly")!)}>
          <input
            id="monthly"
            name="monthly"
            inputMode="decimal"
            autoComplete="off"
            value={monthlyText}
            onChange={(e) => {
              setTouchedMonthly(true);
              set("monthly")(e.target.value);
            }}
            className={cx(fieldClass, "figure block h-14 w-full px-4 text-[26px]")}
          />
        </Field>
        <input
          type="range"
          aria-label={t("Monthly amount")}
          min={0}
          max={sliderMax}
          step={sliderMax > 2000 ? 25 : 5}
          value={Math.min(sliderMax, Math.round(monthlyCents / 100))}
          onChange={(e) => {
            setTouchedMonthly(true);
            set("monthly")(e.target.value);
          }}
          style={{ "--fill": `${Math.min(100, (monthlyCents / 100 / sliderMax) * 100)}%` } as React.CSSProperties}
        />
        {overSurplus ? (
          <Notice tone="accent">
            {t("That is more than the {amount} you usually have left over. Only invest money you will not need for everyday costs.", { amount: fmt(Math.max(0, recommendation.surplusCents ?? 0)) })}
          </Notice>
        ) : null}
        {serverErrorList.length ? <Notice tone="neg">{t("Some answers need another look:")} {serverErrorList.map((e) => t(e)).join(" ")}</Notice> : null}
      </div>

      <div className="mt-9 flex items-center justify-between gap-3">
        {step > 0 ? (
          <Button type="button" variant="ghost" onClick={() => setStep((s) => s - 1)}>
            {t("Back")}
          </Button>
        ) : (
          <span />
        )}
        {last ? (
          <SubmitButton size="lg" pendingLabel={t("Building your portfolio")}>{t("See my portfolio")}</SubmitButton>
        ) : (
          <Button type="submit" size="lg">{t("Continue")}</Button>
        )}
      </div>
    </form>
  );
}
