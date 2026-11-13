import { getI18n, titled } from "@/lib/i18n/server";
import { msg } from "@/lib/i18n/core";
import Link from "next/link";
import { Download, LogOut } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";
import { setCurrency } from "@/lib/actions/data";
import { CURRENCIES } from "@/lib/format";
import { buttonClass, cx, fieldClass, PageHeader, Panel, PanelHeader } from "@/components/ui";
import { DeleteForm, NameForm, PasswordForm } from "@/components/settings-forms";
import { SubmitButton } from "@/components/submit-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LangSwitch } from "@/components/lang-switch";

export const generateMetadata = titled(msg("Settings"));

export default async function SettingsPage() {
  const user = await requireUser();
  const { t } = await getI18n();
  return (
    <>
      <PageHeader title={t("Settings")} />
      <div className="max-w-[760px] space-y-5">
        <Panel>
          <PanelHeader title={t("You")} />
          <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
            <NameForm name={user.name} email={user.email} />
          </div>
        </Panel>

        <Panel>
          <PanelHeader title={t("Preferences")} />
          <div className="space-y-5 px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
            <form action={setCurrency} className="flex flex-wrap items-end gap-2">
              <div>
                <label htmlFor="currency" className="mb-1.5 block text-[13.5px] font-medium text-ink">{t("Currency")}</label>
                <select id="currency" name="currency" defaultValue={user.currency} key={user.currency} className={cx(fieldClass, "block h-11 w-[160px] px-3 text-base sm:text-[15px]")}>
                  {CURRENCIES.map((code) => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
              </div>
              <SubmitButton variant="secondary" pendingLabel={t("Saving")}>{t("Save")}</SubmitButton>
            </form>
            <p className="-mt-2 text-[13px] text-ink-3">{t("Amounts are shown in this currency. Changing it does not convert existing transactions.")}</p>
            <div className="flex items-center justify-between gap-4 border-t border-line pt-4">
              <div>
                <p className="text-[13.5px] font-medium text-ink">{t("Language")}</p>
                <p className="text-[13px] text-ink-3">{t("English or Brazilian Portuguese.")}</p>
              </div>
              <LangSwitch />
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-line pt-4">
              <div>
                <p className="text-[13.5px] font-medium text-ink">{t("Appearance")}</p>
                <p className="text-[13px] text-ink-3">{t("Follows your device until you choose.")}</p>
              </div>
              <ThemeToggle labelled className="border border-line-strong" />
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title={t("Accounts and data")} note={t("Where your transactions come from, and a copy of everything Arvo holds about you.")} />
          <div className="flex flex-wrap gap-2 px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
            <Link href="/accounts" className={buttonClass("secondary", "md")}>{t("Manage accounts")}</Link>
            <a href="/api/me" download className={buttonClass("secondary", "md")}><Download size={17} /> {t("Download my data")}</a>
          </div>
        </Panel>

        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
            <div>
              <h2 className="text-[17px] font-semibold text-ink">{t("Plan")}</h2>
              <p className="text-[13.5px] text-ink-3">
                {user.plan === "plus" ? t("You are on Plus.") : t("You are on Free.")}
              </p>
            </div>
            <span className="flex flex-wrap gap-2">
              {user.isAdmin ? <Link href="/admin" className={buttonClass("secondary", "md")}>Admin</Link> : null}
              <Link href="/plus" className={buttonClass("secondary", "md")}>{user.plan === "plus" ? t("What Plus includes") : t("See Plus")}</Link>
            </span>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title={t("Password")} />
          <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
            <PasswordForm />
          </div>
        </Panel>

        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
            <div>
              <h2 className="text-[17px] font-semibold text-ink">{t("Sign out")}</h2>
              <p className="text-[13.5px] text-ink-3">{t("Signed in as {email}", { email: user.email })}</p>
            </div>
            <form action={logout}>
              <SubmitButton variant="secondary" pendingLabel={t("Signing out")}><LogOut size={16} /> {t("Sign out")}</SubmitButton>
            </form>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title={t("Delete account")} note={t("Removes your account, transactions and investor profile. This cannot be undone.")} />
          <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
            <DeleteForm />
          </div>
        </Panel>

        <p className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink-3">
          <Link href="/terms" className="underline underline-offset-2">{t("Terms")}</Link>
          <Link href="/privacy" className="underline underline-offset-2">{t("Privacy")}</Link>
          <Link href="/risk" className="underline underline-offset-2">{t("Risk notice")}</Link>
        </p>
      </div>
    </>
  );
}
