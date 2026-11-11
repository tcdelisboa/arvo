import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { WaitlistForm } from "@/components/waitlist-form";

export const metadata: Metadata = {
  title: "Join the waitlist",
  description: "Arvo shows where your money goes and helps you start investing. Leave your email to hear when it opens.",
};

export default function WaitlistPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[640px] flex-col px-5 py-6 sm:py-8">
      <Link href="/" aria-label="Arvo home" className="self-start">
        <Logo />
      </Link>
      <main className="settle flex flex-1 flex-col justify-center py-10">
        <h1 className="display text-[42px] text-ink sm:text-[56px]">Start investing with what you have.</h1>
        <p className="mb-9 mt-5 max-w-lg text-[17px] leading-relaxed text-ink-2">
          Arvo shows where your money goes, works out what you can afford to set aside, and turns it into a portfolio
          that fits you. It is being built now. Leave your email and you will be among the first to use it.
        </p>
        <WaitlistForm />
        <p className="mt-9 text-[14.5px] text-ink-2">
          Curious already?{" "}
          <Link href="/signup" className="font-medium text-brand-ink underline underline-offset-2">Try the early version</Link>
        </p>
      </main>
    </div>
  );
}
