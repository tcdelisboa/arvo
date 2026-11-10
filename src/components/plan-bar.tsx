import { CLASS_LABEL, type AssetClass } from "@/lib/portfolio";

// Colours and order were chosen together: every pair of neighbours in the bar
// (and in the allocation ring) stays distinguishable, including for colour-blind
// readers, and the legend carries the names and numbers in text.
export const CLASS_COLOR: Record<AssetClass, string> = {
  stocks: "var(--s1)",
  gold: "var(--s2)",
  cash: "var(--s4)",
  companies: "var(--s7)",
  bonds: "var(--s6)",
};

const ORDER: AssetClass[] = ["stocks", "gold", "cash", "companies", "bonds"];

/** One whole split into its building blocks, with a legend that carries the numbers. */
export function PlanBar({ byClass }: { byClass: { assetClass: AssetClass; weight: number }[] }) {
  const rows = ORDER.map((c) => byClass.find((row) => row.assetClass === c)).filter(
    (row): row is { assetClass: AssetClass; weight: number } => !!row && row.weight > 0,
  );
  return (
    <div>
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full" role="img" aria-label={rows.map((r) => `${CLASS_LABEL[r.assetClass]} ${Math.round(r.weight)}%`).join(", ")}>
        {rows.map((row) => (
          <div key={row.assetClass} style={{ width: `${row.weight}%`, background: CLASS_COLOR[row.assetClass] }} />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-ink-2">
        {rows.map((row) => (
          <li key={row.assetClass} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: CLASS_COLOR[row.assetClass] }} />
            {CLASS_LABEL[row.assetClass]}
            <span className="tnum font-medium text-ink">{Math.round(row.weight)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
