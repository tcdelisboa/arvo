import Link from "next/link";
import { LogOut } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";
import { Logo } from "@/components/logo";
import { SideNav, TabBar } from "@/components/nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { LangSwitch } from "@/components/lang-switch";
import { getI18n } from "@/lib/i18n/server";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const { t } = await getI18n();
  const initial = user.name.trim().charAt(0).toUpperCase() || "A";

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[236px_minmax(0,1fr)]">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-raised focus:px-4 focus:py-2">
        {t("Skip to content")}
      </a>

      <aside className="no-print sticky top-0 hidden h-dvh flex-col border-r border-line px-4 py-6 lg:flex">
        <Link href="/overview" aria-label={t("Arvo overview")} className="mb-8 px-3">
          <Logo />
        </Link>
        <SideNav plus={user.plan === "plus"} admin={user.isAdmin} />
        <div className="mt-auto space-y-1">
          <LangSwitch className="px-3 pb-1" />
          <ThemeToggle labelled className="w-full justify-start" />
          <div className="flex items-center gap-3 rounded-control px-3 py-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[13px] font-semibold text-brand-ink">
              {initial}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-medium text-ink">{user.name}</span>
              <span className="block truncate text-[12px] text-ink-3">{user.email}</span>
            </span>
            <form action={logout}>
              <button type="submit" aria-label={t("Sign out")} title={t("Sign out")} className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-3 hover:bg-sunken hover:text-ink">
                <LogOut size={16} />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="no-print sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-page/90 px-4 backdrop-blur lg:hidden">
          <Link href="/overview" aria-label={t("Arvo overview")}>
            <Logo size={24} />
          </Link>
          <div className="flex items-center gap-1">
            <LangSwitch />
            <ThemeToggle />
          </div>
        </header>
        <main id="main" className="settle mx-auto w-full max-w-[1100px] px-4 pb-28 pt-6 sm:px-8 sm:pt-10 lg:pb-16">
          {children}
        </main>
      </div>

      <TabBar />
    </div>
  );
}
