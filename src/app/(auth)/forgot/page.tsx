import { titled } from "@/lib/i18n/server";
import { msg } from "@/lib/i18n/core";
import Link from "next/link";
import { ForgotForm } from "@/components/auth-forms";
import { getI18n } from "@/lib/i18n/server";

export const generateMetadata = titled(msg("Reset your password"));

export default async function ForgotPage() {
  const { t } = await getI18n();
  return (
    <>
      <h1 className="display text-[38px] text-ink">{t("Reset your password")}</h1>
      <p className="mb-8 mt-2 text-ink-2">{t("Enter the email you signed up with and we will send you a link.")}</p>
      <ForgotForm />
      <p className="mt-6 text-[14px] text-ink-2">
        <Link href="/login" className="font-medium text-ink underline underline-offset-2">{t("Back to sign in")}</Link>
      </p>
    </>
  );
}
