"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { money, month as monthLabel, price as priceLabel } from "@/lib/format";

/**
 * Charts, drawn by hand in SVG so they follow the design tokens exactly.
 * Marks are thin, grids are hairlines, text uses text colours (never the
 * series colour), and every chart has a hover/touch readout.
 */

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(node);
    setWidth(Math.round(node.getBoundingClientRect().width));
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Round axis ticks: 0, 500, 1,000 rather than 0, 437, 874. */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0];
  const rough = max / count;
  const power = Math.pow(10, Math.floor(Math.log10(rough)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= rough) ?? 10 * power;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step * 0.999; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return ticks;
}

function compactMoney(cents: number, currency: string): string {
  const value = cents / 100;
  const symbol = money(0, currency, { whole: true }).replace(/[\d.,\s]/g, "");
  if (Math.abs(value) >= 1_000_000) return `${symbol}${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
  if (Math.abs(value) >= 1000) {
    const k = value / 1000;
    return `${symbol}${Number.isInteger(k) ? k : k.toFixed(1)}K`;
  }
  return `${symbol}${Math.round(value).toLocaleString("en-GB")}`;
}

function Legend({ items }: { items: { label: string; swatch: ReactNode }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink-2">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          {item.swatch}
          {item.label}
        </li>
      ))}
    </ul>
  );
}

function Tooltip({ x, width, children }: { x: number; width: number; children: ReactNode }) {
  const boxWidth = 176;
  const left = Math.min(Math.max(x - boxWidth / 2, 0), Math.max(0, width - boxWidth));
  return (
    <div
      role="status"
      className="pointer-events-none absolute top-0 z-10 rounded-control border border-line bg-raised px-3 py-2 text-[12.5px] shadow-[0_6px_24px_rgb(14_33_29/0.12)]"
      style={{ left, width: boxWidth }}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Money in and out per month                                                  */
/* -------------------------------------------------------------------------- */

export function MonthColumns({
  data,
  currency,
  height = 220,
}: {
  data: { ym: string; income: number; spending: number }[];
  currency: string;
  height?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const pad = { top: 12, right: 4, bottom: 26, left: 46 };
  const innerW = Math.max(0, width - pad.left - pad.right);
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.spending]));
  const ticks = niceTicks(max, 3);
  const top = ticks[ticks.length - 1];
  const y = (v: number) => pad.top + innerH - (v / top) * innerH;
  const band = data.length ? innerW / data.length : 0;
  const bar = Math.min(18, Math.max(5, (band - 10) / 2));

  const column = (x: number, value: number, fill: string) => {
    const h = Math.max(0, (value / top) * innerH);
    if (h <= 0) return null;
    const r = Math.min(4, h, bar / 2);
    const yTop = pad.top + innerH - h;
    // Rounded at the data end, square on the baseline.
    const d = `M${x},${yTop + h} V${yTop + r} Q${x},${yTop} ${x + r},${yTop} H${x + bar - r} Q${x + bar},${yTop} ${x + bar},${yTop + r} V${yTop + h} Z`;
    return <path d={d} fill={fill} />;
  };

  return (
    <div>
      <Legend
        items={[
          { label: "Money in", swatch: <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: "var(--s-muted)" }} /> },
          { label: "Spending", swatch: <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: "var(--s1)" }} /> },
        ]}
      />
      <div ref={ref} className="relative mt-3" style={{ height }}>
        {width > 0 ? (
          <>
            <svg width={width} height={height} role="img" aria-label="Money in and spending per month">
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="var(--line)" />
                  <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11.5" fill="var(--ink-3)" className="tnum">
                    {compactMoney(t, currency)}
                  </text>
                </g>
              ))}
              {data.map((d, i) => {
                const x0 = pad.left + band * i + band / 2;
                return (
                  <g key={d.ym} opacity={active === null || active === i ? 1 : 0.45}>
                    {column(x0 - bar - 1, d.income, "var(--s-muted)")}
                    {column(x0 + 1, d.spending, "var(--s1)")}
                    <text x={x0} y={height - 8} textAnchor="middle" fontSize="11.5" fill="var(--ink-3)">
                      {monthLabel(d.ym)}
                    </text>
                    <rect
                      x={pad.left + band * i}
                      y={pad.top}
                      width={band}
                      height={innerH + pad.bottom}
                      fill="transparent"
                      onPointerEnter={() => setActive(i)}
                      onPointerDown={() => setActive(i)}
                      onPointerLeave={() => setActive(null)}
                    />
                  </g>
                );
              })}
            </svg>
            {active !== null && data[active] ? (
              <Tooltip x={pad.left + band * active + band / 2} width={width}>
                <p className="mb-1 font-medium text-ink">{monthLabel(data[active].ym, "long")}</p>
                <p className="flex justify-between gap-3 text-ink-2">
                  <span>Money in</span>
                  <span className="tnum text-ink">{money(data[active].income, currency, { whole: true })}</span>
                </p>
                <p className="flex justify-between gap-3 text-ink-2">
                  <span>Spending</span>
                  <span className="tnum text-ink">{money(data[active].spending, currency, { whole: true })}</span>
                </p>
              </Tooltip>
            ) : null}
          </>
        ) : null}
      </div>
      <table className="sr-only">
        <caption>Money in and spending per month</caption>
        <thead>
          <tr><th>Month</th><th>Money in</th><th>Spending</th></tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.ym}>
              <td>{monthLabel(d.ym, "long")}</td>
              <td>{money(d.income, currency)}</td>
              <td>{money(d.spending, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* A single line with a soft wash: price history                               */
/* -------------------------------------------------------------------------- */

export function PriceLine({
  points,
  currency,
  height = 260,
}: {
  points: { t: number; c: number }[];
  currency: string | null;
  height?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const gradient = useId();
  const pad = { top: 14, right: 8, bottom: 24, left: 8 };
  const innerW = Math.max(0, width - pad.left - pad.right);
  const innerH = height - pad.top - pad.bottom;

  const geometry = useMemo(() => {
    if (points.length < 2 || innerW <= 0) return null;
    const values = points.map((p) => p.c);
    let min = Math.min(...values);
    let max = Math.max(...values);
    const padding = (max - min || max || 1) * 0.08;
    min -= padding;
    max += padding;
    const t0 = points[0].t;
    const t1 = points[points.length - 1].t;
    const x = (t: number) => pad.left + ((t - t0) / (t1 - t0 || 1)) * innerW;
    const y = (v: number) => pad.top + innerH - ((v - min) / (max - min)) * innerH;
    const path = points.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.c).toFixed(1)}`).join("");
    const area = `${path}L${x(t1).toFixed(1)},${pad.top + innerH}L${x(t0).toFixed(1)},${pad.top + innerH}Z`;
    return { x, y, path, area, t0, t1 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, innerW, innerH]);

  const up = points.length > 1 && points[points.length - 1].c >= points[0].c;
  const stroke = up ? "var(--pos)" : "var(--neg)";
  const date = (t: number) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

  const onMove = (clientX: number, target: SVGSVGElement) => {
    if (!geometry) return;
    const rect = target.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left - pad.left) / innerW));
    const t = geometry.t0 + ratio * (geometry.t1 - geometry.t0);
    let lo = 0;
    let hi = points.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (points[mid].t < t) lo = mid;
      else hi = mid;
    }
    setActive(t - points[lo].t < points[hi].t - t ? lo : hi);
  };

  const point = active !== null ? points[active] : null;

  return (
    <div ref={ref} className="relative" style={{ height }}>
      {width > 0 && geometry ? (
        <>
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={`Price from ${date(geometry.t0)} to ${date(geometry.t1)}`}
            className="touch-pan-y"
            onPointerMove={(e) => onMove(e.clientX, e.currentTarget)}
            onPointerDown={(e) => onMove(e.clientX, e.currentTarget)}
            onPointerLeave={() => setActive(null)}
          >
            <defs>
              <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor={stroke} stopOpacity="0.14" />
                <stop offset="1" stopColor={stroke} stopOpacity="0" />
              </linearGradient>
            </defs>
            <line x1={pad.left} x2={width - pad.right} y1={pad.top + innerH} y2={pad.top + innerH} stroke="var(--line)" />
            <path d={geometry.area} fill={`url(#${gradient})`} />
            <path d={geometry.path} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            <text x={pad.left} y={height - 6} fontSize="11.5" fill="var(--ink-3)">{date(geometry.t0)}</text>
            <text x={width - pad.right} y={height - 6} fontSize="11.5" fill="var(--ink-3)" textAnchor="end">{date(geometry.t1)}</text>
            {point ? (
              <g>
                <line x1={geometry.x(point.t)} x2={geometry.x(point.t)} y1={pad.top} y2={pad.top + innerH} stroke="var(--line-strong)" />
                <circle cx={geometry.x(point.t)} cy={geometry.y(point.c)} r="5" fill={stroke} stroke="var(--surface)" strokeWidth="2" />
              </g>
            ) : (
              <circle
                cx={geometry.x(geometry.t1)}
                cy={geometry.y(points[points.length - 1].c)}
                r="4"
                fill={stroke}
                stroke="var(--surface)"
                strokeWidth="2"
              />
            )}
          </svg>
          {point ? (
            <Tooltip x={geometry.x(point.t)} width={width}>
              <p className="text-ink-3">{date(point.t)}</p>
              <p className="tnum text-[14px] font-medium text-ink">{priceLabel(point.c, currency)}</p>
            </Tooltip>
          ) : null}
        </>
      ) : (
        <div className="flex h-full items-center justify-center text-[13.5px] text-ink-3">
          {points.length < 2 ? "No price history available." : null}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Projection: what you pay in, the likely value, and an honest range          */
/* -------------------------------------------------------------------------- */

export type ProjectionDatum = { year: number; paid: number; low: number; mid: number; high: number };

export function ProjectionChart({
  data,
  currency,
  height = 280,
}: {
  data: ProjectionDatum[];
  currency: string;
  height?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const pad = { top: 12, right: 10, bottom: 26, left: 48 };
  const innerW = Math.max(0, width - pad.left - pad.right);
  const innerH = height - pad.top - pad.bottom;
  const years = data.length - 1;
  const ticks = niceTicks(Math.max(1, ...data.map((d) => d.high)), 4);
  const top = ticks[ticks.length - 1];
  const x = (year: number) => pad.left + (years ? (year / years) * innerW : 0);
  const y = (v: number) => pad.top + innerH - (v / top) * innerH;
  const line = (pick: (d: ProjectionDatum) => number) =>
    data.map((d, i) => `${i ? "L" : "M"}${x(d.year).toFixed(1)},${y(pick(d)).toFixed(1)}`).join("");
  const band =
    data.map((d, i) => `${i ? "L" : "M"}${x(d.year).toFixed(1)},${y(d.high).toFixed(1)}`).join("") +
    [...data].reverse().map((d) => `L${x(d.year).toFixed(1)},${y(d.low).toFixed(1)}`).join("") +
    "Z";
  const yearTicks = data.filter((d) => d.year % (years > 24 ? 10 : years > 12 ? 5 : years > 6 ? 2 : 1) === 0);
  const point = active !== null ? data[active] : null;

  return (
    <div>
      <Legend
        items={[
          { label: "Likely value", swatch: <span className="h-0.5 w-4 rounded-full" style={{ background: "var(--s1)" }} /> },
          { label: "Range of outcomes", swatch: <span className="h-2.5 w-4 rounded-[3px]" style={{ background: "var(--s1)", opacity: 0.18 }} /> },
          { label: "What you paid in", swatch: <span className="h-0.5 w-4 rounded-full" style={{ background: "var(--s-muted)" }} /> },
        ]}
      />
      <div ref={ref} className="relative mt-3" style={{ height }}>
        {width > 0 ? (
          <>
            <svg
              width={width}
              height={height}
              role="img"
              aria-label={`Projected value over ${years} years`}
              className="touch-pan-y"
              onPointerMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left - pad.left) / innerW));
                setActive(Math.round(ratio * years));
              }}
              onPointerLeave={() => setActive(null)}
            >
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="var(--line)" />
                  <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11.5" fill="var(--ink-3)" className="tnum">
                    {compactMoney(t, currency)}
                  </text>
                </g>
              ))}
              {yearTicks.map((d) => (
                <text key={d.year} x={x(d.year)} y={height - 8} textAnchor={d.year === 0 ? "start" : d.year === years ? "end" : "middle"} fontSize="11.5" fill="var(--ink-3)">
                  {d.year === 0 ? "Today" : `${d.year}y`}
                </text>
              ))}
              <path d={band} fill="var(--s1)" opacity="0.14" />
              <path d={line((d) => d.paid)} fill="none" stroke="var(--s-muted)" strokeWidth="2" strokeLinecap="round" />
              <path d={line((d) => d.mid)} fill="none" stroke="var(--s1)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              {point ? (
                <g>
                  <line x1={x(point.year)} x2={x(point.year)} y1={pad.top} y2={pad.top + innerH} stroke="var(--line-strong)" />
                  <circle cx={x(point.year)} cy={y(point.paid)} r="4.5" fill="var(--s-muted)" stroke="var(--surface)" strokeWidth="2" />
                  <circle cx={x(point.year)} cy={y(point.mid)} r="5" fill="var(--s1)" stroke="var(--surface)" strokeWidth="2" />
                </g>
              ) : (
                <circle cx={x(years)} cy={y(data[years].mid)} r="4.5" fill="var(--s1)" stroke="var(--surface)" strokeWidth="2" />
              )}
            </svg>
            {point ? (
              <Tooltip x={x(point.year)} width={width}>
                <p className="mb-1 font-medium text-ink">{point.year === 0 ? "Today" : `After ${point.year} ${point.year === 1 ? "year" : "years"}`}</p>
                <p className="flex justify-between gap-3 text-ink-2"><span>Likely value</span><span className="tnum text-ink">{money(point.mid, currency, { whole: true })}</span></p>
                <p className="flex justify-between gap-3 text-ink-2"><span>Range</span><span className="tnum text-ink">{compactMoney(point.low, currency)} to {compactMoney(point.high, currency)}</span></p>
                <p className="flex justify-between gap-3 text-ink-2"><span>Paid in</span><span className="tnum text-ink">{money(point.paid, currency, { whole: true })}</span></p>
              </Tooltip>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Allocation ring                                                             */
/* -------------------------------------------------------------------------- */

export const SERIES_COLORS = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)", "var(--s6)", "var(--s7)"];

export function AllocationRing({
  segments,
  size = 220,
  children,
}: {
  segments: { label: string; weight: number; color: string }[];
  size?: number;
  children?: ReactNode;
}) {
  const [active, setActive] = useState<number | null>(null);
  const stroke = 22;
  const r = (size - stroke) / 2;
  const c = size / 2;
  const total = segments.reduce((sum, s) => sum + s.weight, 0) || 1;
  // A 2px gap in the surface colour separates segments.
  const gapAngle = (2 / (2 * Math.PI * r)) * 360;
  // Precompute where each segment starts so rendering stays pure.
  const starts = segments.map((_, i) => segments.slice(0, i).reduce((sum, s) => sum + (s.weight / total) * 360, 0) - 90);

  const arc = (start: number, sweep: number) => {
    const a0 = (start * Math.PI) / 180;
    const a1 = ((start + sweep) * Math.PI) / 180;
    const large = sweep > 180 ? 1 : 0;
    return `M${c + r * Math.cos(a0)},${c + r * Math.sin(a0)} A${r},${r} 0 ${large} 1 ${c + r * Math.cos(a1)},${c + r * Math.sin(a1)}`;
  };

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label={segments.map((s) => `${s.label} ${Math.round(s.weight)}%`).join(", ")}>
        {segments.map((segment, i) => {
          const sweep = (segment.weight / total) * 360;
          const drawn = Math.max(0.5, sweep - gapAngle);
          return (
            <path
              key={segment.label}
              d={arc(starts[i] + gapAngle / 2, drawn)}
              fill="none"
              stroke={segment.color}
              strokeWidth={active === i ? stroke + 4 : stroke}
              opacity={active === null || active === i ? 1 : 0.4}
              style={{ transition: "opacity 150ms, stroke-width 150ms" }}
              onPointerEnter={() => setActive(i)}
              onPointerDown={() => setActive(i)}
              onPointerLeave={() => setActive(null)}
            />
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-9 text-center">
        {active !== null ? (
          <>
            <span className="figure text-[34px] leading-none text-ink">{Math.round(segments[active].weight)}%</span>
            <span className="mt-1.5 text-[12.5px] leading-tight text-ink-2">{segments[active].label}</span>
          </>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
