"use client";

import { AllocationRing } from "./charts";

export function HoldingsRing({
  segments,
  center,
  caption,
}: {
  segments: { label: string; weight: number; color: string }[];
  center: string;
  caption: string;
}) {
  return (
    <AllocationRing segments={segments}>
      <span className="figure text-[30px] leading-none text-ink">{center}</span>
      <span className="mt-1.5 text-[12.5px] text-ink-3">{caption}</span>
    </AllocationRing>
  );
}
