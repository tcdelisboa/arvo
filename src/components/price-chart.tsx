"use client";

import { useState, useTransition } from "react";
import { RANGES, type Candle, type Range } from "@/lib/market/types";
import { percent } from "@/lib/format";
import { PriceLine } from "./charts";
import { cx } from "./ui";

const LABEL: Record<Range, string> = { "1m": "1 month", "6m": "6 months", "1y": "1 year", "5y": "5 years" };

export function PriceChart({
  symbol,
  currency,
  initial,
  initialRange,
}: {
  symbol: string;
  currency: string | null;
  initial: Candle[];
  initialRange: Range;
}) {
  const [range, setRange] = useState<Range>(initialRange);
  const [points, setPoints] = useState<Candle[]>(initial);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  const choose = (next: Range) => {
    if (next === range) return;
    setRange(next);
    setFailed(false);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/markets/history?symbol=${encodeURIComponent(symbol)}&range=${next}`);
        if (!response.ok) throw new Error("Request failed");
        const json = (await response.json()) as { points: Candle[] };
        setPoints(json.points ?? []);
      } catch {
        setFailed(true);
      }
    });
  };

  const change = points.length > 1 && points[0].c > 0 ? ((points[points.length - 1].c - points[0].c) / points[0].c) * 100 : null;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Period" className="inline-flex rounded-control bg-sunken p-1">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => choose(r)}
              aria-pressed={r === range}
              className={cx(
                "h-8 rounded-lg px-3 text-[13px] transition-colors",
                r === range ? "bg-raised font-medium text-ink shadow-[0_1px_2px_rgb(14_33_29/0.1)]" : "text-ink-2 hover:text-ink",
              )}
            >
              {LABEL[r]}
            </button>
          ))}
        </div>
        {change !== null ? (
          <p className="text-[13.5px] text-ink-2">
            <span className={cx("tnum font-medium", change >= 0 ? "text-pos" : "text-neg")}>{percent(change, 1, true)}</span> over {LABEL[range]}
          </p>
        ) : null}
      </div>
      <div className={cx("transition-opacity", pending && "opacity-50")}>
        {failed ? (
          <p className="flex h-[260px] items-center justify-center text-[14px] text-ink-3">We couldn&apos;t load this period. Try again.</p>
        ) : (
          <PriceLine points={points} currency={currency} />
        )}
      </div>
    </div>
  );
}
