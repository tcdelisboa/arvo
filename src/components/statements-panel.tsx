import { Download, ExternalLink } from "lucide-react";
import { getStatements } from "@/lib/market";
import { getI18n } from "@/lib/i18n/server";
import { buttonClass, Panel, PanelHeader } from "./ui";

/** Key figures from the last annual accounts, an Excel download, links to the filings and the next results date. */
export async function StatementsPanel({ symbol, name }: { symbol: string; name: string }) {
  const data = await getStatements(symbol).catch(() => null);
  const { t, f } = await getI18n();
  const { compact, day } = f;
  const us = /^[A-Z]{1,5}$/.test(symbol);
  const links = (
    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[13.5px]">
      <a href={`https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}/financials`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium text-brand-ink underline underline-offset-2">
        {t("Full statements on Yahoo Finance")} <ExternalLink size={14} />
      </a>
      {us ? (
        <a href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${encodeURIComponent(symbol)}&type=10-K&dateb=&owner=include&count=40`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium text-brand-ink underline underline-offset-2">
          {t("Annual reports filed with the SEC")} <ExternalLink size={14} />
        </a>
      ) : null}
    </div>
  );
  if (!data) {
    return (
      <Panel>
        <PanelHeader title={t("Financial statements")} />
        <div className="px-5 pb-5 pt-3 sm:px-6 sm:pb-6">
          <p className="text-[14px] text-ink-2">{t("Arvo could not load {name}'s accounts right now. You can read them at the source:", { name })}</p>
          {links}
        </div>
      </Panel>
    );
  }
  const { statements, earnings } = data;
  const last = statements.years.length - 1;
  const pick = (rows: typeof statements.income, label: string) => rows.find((row) => row.label === label)?.values[last] ?? null;
  const facts: [string, number | null][] = [
    [t("Revenue"), pick(statements.income, "Revenue")],
    [t("Net income"), pick(statements.income, "Net income")],
    [t("Free cash flow"), pick(statements.cashflow, "Free cash flow")],
    [t("Total debt"), pick(statements.balance, "Total debt")],
  ];
  return (
    <Panel>
      <PanelHeader title={t("Financial statements")} note={t("Fiscal year to {date}", { date: day(statements.years[last]) })} />
      <div className="px-5 pb-5 pt-3 sm:px-6 sm:pb-6">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          {facts.filter(([, v]) => v !== null).map(([label, value]) => (
            <div key={label}>
              <dt className="text-[12.5px] text-ink-3">{label}</dt>
              <dd className="figure mt-0.5 text-[22px] text-ink">{compact(value as number, statements.currency)}</dd>
            </div>
          ))}
        </dl>
        {earnings ? (
          <p className="mt-5 rounded-control bg-sunken px-4 py-3 text-[14px] text-ink-2">
            <span className="font-medium text-ink">{t("Next results:")} </span>
            {earnings.estimated ? t("around {date} (estimate, based on when past results came out)", { date: day(earnings.date) }) : day(earnings.date)}
          </p>
        ) : null}
        <a href={`/api/markets/${encodeURIComponent(symbol)}/financials`} download className={`${buttonClass("secondary", "md")} mt-5`}>
          <Download size={17} /> {t("Download the last {n} years in Excel", { n: statements.years.length })}
        </a>
        {links}
      </div>
    </Panel>
  );
}
