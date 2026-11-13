"use client";

import { useActionState, useMemo, useState } from "react";
import { saveInvestorProfile, type ProfileState } from "@/lib/actions/profile";
import { money, parseAmountToCents } from "@/lib/format";
import { recommendMonthly } from "@/lib/recommend";
import {
  BUFFER, DEBT, EXPERIENCE, GOAL, HORIZON, REACTION, STABILITY, TRADEOFF, type Choice,
} from "@/lib/risk";
import { Button, cx, Field, fieldClass, inputClass, Notice } from "./ui";
import { SubmitButton } from "./submit-button";

type Values = Record<string, string>;

const STEPS = [
  { title: "About you", fields: ["age", "monthlyIncome", "stability"] },
  { title: "Your safety net", fields: ["buffer", "debt"] },
  { title: "Your time frame", fields: ["horizon", "goal"] },
  { title: "Your nerve", fields: ["reaction", "tradeoff", "experience"] },
  { title: "How much to invest", fields: ["monthly"] },
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
              <span className="block text-[14.5px] text-ink">{choice.label}</span>
              {choice.hint ? <span className="block text-[12.5px] text-ink-3">{choice.hint}</span> : null}
            </span>
          </label>
        ))}
      </div>
      {error ? <p role="alert" className="mt-2 text-[13px] text-neg">{error}</p> : null}
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
  const fmt = (cents: number) => money(cents, currency, { whole: true });
  const symbol = money(0, currency, { whole: true }).replace(/[\d\s]/g, "");

  const incomeCents = parseAmountToCents(values.monthlyIncome ?? "") ?? 0;
  const recommendation = useMemo(
    () =>
      recommendMonthly(
        { incomeCents, spendingCents: averageSpendingCents, buffer: values.buffer ?? "", debt: values.debt ?? "" },
        (cents) => money(cents, currency, { whole: true }),
      ),
    [incomeCents, averageSpendingCents, values.buffer, values.debt, currency],
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
        if (!Number.isInteger(age) || age < 18 || age > 100) errors.age = "Enter your age (18 or over).";
      } else if (field === "monthlyIncome") {
        const cents = parseAmountToCents(value);
        if (cents === null || cents <= 0) errors.monthlyIncome = "Enter what you earn in a typical month, after tax.";
      } else if (field === "monthly") {
        const cents = parseAmountToCents(value);
        if (cents === null || cents < 0) errors.monthly = "Enter the amount you want to invest each month.";
      } else if (!value) {
        errors[field] = "Choose one of the options.";
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
          Step {step + 1} of {STEPS.length}
        </p>
        <div className="mt-2 flex gap-1.5" aria-hidden="true">
          {STEPS.map((s, i) => (
            <span key={s.title} className={cx("h-1 flex-1 rounded-full transition-colors", i <= step ? "bg-brand" : "bg-line-strong")} />
          ))}
        </div>
        <h2 className="display mt-5 text-[30px] text-ink sm:text-[34px]">{STEPS[step].title}</h2>
      </div>

      {/* Every step stays in the form so all answers are submitted together. */}
      <div hidden={step !== 0} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your age" htmlFor="age" error={errorFor("age")}>
            <input id="age" name="age" inputMode="numeric" autoComplete="off" value={values.age ?? ""} onChange={(e) => set("age")(e.target.value.replace(/\D/g, "").slice(0, 3))} className={inputClass} />
          </Field>
          <Field label={`Monthly income after tax (${symbol})`} htmlFor="monthlyIncome" hint={initial.monthlyIncome ? "Filled in from your transactions. Change it if it is wrong." : undefined} error={errorFor("monthlyIncome")}>
            <input id="monthlyIncome" name="monthlyIncome" inputMode="decimal" autoComplete="off" value={values.monthlyIncome ?? ""} onChange={(e) => set("monthlyIncome")(e.target.value)} className={inputClass} />
          </Field>
        </div>
        <Choices name="stability" legend="How steady is your income?" choices={STABILITY} value={values.stability ?? ""} error={errorFor("stability")} onChange={set("stability")} />
      </div>

      <div hidden={step !== 1} className="space-y-7">
        <Choices
          name="buffer"
          legend="Do you have an emergency fund?"
          help="Money you could reach within a few days if you lost your income or faced a large bill."
          choices={BUFFER}
          value={values.buffer ?? ""}
          error={errorFor("buffer")}
          onChange={set("buffer")}
        />
        <Choices name="debt" legend="Do you have any high-interest debt?" choices={DEBT} value={values.debt ?? ""} error={errorFor("debt")} onChange={set("debt")} />
      </div>

      <div hidden={step !== 2} className="space-y-7">
        <Choices
          name="horizon"
          legend="When will you need this money?"
          help="Think of the earliest point at which you would have to sell most of it."
          choices={HORIZON}
          value={values.horizon ?? ""}
          error={errorFor("horizon")}
          onChange={set("horizon")}
        />
        <Choices name="goal" legend="What matters most to you?" choices={GOAL} value={values.goal ?? ""} error={errorFor("goal")} onChange={set("goal")} />
      </div>

      <div hidden={step !== 3} className="space-y-7">
        <Choices
          name="reaction"
          legend={`You invested ${fmt(100000)} and in a few months it is worth ${fmt(80000)}. What do you do?`}
          help="Be honest. There is no right answer, only the one you would really give."
          choices={REACTION}
          value={values.reaction ?? ""}
          error={errorFor("reaction")}
          onChange={set("reaction")}
        />
        <Choices
          name="tradeoff"
          legend="Which kind of ride could you live with?"
          help={`What ${fmt(100000)} could be worth after one year. Bigger possible gains always come with bigger possible falls.`}
          choices={TRADEOFF.map((choice) => ({ ...choice, hint: `${fmt(Math.round(100000 * choice.range[0]))} to ${fmt(Math.round(100000 * choice.range[1]))}` }))}
          value={values.tradeoff ?? ""}
          error={errorFor("tradeoff")}
          onChange={set("tradeoff")}
        />
        <Choices name="experience" legend="How much investing have you done?" choices={EXPERIENCE} value={values.experience ?? ""} error={errorFor("experience")} onChange={set("experience")} />
      </div>

      <div hidden={step !== 4} className="space-y-6">
        <div className="rounded-panel border border-line bg-surface p-5 sm:p-6">
          <p className="text-[13px] text-ink-3">Arvo suggests investing</p>
          <p className="figure mt-1 text-[44px] leading-none text-ink">
            {fmt(recommendation.amountCents)}
            <span className="font-sans text-[15px] font-normal text-ink-3"> a month</span>
          </p>
          {recommendation.first ? (
            <p className="mt-3 text-[14px] font-medium text-accent-ink">First: {recommendation.first.toLowerCase()}.</p>
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
              Based on your spending over the last {spendingMonths} full {spendingMonths === 1 ? "month" : "months"}.
            </p>
          ) : null}
        </div>

        <Field label={`Amount you will invest each month (${symbol})`} htmlFor="monthly" hint="Start with the suggestion or set your own. You can change it at any time." error={errorFor("monthly")}>
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
          aria-label="Monthly amount"
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
            That is more than the {fmt(Math.max(0, recommendation.surplusCents ?? 0))} you usually have left over. Only invest money you will not need for
            everyday costs.
          </Notice>
        ) : null}
        {serverErrorList.length ? <Notice tone="neg">Some answers need another look: {serverErrorList.join(" ")}</Notice> : null}
      </div>

      <div className="mt-9 flex items-center justify-between gap-3">
        {step > 0 ? (
          <Button type="button" variant="ghost" onClick={() => setStep((s) => s - 1)}>
            Back
          </Button>
        ) : (
          <span />
        )}
        {last ? (
          <SubmitButton size="lg" pendingLabel="Building your portfolio">See my portfolio</SubmitButton>
        ) : (
          <Button type="submit" size="lg">Continue</Button>
        )}
      </div>
    </form>
  );
}
