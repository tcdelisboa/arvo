import { titled } from "@/lib/i18n/server";
import { msg } from "@/lib/i18n/core";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { bankEnabled } from "@/lib/plaid";
import { Logo } from "@/components/logo";
import { WelcomeForm } from "@/components/welcome-form";
import { getI18n } from "@/lib/i18n/server";

export const generateMetadata = titled(msg("Welcome"));

export default async function WelcomePage() {
  const user = await requireUser();
  if (user.onboarded) redirect("/overview");
  const { lang } = await getI18n();
  // New accounts start in euros; a Portuguese-speaking visitor most likely wants reais.
  const currency = lang === "pt" && user.currency === "EUR" ? "BRL" : user.currency;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[640px] flex-col px-5 py-6 sm:py-8">
      <Logo />
      <main className="flex flex-1 flex-col justify-center py-10">
        <WelcomeForm first={user.name.split(" ")[0]} currency={currency} bank={bankEnabled()} />
      </main>
    </div>
  );
}
