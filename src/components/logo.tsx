import { cx } from "./ui";

/**
 * The mark: growth rings. Each arc is a year of saving, the outer one drawn in
 * the accent colour. The same shape returns in the allocation chart.
 */
export function Mark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" className={className}>
      <circle cx="7" cy="25" r="3" fill="var(--brand)" />
      <path d="M7 14.5A10.5 10.5 0 0 1 17.5 25" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" />
      <path d="M7 6.5A18.5 18.5 0 0 1 25.5 25" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-2 text-ink", className)}>
      <Mark size={size} />
      <span className="font-serif font-medium tracking-[-0.02em]" style={{ fontSize: size * 0.86, lineHeight: 1 }}>
        Arvo
      </span>
    </span>
  );
}
