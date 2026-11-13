import { titled } from "@/lib/i18n/server";
import { msg } from "@/lib/i18n/core";
import Link from "next/link";
import { ResetForm } from "@/components/auth-forms";
import { Notice } from "@/components/ui";
import { getI18n } from "@/lib/i18n/server";

export const generateMetadata = titled(msg("Choose a new password"));

export default async function ResetPage({ searchParams }: PageProps<"/reset">) {
  const params = await searchParams;
  const { t } = await getI18n();
  const token = typeof params.token === "string" ? params.token : "";
  return (
    <>
      <h1 className="display text-[38px] text-ink">{t("Choose a new password")}</h1>
      <p className="mb-8 mt-2 text-ink-2">{t("You will be signed out everywhere else.")}</p>
      {token ? (
        <ResetForm token={token} />
      ) : (
        <Notice tone="neg">
          {t("This link is missing its token.")} <Link href="/forgot" className="underline">{t("Request a new one.")}</Link>
        </Notice>
      )}
    </>
  );
}
