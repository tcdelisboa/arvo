import Link from "next/link";
import { Check, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { ButtonLink } from "@/components/ui";
import { GrowthExplorer } from "@/components/growth-explorer";
import { Rings } from "@/components/rings";
import { WaitlistForm } from "@/components/waitlist-form";
import { LangSwitch } from "@/components/lang-switch";
import { getI18n } from "@/lib/i18n/server";
import { msg, type T } from "@/lib/i18n/core";
import type { Fmt } from "@/lib/format";

type Ctx = { t: T; f: Fmt; cur: string; k: number };
const sample = ({ f, cur, k }: Ctx, euros: number) => f.money(euros * k * 100, cur, { whole: true });

/* Small, static previews of the real screens. No screenshots, so they follow the theme. */

function SpendingPreview({ ctx }: { ctx: Ctx }) {
  const { t } = ctx;
  const rows: [string, string, number][] = [
    [t("Rent & housing"), sample(ctx, 890), 100],
    [t("Groceries"), sample(ctx, 412), 46],
    [t("Eating out"), sample(ctx, 268), 30],
    [t("Subscriptions"), sample(ctx, 86), 10],
  ];
  return (
    <div className="rounded-panel border border-line bg-surface p-5">
      <p className="text-[12.5px] text-ink-3">{t("Spent in a typical month")}</p>
      <p className="figure mb-4 mt-0.5 text-[30px] leading-none text-ink">{sample(ctx, 2034)}</p>
      <ul className="space-y-3">
        {rows.map(([label, amount, width]) => (
          <li key={label}>
            <div className="flex justify-between text-[13px]">
              <span className="text-ink">{label}</span>
              <span className="tnum text-ink-2">{amount}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-sunken">
              <div className="h-full rounded-full" style={{ width: `${width}%`, background: "var(--s1)" }} />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 rounded-control bg-brand-soft px-3 py-2 text-[12.5px] text-brand-ink">
        {t("Six subscriptions cost you {amount} a year. Two of them overlap.", { amount: sample(ctx, 1032) })}
      </p>
    </div>
  );
}

function ProfilePreview({ ctx }: { ctx: Ctx }) {
  const { t } = ctx;
  return (
    <div className="rounded-panel border border-line bg-surface p-5">
      <p className="text-[12.5px] text-ink-3">{t("Your investor profile")}</p>
      <p className="display mt-0.5 text-[34px] text-ink">{t("Balanced")}</p>
      <div className="mt-3 flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= 3 ? "bg-brand" : "bg-line-strong"}`} />
        ))}
      </div>
      <p className="mt-4 text-[13px] leading-relaxed text-ink-2">
        {t("You accept ups and downs in exchange for growth. Stocks lead, bonds steady the ride.")}
      </p>
      <p className="mt-4 text-[12.5px] text-ink-3">{t("Arvo suggests investing")}</p>
      <p className="figure mt-0.5 text-[24px] leading-none text-ink">{sample(ctx, 250)} <span className="font-sans text-[13px] font-normal text-ink-3">{t("a month")}</span></p>
    </div>
  );
}

function PlanPreview({ ctx }: { ctx: Ctx }) {
  const { t } = ctx;
  const rows: [string, string, string, string][] = [
    [t("Global stocks"), "VWCE", "60%", "var(--s1)"],
    [t("Global bonds"), "EUNA", "28%", "var(--s6)"],
    [t("Gold"), "4GLD", "7%", "var(--s2)"],
    [t("Cash-like"), "XEON", "5%", "var(--s4)"],
  ];
  return (
    <div className="rounded-panel border border-line bg-surface p-5">
      <p className="text-[12.5px] text-ink-3">{t("Where to put it")}</p>
      <div className="mb-4 mt-2 flex h-2.5 gap-[2px] overflow-hidden rounded-full">
        <span style={{ width: "60%", background: "var(--s1)" }} />
        <span style={{ width: "7%", background: "var(--s2)" }} />
        <span style={{ width: "5%", background: "var(--s4)" }} />
        <span style={{ width: "28%", background: "var(--s6)" }} />
      </div>
      <ul className="divide-y divide-line">
        {rows.map(([name, ticker, weight, color]) => (
          <li key={ticker} className="flex items-center justify-between gap-3 py-2.5">
            <span className="flex items-center gap-2.5 text-[13.5px] text-ink">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />
              {name}
              <span className="rounded-full bg-sunken px-2 py-0.5 text-[11.5px] text-ink-2">{ticker}</span>
            </span>
            <span className="figure text-[19px] text-ink">{weight}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const STEPS = [
  {
    title: msg("See where your money goes"),
    body: msg("Upload a statement from your bank. Arvo sorts every transaction, shows your biggest costs, and points out where you could save without changing how you live."),
    preview: SpendingPreview,
  },
  {
    title: msg("Find your investor profile"),
    body: msg("Ten plain questions about your situation and your nerves. Arvo works out how much risk you can carry and how much you can afford to invest each month, and explains both."),
    preview: ProfilePreview,
  },
  {
    title: msg("Follow a plan that fits"),
    body: msg("A diversified portfolio of low-cost funds with the exact share for each, what each one is, and why it is there. Use it with whichever broker you like."),
    preview: PlanPreview,
  },
];

const IS = [
  msg("A clear, honest picture of your spending"),
  msg("An investor profile based on your real situation"),
  msg("A model portfolio with the exact share for each fund"),
  msg("Plain-language explanations of any share or fund, and how it fits you"),
];

const IS_NOT = [
  msg("A bank or a broker. Arvo can read transactions; it can never move money"),
  msg("A tip sheet. No hot picks, no price predictions"),
  msg("Personal financial advice from a licensed adviser"),
  msg("A business that sells your data. You can delete everything in one tap"),
];

export default async function LandingPage() {
  const { t, f, lang } = await getI18n();
  const ctx: Ctx = { t, f, cur: lang === "pt" ? "BRL" : "EUR", k: lang === "pt" ? 3 : 1 };
  return (
    <div className="overflow-x-clip">
      <header className="mx-auto flex h-[72px] w-full max-w-[1180px] items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label={t("Arvo home")}>
          <Logo />
        </Link>
        <nav aria-label={t("Site")} className="flex items-center gap-1 sm:gap-2">
          <Link href="#how" className="hidden h-10 items-center rounded-control px-3 text-[14.5px] text-ink-2 hover:text-ink md:inline-flex">
            {t("How it works")}
          </Link>
          <Link href="#honest" className="hidden h-10 items-center rounded-control px-3 text-[14.5px] text-ink-2 hover:text-ink md:inline-flex">
            {t("What Arvo is")}
          </Link>
          <LangSwitch className="hidden sm:inline-flex" />
          <ThemeToggle />
          <Link href="/login" className="inline-flex h-10 items-center rounded-control px-3 text-[14.5px] font-medium text-ink hover:bg-sunken">
            {t("Sign in")}
          </Link>
          <ButtonLink href="/signup" size="sm" variant="secondary" className="hidden h-10 sm:inline-flex">
            {t("Try the early version")}
          </ButtonLink>
        </nav>
      </header>

      <main>
        <section className="relative mx-auto grid w-full max-w-[1180px] items-center gap-12 px-5 pb-20 pt-10 sm:px-8 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)] lg:gap-16 lg:pb-28">
          <div className="settle">
            <h1 className="display text-[52px] text-ink sm:text-[72px] lg:text-[84px]">
              {t("Start investing with what you have.")}
            </h1>
            <p className="mt-6 max-w-[34rem] text-[17px] leading-relaxed text-ink-2 sm:text-[19px]">
              {t("Arvo shows where your money goes, works out what you can afford to set aside, and turns it into a portfolio that fits you. In plain language, from the first euro.")}
            </p>
            <div className="mt-9 max-w-[34rem]">
              <WaitlistForm />
            </div>
            <p className="mt-6 text-[14.5px] text-ink-2">
              {t("Arvo is still being built.")}{" "}
              <Link href="/signup" className="font-medium text-brand-ink underline underline-offset-2">{t("Try the early version")}</Link>
              {" "}{t("if you are curious. It is free and needs nothing installed.")}
            </p>
          </div>
          <div className="settle [animation-delay:90ms]">
            <GrowthExplorer />
          </div>
        </section>

        <section id="how" className="scroll-mt-8 border-t border-line bg-surface">
          <div className="mx-auto w-full max-w-[1180px] px-5 py-20 sm:px-8 lg:py-28">
            <h2 className="display max-w-2xl text-[38px] text-ink sm:text-[52px]">{t("From your bank statement to a plan, in three steps")}</h2>
            <ol className="mt-14 space-y-16 lg:space-y-20">
              {STEPS.map((step, index) => (
                <li key={step.title} className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-20">
                  <div className="flex gap-5 sm:gap-7">
                    <span className="figure text-[44px] leading-none text-ink-3 sm:text-[56px]">{index + 1}</span>
                    <div>
                      <h3 className="display text-[28px] text-ink sm:text-[34px]">{t(step.title)}</h3>
                      <p className="mt-3 max-w-[32rem] text-[16px] leading-relaxed text-ink-2">{t(step.body)}</p>
                    </div>
                  </div>
                  <div className="lg:justify-self-end lg:w-full"><step.preview ctx={ctx} /></div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="honest" className="scroll-mt-8 mx-auto w-full max-w-[1180px] px-5 py-20 sm:px-8 lg:py-28">
          <h2 className="display max-w-2xl text-[38px] text-ink sm:text-[52px]">{t("What Arvo is, and what it is not")}</h2>
          <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-ink-2">
            {t("Most investing apps make money when you trade. Arvo doesn't sell investments at all, so it has no reason to push you towards anything.")}
          </p>
          <div className="mt-12 grid gap-10 md:grid-cols-2 md:gap-16">
            <div>
              <h3 className="text-[15px] font-semibold text-ink">{t("Arvo is")}</h3>
              <ul className="mt-4 space-y-4">
                {IS.map((item) => (
                  <li key={item} className="flex gap-3.5 text-[16px] leading-snug text-ink">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-ink"><Check size={14} strokeWidth={2.6} /></span>
                    {t(item)}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-ink">{t("Arvo is not")}</h3>
              <ul className="mt-4 space-y-4">
                {IS_NOT.map((item) => (
                  <li key={item} className="flex gap-3.5 text-[16px] leading-snug text-ink-2">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sunken text-ink-3"><X size={14} strokeWidth={2.6} /></span>
                    {t(item)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="px-5 pb-20 sm:px-8 lg:pb-28">
          <div className="relative mx-auto w-full max-w-[1180px] overflow-hidden rounded-[32px] bg-brand px-7 py-14 text-on-brand sm:px-14 sm:py-20">
            <Rings className="pointer-events-none absolute -bottom-16 -right-10 h-[420px] w-[420px] -scale-x-100" />
            <div className="relative max-w-xl">
              <h2 className="display text-[40px] sm:text-[56px]">{t("The best time to start was earlier. The next best is this month.")}</h2>
              <p className="mb-9 mt-5 text-[16px] opacity-80">{t("Leave your email and you will be among the first to use Arvo when it opens.")}</p>
              <WaitlistForm id="waitlist-email-end" onBrand />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6 px-5 py-10 sm:px-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-md">
            <Logo size={24} />
            <p className="mt-3 text-[12.5px] leading-relaxed text-ink-3">
              {t("Arvo is an educational tool, not a bank, broker or licensed financial adviser. Nothing in Arvo is personal investment advice. The value of investments can fall as well as rise, and you may get back less than you put in.")}
            </p>
          </div>
          <nav aria-label={t("Legal")} className="flex flex-wrap gap-x-6 gap-y-2 text-[13.5px] text-ink-2">
            <Link href="/terms" className="hover:text-ink">{t("Terms")}</Link>
            <Link href="/privacy" className="hover:text-ink">{t("Privacy")}</Link>
            <Link href="/risk" className="hover:text-ink">{t("Risk notice")}</Link>
            <Link href="/login" className="hover:text-ink">{t("Sign in")}</Link>
            <LangSwitch className="-my-1.5" />
          </nav>
        </div>
      </footer>
    </div>
  );
}
