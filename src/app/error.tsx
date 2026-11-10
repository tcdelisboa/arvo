"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col justify-center px-5 py-10">
      <h1 className="display text-[44px] text-ink">Something went wrong on our side</h1>
      <p className="mt-3 text-ink-2">
        Your data is safe. Try again, and if it keeps happening, come back in a few minutes.
        {error.digest ? <span className="mt-2 block text-[13px] text-ink-3">Reference: {error.digest}</span> : null}
      </p>
      <div className="mt-7 flex flex-wrap gap-3">
        <Button type="button" onClick={() => reset()}>Try again</Button>
        <ButtonLink href="/overview" variant="secondary">Go to your overview</ButtonLink>
      </div>
    </div>
  );
}
