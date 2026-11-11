import { cx } from "./ui";

/**
 * The mark: the A of Arvo with a rising line and three growing bars, which is
 * what the product is for. Drawn on a 32 by 32 grid; `scripts/make-icons.mjs`
 * holds the same shapes for the app icons.
 */
export function Mark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" className={className}>
      <path
        d="M1.5 28 L11.2 5.2 Q11.6 4.2 12.7 4.2 H17.1 Q18.2 4.2 18.7 5.2 L22.3 12.5 L18.5 15.2 L15.2 9.4 L7.6 28 Z"
        fill="var(--brand)"
      />
      <path d="M10.6 28 C13.6 21.4 20.4 15.6 30.5 13.6" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M15.2 25 L18.2 23.3 V28 H15.2 Z M19.9 22.3 L22.9 20.6 V28 H19.9 Z M24.6 19.7 L27.6 18.2 V28 H24.6 Z"
        fill="var(--brand)"
      />
    </svg>
  );
}

export function Logo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-2 text-ink", className)}>
      <Mark size={size} />
      <span className="font-sans font-semibold tracking-[-0.03em]" style={{ fontSize: size * 0.8, lineHeight: 1 }}>
        Arvo
      </span>
    </span>
  );
}
