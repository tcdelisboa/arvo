import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FileSpreadsheet, FlaskConical, Landmark } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { finishWelcome, loadSampleData } from "@/lib/actions/data";
import { bankEnabled } from "@/lib/plaid";
import { CURRENCIES } from "@/lib/format";
import { Logo } from "@/components/logo";

export const metadata: Metadata = { title: "Welcome" };

const CURRENCY_NAME: Record<string, string> = { EUR: "Euro", USD: "US dollar", GBP: "Pound sterling" };

export default async function WelcomePage() {
  const user = await requireUser();
  if (user.onboarded) redirect("/overview");
  const first = user.name.split(" ")[0];
  const bank = bankEnabled();

  const optionClass =
    "group flex w-full items-center gap-4 rounded-panel border border-line bg-surface p-5 text-left transition-colors hover:border-line-strong hover:bg-raised";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[640px] flex-col px-5 py-6 sm:py-8">
      <Logo />
      <main className="settle flex flex-1 flex-col justify-center py-10">
        <h1 className="display text-[40px] text-ink sm:text-[48px]">Welcome, {first}</h1>
        <p className="mt-3 max-w-lg text-[16px] text-ink-2">
          Arvo works from your own numbers. Choose your currency, then how you would like to bring your transactions in.
          You can change both later.
        </p>

        <form className="mt-9">
          <fieldset>
            <legend className="mb-2 text-[13.5px] font-medium text-ink">Your currency</legend>
            <div className="grid grid-cols-3 gap-2">
              {CURRENCIES.map((code) => (
                <label
                  key={code}
                  className="flex cursor-pointer flex-col rounded-control border border-line-strong bg-raised px-4 py-3 text-[14px] transition-colors has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus"
                >
                  <input type="radio" name="currency" value={code} defaultChecked={code === user.currency} className="sr-only" />
                  <span className="font-semibold text-ink">{code}</span>
                  <span className="text-[12.5px] text-ink-3">{CURRENCY_NAME[code]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <p className="mb-2 mt-8 text-[13.5px] font-medium text-ink">Bring in your transactions</p>
          <div className="space-y-2.5">
            {bank ? (
              <button type="submit" name="next" value="accounts" formAction={finishWelcome} className={optionClass}>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-ink"><Landmark size={20} /></span>
                <span>
                  <span className="block text-[15.5px] font-semibold text-ink">Connect your bank</span>
                  <span className="block text-[13.5px] text-ink-2">Read-only access through open banking. Transactions update on their own.</span>
                </span>
              </button>
            ) : null}
            <button type="submit" name="next" value="accounts" formAction={finishWelcome} className={optionClass}>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-ink"><FileSpreadsheet size={20} /></span>
              <span>
                <span className="block text-[15.5px] font-semibold text-ink">Import a bank statement</span>
                <span className="block text-[13.5px] text-ink-2">Download a CSV from your bank and upload it here. Takes two minutes.</span>
              </span>
            </button>
            <button type="submit" formAction={loadSampleData} className={optionClass}>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-ink"><FlaskConical size={20} /></span>
              <span>
                <span className="block text-[15.5px] font-semibold text-ink">Look around with sample data</span>
                <span className="block text-[13.5px] text-ink-2">Six months of made-up transactions, so you can see how Arvo works first.</span>
              </span>
            </button>
          </div>

          <button type="submit" name="next" value="overview" formAction={finishWelcome} className="mt-6 text-[14px] text-ink-2 underline underline-offset-2 hover:text-ink">
            Skip for now
          </button>
        </form>
      </main>
    </div>
  );
}
