import { cache } from "react";
import { cookies, headers } from "next/headers";
import { fmtFor } from "@/lib/format";
import { LANG_COOKIE, isLang, langFromHeader, makeT, type Lang } from "./core";

/** The visitor's language: their saved choice, otherwise what the browser asks for. */
export const getLang = cache(async (): Promise<Lang> => {
  const saved = (await cookies()).get(LANG_COOKIE)?.value;
  if (isLang(saved)) return saved;
  return langFromHeader((await headers()).get("accept-language"));
});

export async function getI18n() {
  const lang = await getLang();
  return { lang, t: makeT(lang), f: fmtFor(lang) };
}

/** `export const generateMetadata = titled(msg("Page title"))` for a translated tab title. */
export function titled(title: string) {
  return async (): Promise<{ title: string }> => ({ title: (await getI18n()).t(title) });
}
