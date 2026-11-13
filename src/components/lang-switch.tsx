import { Languages } from "lucide-react";
import { setLang } from "@/lib/actions/lang";
import { getI18n } from "@/lib/i18n/server";
import { cx } from "./ui";

/** EN / PT switch. A plain form, so it works before any script loads. */
export async function LangSwitch({ className }: { className?: string }) {
  const { lang, t } = await getI18n();
  return (
    <form action={setLang} className={cx("inline-flex items-center gap-1", className)} aria-label={t("Language")}>
      <Languages size={16} className="mr-1 text-ink-3" aria-hidden />
      {(["en", "pt"] as const).map((code) => (
        <button
          key={code}
          type="submit"
          name="lang"
          value={code}
          aria-pressed={lang === code}
          title={code === "en" ? "English" : "Português"}
          className={cx(
            "h-8 rounded-lg px-2 text-[12.5px] font-semibold uppercase tracking-wide transition-colors",
            lang === code ? "bg-brand-soft text-brand-ink" : "text-ink-3 hover:bg-sunken hover:text-ink",
          )}
        >
          {code}
        </button>
      ))}
    </form>
  );
}
