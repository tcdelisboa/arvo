import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";
import { categoryLabel } from "@/lib/categories";
import type { CategoryTotal } from "@/lib/spending";

/**
 * Spending by category as a ranked bar list. One hue, because the bars show
 * amount, not identity; the label beside each bar says which category it is.
 */
export async function CategoryBars({
  rows,
  currency,
  divisor = 1,
  hrefFor,
  limit,
}: {
  rows: CategoryTotal[];
  currency: string;
  /** Divide totals by this many months to show a monthly average. */
  divisor?: number;
  hrefFor?: (category: string) => string;
  limit?: number;
}) {
  const { t, f } = await getI18n();
  const shown = limit ? rows.slice(0, limit) : rows;
  const max = Math.max(1, ...shown.map((row) => row.cents));
  if (!shown.length) return <p className="text-[14px] text-ink-3">{t("No spending in this period.")}</p>;

  return (
    <ul className="space-y-3.5">
      {shown.map((row) => {
        const content = (
          <>
            <div className="flex items-baseline justify-between gap-3 text-[14px]">
              <span className="truncate text-ink">{t(categoryLabel(row.category))}</span>
              <span className="shrink-0 text-ink-2">
                <span className="tnum font-medium text-ink">{f.money(Math.round(row.cents / divisor), currency, { whole: true })}</span>
                <span className="tnum ml-2 inline-block w-9 text-right text-[12.5px] text-ink-3">{Math.round(row.share * 100)}%</span>
              </span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-sunken">
              <div className="h-full rounded-full" style={{ width: `${Math.max(1.5, (row.cents / max) * 100)}%`, background: "var(--s1)" }} />
            </div>
          </>
        );
        return (
          <li key={row.category}>
            {hrefFor ? (
              <Link href={hrefFor(row.category)} className="-mx-2 block rounded-lg px-2 py-1 transition-colors hover:bg-sunken">
                {content}
              </Link>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ul>
  );
}
