"use client";

import { useState } from "react";
import { ArrowLeft, ChartPie, FileSpreadsheet, FlaskConical, Search, type LucideIcon } from "lucide-react";
import { finishWelcome } from "@/lib/actions/data";
import { GOALS, needsTransactions, type Goal } from "@/lib/goals";
import { CURRENCIES, type Currency } from "@/lib/format";
import { cx } from "./ui";
import { useI18n } from "./i18n";
import { msg } from "@/lib/i18n/core";

const CURRENCY_NAME: Record<string, string> = { EUR: msg("Euro"), BRL: msg("Brazilian real"), USD: msg("US dollar"), GBP: msg("Pound sterling") };

type Start = { value: "import" | "invest" | "markets" | "sample"; icon: LucideIcon; title: string; text: string };

const IMPORT = (bank: boolean): Start => ({
  value: "import",
  icon: FileSpreadsheet,
  title: bank ? msg("Connect a bank or import a statement") : msg("Import a bank statement"),
  text: msg("Download a statement from your bank (CSV, OFX, Excel or PDF) and upload it here. Takes two minutes, and Arvo never sees your bank login."),
});
const INVEST: Start = {
  value: "invest",
  icon: ChartPie,
  title: msg("Answer ten questions instead"),
  text: msg("Find your investor profile and a model portfolio. No bank data needed."),
};
const MARKETS: Start = {
  value: "markets",
  icon: Search,
  title: msg("Browse shares and funds"),
  text: msg("Look up any company or fund and read what it is and how risky it is."),
};
const SAMPLE: Start = {
  value: "sample",
  icon: FlaskConical,
  title: msg("Look around with made-up data"),
  text: msg("Six months of invented transactions, clearly labelled, so you can see how Arvo works."),
};

/** The first option is the one that serves the goal best. */
function startsFor(goal: Goal, bank: boolean): { lead: string; options: Start[] } {
  if (needsTransactions(goal)) {
    return {
      lead: msg("For that, Arvo needs to see what comes in and what goes out. If you would rather not share a statement, you can start with investing."),
      options: [IMPORT(bank), { ...INVEST, title: msg("Skip the statement and start with investing") }, SAMPLE],
    };
  }
  if (goal === "investing") {
    return {
      lead: msg("You can start right away. Adding a statement later lets Arvo work out how much you can afford to invest."),
      options: [{ ...INVEST, title: msg("Find my investor profile") }, { ...IMPORT(bank), title: msg("Start from my real spending") }, SAMPLE],
    };
  }
  return {
    lead: msg("No bank data needed for that. You can add your own numbers whenever you like."),
    options: [MARKETS, { ...INVEST, title: msg("Find my investor profile") }, SAMPLE],
  };
}

const optionClass =
  "group flex w-full items-center gap-4 rounded-panel border border-line bg-surface p-5 text-left transition-colors hover:border-line-strong hover:bg-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus";

export function WelcomeForm({ first, currency, bank }: { first: string; currency: Currency; bank: boolean }) {
  const [goal, setGoal] = useState<Goal | null>(null);
  const { t } = useI18n();

  if (!goal) {
    return (
      <div className="settle">
        <p className="text-[13.5px] text-ink-3">{t("{step} of {total}", { step: 1, total: 2 })}</p>
        <h1 className="display mt-2 text-[38px] text-ink sm:text-[46px]">{t("Welcome, {name}", { name: first })}</h1>
        <p className="mt-3 max-w-lg text-[16px] text-ink-2">{t("What would you like help with first?")}</p>
        <div className="mt-8 space-y-2.5">
          {GOALS.map((option) => (
            <button key={option.id} type="button" onClick={() => setGoal(option.id)} className={optionClass}>
              <span>
                <span className="block text-[15.5px] font-semibold text-ink">{t(option.title)}</span>
                <span className="block text-[13.5px] text-ink-2">{t(option.text)}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const { lead, options } = startsFor(goal, bank);
  const chosen = GOALS.find((option) => option.id === goal)!;

  return (
    <form action={finishWelcome} className="settle">
      <input type="hidden" name="goal" value={goal} />
      <button
        type="button"
        onClick={() => setGoal(null)}
        className="-ml-1 inline-flex items-center gap-1.5 rounded-control px-1 py-1 text-[13.5px] text-ink-2 hover:text-ink"
      >
        <ArrowLeft size={15} /> {t("Back")}
      </button>
      <p className="mt-4 text-[13.5px] text-ink-3">{t("{step} of {total}", { step: 2, total: 2 })}</p>
      <h1 className="display mt-2 text-[32px] text-ink sm:text-[38px]">{t(chosen.title)}</h1>
      <p className="mt-3 max-w-lg text-[16px] text-ink-2">{t(lead)}</p>

      <fieldset className="mt-8">
        <legend className="mb-2 text-[13.5px] font-medium text-ink">{t("Your currency")}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CURRENCIES.map((code) => (
            <label
              key={code}
              className="flex cursor-pointer flex-col rounded-control border border-line-strong bg-raised px-4 py-3 text-[14px] transition-colors has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus"
            >
              <input type="radio" name="currency" value={code} defaultChecked={code === currency} className="sr-only" />
              <span className="font-semibold text-ink">{code}</span>
              <span className="text-[12.5px] text-ink-3">{t(CURRENCY_NAME[code])}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <p className="mb-2 mt-8 text-[13.5px] font-medium text-ink">{t("How would you like to start?")}</p>
      <div className="space-y-2.5">
        {options.map((option, index) => (
          <button key={option.value} type="submit" name="start" value={option.value} className={cx(optionClass, index === 0 && "border-brand")}>
            <span
              className={cx(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                option.value === "sample" ? "bg-accent-soft text-accent-ink" : "bg-brand-soft text-brand-ink",
              )}
            >
              <option.icon size={20} />
            </span>
            <span>
              <span className="block text-[15.5px] font-semibold text-ink">{t(option.title)}</span>
              <span className="block text-[13.5px] text-ink-2">{t(option.text)}</span>
            </span>
          </button>
        ))}
      </div>
    </form>
  );
}
