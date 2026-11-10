import Link from "next/link";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-5 py-8">
      <Link href="/" aria-label="Arvo home" className="self-start">
        <Logo />
      </Link>
      <main className="flex flex-1 flex-col justify-center py-10">
        <h1 className="display text-[44px] text-ink">This page doesn&apos;t exist</h1>
        <p className="mt-3 text-ink-2">
          The link may be old, or the share or fund you looked up isn&apos;t available. Your account and data are fine.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <ButtonLink href="/overview">Go to your overview</ButtonLink>
          <ButtonLink href="/markets" variant="secondary">Search markets</ButtonLink>
        </div>
      </main>
    </div>
  );
}
