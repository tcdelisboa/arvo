import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { bankEnabled } from "@/lib/plaid";
import { Logo } from "@/components/logo";
import { WelcomeForm } from "@/components/welcome-form";

export const metadata: Metadata = { title: "Welcome" };

export default async function WelcomePage() {
  const user = await requireUser();
  if (user.onboarded) redirect("/overview");

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[640px] flex-col px-5 py-6 sm:py-8">
      <Logo />
      <main className="flex flex-1 flex-col justify-center py-10">
        <WelcomeForm first={user.name.split(" ")[0]} currency={user.currency} bank={bankEnabled()} />
      </main>
    </div>
  );
}
