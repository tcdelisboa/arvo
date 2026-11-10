"use client";

import { useMemo, useState } from "react";
import { futureValue } from "@/lib/portfolio";

const RATE = 0.055;
const fmt = (value: number) => `€${Math.round(value).toLocaleString("en-GB")}`;

/**
 * The landing page's live demonstration: drag two sliders and watch what a
 * regular monthly amount can turn into. Same maths as the in-app projection.
 */
export function GrowthExplorer() {
  const [monthly, setMonthly] = useState(150);
  const [years, setYears] = useState(20);

  const { points, end, paid } = useMemo(() => {
    const list = Array.from({ length: years + 1 }, (_, year) => ({
      year,
      value: futureValue(monthly * 100, RATE, year) / 100,
      paid: monthly * 12 * year,
    }));
    return { points: list, end: list[list.length - 1].value, paid: monthly * 12 * years };
  }, [monthly, years]);

  const W = 520;
  const H = 210;
  const x = (year: number) => (year / years) * W;
  const y = (value: number) => H - 6 - (value / (end || 1)) * (H - 22);
  const path = (pick: (p: (typeof points)[number]) => number) =>
    points.map((p, i) => `${i ? "L" : "M"}${x(p.year).toFixed(1)},${y(pick(p)).toFixed(1)}`).join("");
  const growth = Math.max(0, end - paid);

  return (
    <div className="rounded-[26px] border border-line bg-surface p-6 shadow-[0_30px_80px_-40px_rgb(14_33_29/0.35)] sm:p-8">
      <p className="text-[13.5px] text-ink-3">
        {fmt(monthly)} a month for {years} {years === 1 ? "year" : "years"} could become
      </p>
      <p className="figure mt-1 text-[52px] leading-none text-ink sm:text-[64px]" aria-live="polite">
        {fmt(end)}
      </p>
      <p className="mt-3 text-[14px] text-ink-2">
        You put in <span className="tnum font-medium text-ink">{fmt(paid)}</span>. Growth adds{" "}
        <span className="tnum font-medium text-pos">{fmt(growth)}</span>.
      </p>

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-5 block h-auto w-full" role="img" aria-label="Value growing faster than the amount paid in">
        <path d={`${path((p) => p.value)}L${W},${H}L0,${H}Z`} fill="var(--s1)" opacity="0.1" />
        <path d={path((p) => p.paid)} fill="none" stroke="var(--s-muted)" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <path d={path((p) => p.value)} fill="none" stroke="var(--s1)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <circle cx={W - 5} cy={y(end)} r="5" fill="var(--accent)" stroke="var(--surface)" strokeWidth="2" />
      </svg>
      <ul className="mt-2 flex gap-5 text-[12.5px] text-ink-3">
        <li className="flex items-center gap-2"><span className="h-0.5 w-4 rounded-full" style={{ background: "var(--s1)" }} /> Value</li>
        <li className="flex items-center gap-2"><span className="h-0.5 w-4 rounded-full" style={{ background: "var(--s-muted)" }} /> Paid in</li>
      </ul>

      <div className="mt-6 space-y-4">
        <div>
          <div className="flex items-baseline justify-between text-[13.5px]">
            <label htmlFor="ge-monthly" className="text-ink-2">Each month</label>
            <span className="tnum font-medium text-ink">{fmt(monthly)}</span>
          </div>
          <input
            id="ge-monthly"
            type="range"
            min={25}
            max={1000}
            step={25}
            value={monthly}
            onChange={(e) => setMonthly(Number(e.target.value))}
            style={{ "--fill": `${((monthly - 25) / 975) * 100}%` } as React.CSSProperties}
          />
        </div>
        <div>
          <div className="flex items-baseline justify-between text-[13.5px]">
            <label htmlFor="ge-years" className="text-ink-2">For</label>
            <span className="tnum font-medium text-ink">{years} {years === 1 ? "year" : "years"}</span>
          </div>
          <input
            id="ge-years"
            type="range"
            min={1}
            max={40}
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            style={{ "--fill": `${((years - 1) / 39) * 100}%` } as React.CSSProperties}
          />
        </div>
      </div>

      <p className="mt-5 text-[12px] leading-relaxed text-ink-3">
        An illustration, not a promise. Assumes 5.5% a year before inflation, fees and tax. Investments can fall as well as rise.
      </p>
    </div>
  );
}
