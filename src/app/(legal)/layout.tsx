import Link from "next/link";
import { Logo } from "@/components/logo";
import { LangSwitch } from "@/components/lang-switch";
import { getI18n } from "@/lib/i18n/server";

export default async function LegalLayout({ children }: LayoutProps<"/">) {
  const { t } = await getI18n();
  return (
    <div className="mx-auto w-full max-w-[760px] px-5 py-6 sm:px-8 sm:py-8">
      <header className="flex items-center justify-between">
        <Link href="/" aria-label={t("Arvo home")}>
          <Logo />
        </Link>
        <div className="flex items-center gap-3">
          <LangSwitch />
          <Link href="/" className="text-[14px] text-ink-2 underline underline-offset-2 hover:text-ink">
            {t("Back to Arvo")}
          </Link>
        </div>
      </header>
      <main className="legal settle py-12">{children}</main>
      <footer className="flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-6 text-[13.5px] text-ink-2">
        <Link href="/terms" className="hover:text-ink">{t("Terms")}</Link>
        <Link href="/privacy" className="hover:text-ink">{t("Privacy")}</Link>
        <Link href="/risk" className="hover:text-ink">{t("Risk notice")}</Link>
      </footer>
    </div>
  );
}
