import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/** Small, dependency-free UI kit. Every colour comes from the design tokens. */

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary: "bg-brand text-on-brand hover:bg-brand-hover",
  secondary: "bg-raised text-ink border border-line-strong hover:bg-sunken",
  ghost: "text-ink-2 hover:bg-sunken hover:text-ink",
  danger: "text-neg border border-line-strong hover:bg-neg-soft",
};

const SIZE: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13.5px]",
  md: "h-11 px-5 text-[15px]",
  lg: "h-[52px] px-7 text-base",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-control font-medium whitespace-nowrap select-none",
    "transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none",
    VARIANT[variant],
    SIZE[size],
    extra,
  );
}

export function Button({
  variant,
  size,
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button {...props} className={buttonClass(variant, size, className)} />;
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link {...props} className={buttonClass(variant, size, className)} />;
}

/** Field look without any size, for inputs that set their own width, height or padding. */
export const fieldClass =
  "rounded-control border border-line-strong bg-raised text-ink placeholder:text-ink-3 transition-colors " +
  "hover:border-ink-3 focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/25";

/** The standard full-width text input. 16px on phones so iOS does not zoom on focus. */
export const inputClass = `block w-full h-11 px-3.5 text-base sm:text-[15px] ${fieldClass}`;

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13.5px] font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1.5 text-[13px] text-neg">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[13px] text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}

export function Panel({ className, ...props }: ComponentProps<"section">) {
  return <section {...props} className={cx("rounded-panel border border-line bg-surface", className)} />;
}

export function PanelHeader({
  title,
  note,
  action,
}: {
  title: string;
  note?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-5 sm:px-6 sm:pt-6">
      <div className="min-w-0">
        <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
        {note ? <p className="mt-0.5 text-[13.5px] text-ink-3">{note}</p> : null}
      </div>
      {action}
    </div>
  );
}

type Tone = "neutral" | "brand" | "accent" | "neg";
const TONE: Record<Tone, string> = {
  neutral: "bg-sunken text-ink-2",
  brand: "bg-brand-soft text-brand-ink",
  accent: "bg-accent-soft text-accent-ink",
  neg: "bg-neg-soft text-neg",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12.5px] font-medium", TONE[tone], className)}>
      {children}
    </span>
  );
}

export function PageHeader({ title, lead, action }: { title: string; lead?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 sm:mb-8">
      <div className="min-w-0 max-w-2xl">
        <h1 className="display text-[34px] text-ink sm:text-[42px]">{title}</h1>
        {lead ? <p className="mt-2 text-[15px] text-ink-2 sm:text-base">{lead}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
    </header>
  );
}

export function Notice({
  tone = "neutral",
  title,
  children,
  action,
}: {
  tone?: "neutral" | "accent" | "neg";
  title?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  const style =
    tone === "accent"
      ? "bg-accent-soft text-accent-ink border-transparent"
      : tone === "neg"
        ? "bg-neg-soft text-neg border-transparent"
        : "bg-sunken text-ink-2 border-transparent";
  return (
    <div className={cx("flex flex-wrap items-center justify-between gap-3 rounded-control border px-4 py-3 text-[13.5px]", style)}>
      <p className="min-w-0 flex-1">
        {title ? <strong className="font-semibold">{title} </strong> : null}
        {children}
      </p>
      {action}
    </div>
  );
}

/** Label over a serif figure. The basic unit of every summary row. */
export function Stat({
  label,
  value,
  note,
  size = "md",
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  size?: "md" | "lg";
}) {
  return (
    <div className="min-w-0">
      <p className="text-[13px] text-ink-3">{label}</p>
      <p className={cx("figure mt-1 truncate text-ink", size === "lg" ? "text-[40px] leading-none sm:text-[52px]" : "text-[26px] leading-tight sm:text-[30px]")}>
        {value}
      </p>
      {note ? <p className="mt-1 text-[13px] text-ink-2">{note}</p> : null}
    </div>
  );
}
