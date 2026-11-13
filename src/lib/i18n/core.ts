import { pt } from "./pt";

export const LANGS = ["en", "pt"] as const;
export type Lang = (typeof LANGS)[number];
export type Vars = Record<string, string | number>;
export type T = (text: string, vars?: Vars) => string;

export const LANG_COOKIE = "arvo_lang";

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && (LANGS as readonly string[]).includes(value);
}

/** Number and date locale for each language. Portuguese follows Brazil. */
export const LOCALE: Record<Lang, string> = { en: "en-GB", pt: "pt-BR" };

/**
 * Marks a string as translatable without translating it yet, for text kept in
 * data (lists of choices, nav items). Translate it where it is shown with t().
 */
export const msg = (text: string) => text;

function fill(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (whole, key: string) => (key in vars ? String(vars[key]) : whole));
}

/** English text is the key; Portuguese falls back to English when missing. */
export function makeT(lang: Lang): T {
  if (lang === "en") return fill;
  return (text, vars) => fill(pt[text] ?? text, vars);
}

export const enT: T = makeT("en");

/** First language the browser asks for, if it is one we have. */
export function langFromHeader(header: string | null | undefined): Lang {
  const first = (header ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  return first.startsWith("pt") ? "pt" : "en";
}
