"use client";

import { useMemo, useState } from "react";
import { money, percent } from "@/lib/format";
import { project } from "@/lib/portfolio";
import { ProjectionChart } from "./charts";

/** Projection with a time slider. The range is the point: nobody knows the exact number. */
export function Projection({
  monthlyCents,
  expectedReturn,
  volatility,
  currency,
  defaultYears,
}: {
  monthlyCents: number;
  expectedReturn: number;
  volatility: number;
  currency: string;
  defaultYears: number;
}) {
  const [years, setYears] = useState(defaultYears);
  const data = useMemo(() => project(monthlyCents, { expectedReturn, volatility }, years), [monthlyCents, expectedReturn, volatility, years]);
  const end = data[data.length - 1];
  const fmt = (cents: number) => money(cents, currency, { whole: true });

  return (
    <div>
      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <p className="text-[13px] text-ink-3">Likely value after {years} years</p>
          <p className="figure mt-1 text-[34px] leading-none text-ink">{fmt(end.mid)}</p>
        </div>
        <div>
          <p className="text-[13px] text-ink-3">Could reasonably be between</p>
          <p className="figure mt-1 text-[22px] leading-tight text-ink">{fmt(end.low)} and {fmt(end.high)}</p>
        </div>
        <div>
          <p className="text-[13px] text-ink-3">You would have paid in</p>
          <p className="figure mt-1 text-[22px] leading-tight text-ink">{fmt(end.paid)}</p>
        </div>
      </div>

      <div className="mt-6">
        <ProjectionChart data={data} currency={currency} />
      </div>

      <div className="mt-5 flex items-center gap-4">
        <label htmlFor="years" className="shrink-0 text-[13.5px] text-ink-2">
          Years invested
        </label>
        <input
          id="years"
          type="range"
          min={1}
          max={40}
          value={years}
          onChange={(e) => setYears(Number(e.target.value))}
          style={{ "--fill": `${((years - 1) / 39) * 100}%` } as React.CSSProperties}
        />
        <span className="tnum w-8 shrink-0 text-right text-[14px] font-medium text-ink">{years}</span>
      </div>

      <p className="mt-5 max-w-[70ch] text-[12.5px] leading-relaxed text-ink-3">
        This is an illustration, not a forecast. It assumes {fmt(monthlyCents)} invested every month and a long-run return of{" "}
        {percent(expectedReturn * 100)} a year before inflation, fees and tax, with year-to-year swings of about {percent(volatility * 100, 0)}.
        About two outcomes in three would fall inside the shaded range; one in three would fall outside it. Real markets can do
        better or worse than any model.
      </p>
    </div>
  );
}
