import { LOCALE, type Lang } from "@/lib/i18n/core";

export const CURRENCIES = ["EUR", "BRL", "USD", "GBP"] as const;
export type Currency = (typeof CURRENCIES)[number];

export function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && (CURRENCIES as readonly string[]).includes(value);
}

const MONTHS: Record<Lang, string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  pt: ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"],
};
const MONTHS_LONG: Record<Lang, string[]> = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  pt: ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"],
};

/** Number and date formatting in one language. */
export function fmtFor(lang: Lang) {
  const locale = LOCALE[lang];

  /** Money from integer cents. `whole` drops the decimals for headline figures. */
  function money(cents: number, currency: string, opts: { whole?: boolean; sign?: boolean } = {}): string {
    const digits = opts.whole ? 0 : 2;
    const formatted = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(Math.abs(cents) / 100);
    if (cents < 0) return `−${formatted}`;
    if (opts.sign && cents > 0) return `+${formatted}`;
    return formatted;
  }

  /** A market price in its own currency (not cents). */
  function price(value: number | null | undefined, currency?: string | null): string {
    if (value == null || !Number.isFinite(value)) return "—";
    const digits = Math.abs(value) >= 1000 ? 0 : 2;
    if (!currency) return value.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        currencyDisplay: "narrowSymbol",
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(value);
    } catch {
      return `${value.toFixed(digits)} ${currency}`;
    }
  }

  function number(value: number | null | undefined, digits = 1): string {
    if (value == null || !Number.isFinite(value)) return "—";
    return value.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  function percent(value: number | null | undefined, digits = 1, sign = false): string {
    if (value == null || !Number.isFinite(value)) return "—";
    const body = `${number(Math.abs(value), digits)}%`;
    if (value < 0) return `−${body}`;
    return sign && value > 0 ? `+${body}` : body;
  }

  function compact(value: number | null | undefined, currency?: string | null): string {
    if (value == null || !Number.isFinite(value)) return "—";
    const body = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(value);
    return currency ? `${body} ${currency}` : body;
  }

  /** "2026-11-03" -> "3 Nov 2026" / "3 nov 2026". Pure string work, so server and browser agree. */
  function day(iso: string, withYear = true): string {
    const [y, m, d] = iso.split("-").map(Number);
    const name = MONTHS[lang][m - 1];
    return withYear ? `${d} ${name} ${y}` : `${d} ${name}`;
  }

  /** "2026-11" -> "Nov" / "November 2026" ("novembro de 2026"). */
  function month(ym: string, style: "short" | "long" = "short"): string {
    const [y, m] = ym.split("-").map(Number);
    if (style === "short") return MONTHS[lang][m - 1];
    return lang === "pt" ? `${MONTHS_LONG.pt[m - 1]} de ${y}` : `${MONTHS_LONG.en[m - 1]} ${y}`;
  }

  return { lang, money, price, number, percent, compact, day, month };
}

export type Fmt = ReturnType<typeof fmtFor>;

const en = fmtFor("en");
export const { money, price, number, percent, compact, day, month } = en;

export function todayIso(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Parse a typed amount like "1,250.50" or "1.250,50" into cents. */
export function parseAmountToCents(input: string): number | null {
  let text = input.trim();
  let negative = false;
  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1);
  }
  if (/[-−]/.test(text)) negative = true;
  const digits = text.replace(/[^\d.,]/g, "");
  if (!/\d/.test(digits)) return null;

  const lastComma = digits.lastIndexOf(",");
  const lastDot = digits.lastIndexOf(".");
  let decimal: "," | "." | null = null;
  if (lastComma >= 0 && lastDot >= 0) {
    // Both present: whichever comes last is the decimal mark.
    decimal = lastComma > lastDot ? "," : ".";
  } else if (lastComma >= 0) {
    const count = digits.split(",").length - 1;
    const after = digits.length - lastComma - 1;
    // "1,250" is a thousands separator; "12,5" and "12,50" are decimals.
    decimal = count > 1 || after === 3 ? null : ",";
  } else if (lastDot >= 0) {
    const count = digits.split(".").length - 1;
    decimal = count > 1 ? null : ".";
  }

  let normalised: string;
  if (decimal === ",") normalised = digits.replace(/\./g, "").replace(",", ".");
  else if (decimal === ".") normalised = digits.replace(/,/g, "");
  else normalised = digits.replace(/[.,]/g, "");

  const value = Number(normalised);
  if (!Number.isFinite(value)) return null;
  const cents = Math.round(value * 100);
  return negative ? -cents : cents;
}
