"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui";
import { useI18n } from "@/components/i18n";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col justify-center px-5 py-10">
      <h1 className="display text-[44px] text-ink">{t("Something went wrong on our side")}</h1>
      <p className="mt-3 text-ink-2">
        {t("Your data is safe. Try again, and if it keeps happening, come back in a few minutes.")}
        {error.digest ? <span className="mt-2 block text-[13px] text-ink-3">{t("Reference: {code}", { code: error.digest })}</span> : null}
      </p>
      <div className="mt-7 flex flex-wrap gap-3">
        <Button type="button" onClick={() => reset()}>{t("Try again")}</Button>
        <ButtonLink href="/overview" variant="secondary">{t("Go to your overview")}</ButtonLink>
      </div>
    </div>
  );
}
