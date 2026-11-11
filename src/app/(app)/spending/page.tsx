import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Download, Lock, Search } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listAccounts, listTransactions } from "@/lib/data";
import { CATEGORIES, CATEGORY_KEYS, categoryLabel, isCategory } from "@/lib/categories";
import { day, money, month, todayIso } from "@/lib/format";
import {
  categoryTotals, findRecurring, monthlyAverages, summarizeMonths, ymOf, type Tx,
} from "@/lib/spending";
import { buildInsights } from "@/lib/insights";
import { FREE_HISTORY_MONTHS, freeHistoryStart } from "@/lib/plan";
import { ButtonLink, cx, fieldClass, PageHeader, Panel, PanelHeader, Stat, buttonClass } from "@/components/ui";
import { CategoryBars } from "@/components/category-bars";
import { CategorySelect } from "@/components/category-select";
import { InsightsFallback, InsightsPanel } from "@/components/insights-panel";

export const metadata: Metadata = { title: "Spending" };

const PAGE_SIZE = 40;

function one(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export default async function SpendingPage({ searchParams }: PageProps<"/spending">) {
  const user = await requireUser();
  const params = await searchParams;
  const [txs, accounts] = await Promise.all([listTransactions(user.id), listAccounts(user.id)]);
  const fmt = (cents: number) => money(cents, user.currency, { whole: true });

  if (!txs.length) {
    return (
      <>
        <PageHeader title="Spending" lead="Every transaction, sorted into categories, with ideas for where to save." />
        <Panel className="p-6 sm:p-10">
          <h2 className="display text-[30px] text-ink">Nothing to show yet</h2>
          <p className="mt-2 max-w-lg text-ink-2">Add your transactions and this page fills in on its own.</p>
          <div className="mt-6"><ButtonLink href="/accounts">Add your transactions</ButtonLink></div>
        </Panel>
      </>
    );
  }

  const today = todayIso();
  const summaries = summarizeMonths(txs);
  const plus = user.plan === "plus";
  // Free accounts browse the month in progress and the three before it.
  const historyStart = plus ? "" : freeHistoryStart(today);
  const everyMonth = summaries.map((m) => m.ym);
  const allMonths = everyMonth.filter((ym) => ym >= historyStart);
  const hiddenMonths = everyMonth.length - allMonths.length;
  const averages = monthlyAverages(txs, today, 3);
  const accountName = new Map(accounts.map((a) => [a.id, a.name]));

  // Period: one month, or the recent average.
  const m = one(params.m);
  const selected = allMonths.includes(m) ? m : "avg";
  const periodMonths = selected === "avg" ? averages.months : [selected];
  const divisor = selected === "avg" ? Math.max(1, averages.months.length) : 1;
  const summary = selected === "avg" ? null : summaries.find((s) => s.ym === selected)!;
  const income = summary ? summary.income : averages.income;
  const spending = summary ? summary.spending : averages.spending;
  const totals = categoryTotals(txs, periodMonths);
  const recurring = findRecurring(txs);
  const calculated = buildInsights({ txs, todayIso: today, fmt });

  // Transaction filters.
  const query = one(params.q).trim().slice(0, 60);
  const cat = isCategory(one(params.cat)) ? one(params.cat) : "";
  const tm = allMonths.includes(one(params.tm)) ? one(params.tm) : "";
  const needle = query.toLowerCase();
  const filtered = txs.filter(
    (tx: Tx) =>
      ymOf(tx.date) >= historyStart &&
      (!cat || tx.category === cat) &&
      (!tm || ymOf(tx.date) === tm) &&
      (!needle || tx.description.toLowerCase().includes(needle) || tx.merchant.toLowerCase().includes(needle)),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number.parseInt(one(params.page), 10) || 1));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filteredTotal = filtered.reduce((sum, tx) => sum + tx.amountCents, 0);

  const link = (changes: Record<string, string | null>, hash = "") => {
    const next = new URLSearchParams();
    const base: Record<string, string> = { m: selected === "avg" ? "" : selected, q: query, cat, tm, page: String(page) };
    for (const [key, value] of Object.entries({ ...base, ...changes })) if (value) next.set(key, value);
    if (next.get("page") === "1") next.delete("page");
    const qs = next.toString();
    return `/spending${qs ? `?${qs}` : ""}${hash}`;
  };

  const pill = (active: boolean) =>
    cx(
      "inline-flex h-9 shrink-0 items-center rounded-full px-3.5 text-[13.5px] transition-colors",
      active ? "bg-ink text-page font-medium" : "bg-sunken text-ink-2 hover:text-ink",
    );

  return (
    <>
      <PageHeader
        title="Spending"
        lead="Every transaction, sorted into categories, with ideas for where to save."
        action={
          <>
            {plus ? (
              <a href="/api/export" className={buttonClass("secondary", "md")} download>
                <Download size={17} /> Export to Excel
              </a>
            ) : (
              <Link href="/plus" className={buttonClass("secondary", "md")}>
                <Lock size={16} /> Export to Excel with Plus
              </Link>
            )}
          </>
        }
      />

      <nav aria-label="Period" className="no-print -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <Link href={link({ m: null, page: null })} className={pill(selected === "avg")} aria-current={selected === "avg" ? "true" : undefined}>
          Typical month
        </Link>
        {[...allMonths].reverse().slice(0, 12).map((ym) => (
          <Link key={ym} href={link({ m: ym, page: null })} className={pill(selected === ym)} aria-current={selected === ym ? "true" : undefined}>
            {month(ym)} {ym.slice(2, 4)}
          </Link>
        ))}
      </nav>

      <Panel className="p-5 sm:p-7">
        <div className="grid gap-6 sm:grid-cols-3 sm:gap-8">
          <Stat size="lg" label={selected === "avg" ? "Spent in a typical month" : `Spent in ${month(selected, "long")}`} value={fmt(spending)} />
          <Stat label="Money in" value={fmt(income)} />
          <Stat
            label="Left over"
            value={<span className={income - spending < 0 ? "text-neg" : undefined}>{fmt(income - spending)}</span>}
            note={selected === "avg" && averages.months.length ? `Average of ${averages.months.map((ym) => month(ym)).join(", ")}` : undefined}
          />
        </div>
      </Panel>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.25fr]">
        <div className="space-y-5">
          <Panel>
            <PanelHeader title="By category" note={selected === "avg" ? "Monthly average" : month(selected, "long")} />
            <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
              <CategoryBars rows={totals} currency={user.currency} divisor={divisor} hrefFor={(c) => link({ cat: c, page: null }, "#transactions")} />
            </div>
          </Panel>

          {recurring.length ? (
            <Panel>
              <PanelHeader title="Regular payments" note="Charged every month at about the same amount" />
              <ul className="divide-y divide-line px-5 pb-4 pt-2 sm:px-6 sm:pb-5">
                {recurring.slice(0, 10).map((item) => (
                  <li key={item.merchant} className="flex items-baseline justify-between gap-3 py-2.5 text-[14px]">
                    <span className="min-w-0">
                      <span className="block truncate text-ink">{item.merchant}</span>
                      <span className="text-[12.5px] text-ink-3">{categoryLabel(item.category)}</span>
                    </span>
                    <span className="tnum shrink-0 font-medium text-ink">{money(item.monthlyCents, user.currency)}</span>
                  </li>
                ))}
                <li className="flex items-baseline justify-between gap-3 pt-3 text-[14px]">
                  <span className="text-ink-2">Total each month</span>
                  <span className="tnum font-semibold text-ink">{money(recurring.reduce((sum, r) => sum + r.monthlyCents, 0), user.currency)}</span>
                </li>
              </ul>
            </Panel>
          ) : null}
        </div>

        <Suspense fallback={<InsightsFallback insights={calculated} fmt={fmt} plus={plus} />}>
          <InsightsPanel
            fmt={fmt}
            plus={plus}
            input={{
              userId: user.id,
              currency: user.currency,
              months: summaries,
              averageIncome: averages.income,
              averageSpending: averages.spending,
              categories: categoryTotals(txs, averages.months),
              recurring,
              calculated,
            }}
          />
        </Suspense>
      </div>

      <Panel id="transactions" className="mt-5 scroll-mt-20">
        <PanelHeader
          title="All transactions"
          note={`${filtered.length.toLocaleString("en-GB")} ${filtered.length === 1 ? "transaction" : "transactions"}${cat || tm || query ? `, net ${money(filteredTotal, user.currency)}` : ""}`}
        />
        <form action="/spending#transactions" className="no-print flex flex-wrap gap-2 px-5 pt-4 sm:px-6">
          {selected !== "avg" ? <input type="hidden" name="m" value={selected} /> : null}
          <div className="relative min-w-[180px] flex-1">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
            <input name="q" defaultValue={query} placeholder="Search by name" aria-label="Search transactions" className={cx(fieldClass, "block h-11 w-full pl-10 pr-3.5 text-base sm:text-[15px]")} />
          </div>
          <select name="cat" defaultValue={cat} aria-label="Category" className={cx(fieldClass, "h-11 min-w-[150px] flex-1 px-3 text-base sm:flex-none sm:text-[15px]")}>
            <option value="">All categories</option>
            {CATEGORY_KEYS.map((key) => (
              <option key={key} value={key}>{CATEGORIES[key].label}</option>
            ))}
          </select>
          <select name="tm" defaultValue={tm} aria-label="Month" className={cx(fieldClass, "h-11 min-w-[130px] flex-1 px-3 text-base sm:flex-none sm:text-[15px]")}>
            <option value="">All months</option>
            {[...allMonths].reverse().map((ym) => (
              <option key={ym} value={ym}>{month(ym, "long")}</option>
            ))}
          </select>
          <button type="submit" className={buttonClass("secondary", "md")}>Filter</button>
          {cat || tm || query ? (
            <Link href={link({ q: null, cat: null, tm: null, page: null }, "#transactions")} className={buttonClass("ghost", "md")}>Clear</Link>
          ) : null}
        </form>

        {rows.length ? (
          <>
            {/* Wide screens: a real table. */}
            <div className="hidden px-2 pb-2 pt-3 sm:px-3 md:block">
              <table className="w-full border-collapse text-left text-[14px]">
                <thead>
                  <tr className="text-[12.5px] text-ink-3">
                    <th scope="col" className="px-3 py-2 font-medium">Date</th>
                    <th scope="col" className="px-3 py-2 font-medium">Description</th>
                    <th scope="col" className="px-3 py-2 font-medium">Category</th>
                    <th scope="col" className="px-3 py-2 font-medium">Account</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((tx) => (
                    <tr key={tx.id} className="border-t border-line transition-colors hover:bg-raised">
                      <td className="tnum whitespace-nowrap px-3 py-2.5 text-ink-2">{day(tx.date)}</td>
                      <td className="max-w-[320px] px-3 py-2.5">
                        <span className="block truncate text-ink">{tx.merchant}</span>
                        {tx.description.toLowerCase() !== tx.merchant.toLowerCase() ? (
                          <span className="block truncate text-[12.5px] text-ink-3">{tx.description}</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5"><CategorySelect key={`${tx.id}:${tx.category}`} id={tx.id} value={tx.category} label={tx.merchant} /></td>
                      <td className="max-w-[160px] truncate px-3 py-2.5 text-ink-3">{accountName.get(tx.accountId) ?? ""}</td>
                      <td className={cx("tnum whitespace-nowrap px-3 py-2.5 text-right font-medium", tx.amountCents > 0 ? "text-pos" : "text-ink")}>
                        {money(tx.amountCents, user.currency, { sign: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Phones: the same rows as a list. */}
            <ul className="divide-y divide-line px-5 pb-2 pt-2 md:hidden">
              {rows.map((tx) => (
                <li key={tx.id} className="py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-[15px] text-ink">{tx.merchant}</span>
                    <span className={cx("tnum shrink-0 text-[15px] font-medium", tx.amountCents > 0 ? "text-pos" : "text-ink")}>
                      {money(tx.amountCents, user.currency, { sign: true })}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-3">
                    <span className="tnum text-[12.5px] text-ink-3">{day(tx.date)}</span>
                    <CategorySelect key={`${tx.id}:${tx.category}`} id={tx.id} value={tx.category} label={tx.merchant} />
                  </div>
                </li>
              ))}
            </ul>

            {pages > 1 ? (
              <nav aria-label="Pages" className="no-print flex items-center justify-between gap-3 border-t border-line px-5 py-4 text-[13.5px] sm:px-6">
                <span className="tnum text-ink-3">Page {page} of {pages}</span>
                <span className="flex gap-2">
                  {page > 1 ? <Link href={link({ page: String(page - 1) }, "#transactions")} className={buttonClass("secondary", "sm")}>Previous</Link> : null}
                  {page < pages ? <Link href={link({ page: String(page + 1) }, "#transactions")} className={buttonClass("secondary", "sm")}>Next</Link> : null}
                </span>
              </nav>
            ) : <div className="h-3" />}
          </>
        ) : (
          <p className="px-5 py-8 text-[14.5px] text-ink-2 sm:px-6">No transactions match these filters.</p>
        )}
      </Panel>

      {hiddenMonths > 0 ? (
        <p className="mt-4 text-[13.5px] text-ink-2">
          Free shows this month and the {FREE_HISTORY_MONTHS} before it. You have {hiddenMonths} earlier{" "}
          {hiddenMonths === 1 ? "month" : "months"} stored.{" "}
          <Link href="/plus" className="font-medium text-brand-ink underline underline-offset-2">See your full history with Plus</Link>
        </p>
      ) : null}

      <p className="mt-4 text-[12.5px] text-ink-3">
        Transfers between your own accounts and money moved to savings are not counted as spending.
      </p>
    </>
  );
}
