import { titled } from "@/lib/i18n/server";
import { msg } from "@/lib/i18n/core";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { LoginForm } from "@/components/auth-forms";
import { Notice } from "@/components/ui";
import { getI18n } from "@/lib/i18n/server";

export const generateMetadata = titled(msg("Sign in"));

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getUser()) redirect("/overview");
  const params = await searchParams;
  const { t } = await getI18n();
  return (
    <>
      <h1 className="display text-[38px] text-ink">{t("Welcome back")}</h1>
      <p className="mb-8 mt-2 text-ink-2">{t("Sign in to see your money and your plan.")}</p>
      {params.reset ? (
        <div className="mb-4">
          <Notice tone="accent">{t("Your password was changed. Sign in with the new one.")}</Notice>
        </div>
      ) : null}
      {params.deleted ? (
        <div className="mb-4">
          <Notice tone="accent">{t("Your account and all of its data were deleted.")}</Notice>
        </div>
      ) : null}
      <LoginForm />
      <p className="mt-6 text-[14px] text-ink-2">
        {t("New to Arvo?")}{" "}
        <Link href="/signup" className="font-medium text-ink underline underline-offset-2">{t("Create an account")}</Link>
      </p>
    </>
  );
}
