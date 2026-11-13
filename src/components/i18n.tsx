"use client";

import { createContext, useContext, useMemo } from "react";
import { fmtFor } from "@/lib/format";
import { makeT, type Lang } from "@/lib/i18n/core";

const LangContext = createContext<Lang>("en");

export function I18nProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

/** Translation and number formatting for client components. */
export function useI18n() {
  const lang = useContext(LangContext);
  return useMemo(() => ({ lang, t: makeT(lang), f: fmtFor(lang) }), [lang]);
}
