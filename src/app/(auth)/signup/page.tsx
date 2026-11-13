import { titled } from "@/lib/i18n/server";
import { msg } from "@/lib/i18n/core";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { SignupForm } from "@/components/auth-forms";
import { getI18n } from "@/lib/i18n/server";

export const generateMetadata = titled(msg("Create your account"));

export default async function SignupPage() {
  if (await getUser()) redirect("/overview");
  const { t } = await getI18n();
  return (
    <>
      <h1 className="display text-[38px] text-ink">{t("Create your account")}</h1>
      <p className="mb-8 mt-2 text-ink-2">{t("Free while Arvo is in early access. It takes about a minute.")}</p>
      <SignupForm />
      <p className="mt-6 text-[14px] text-ink-2">
        {t("Already have an account?")}{" "}
        <Link href="/login" className="font-medium text-ink underline underline-offset-2">{t("Sign in")}</Link>
      </p>
    </>
  );
}
