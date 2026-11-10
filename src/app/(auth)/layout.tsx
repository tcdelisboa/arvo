import Link from "next/link";
import { Logo } from "@/components/logo";
import { Rings } from "@/components/rings";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div className="flex flex-col px-5 py-6 sm:px-10 sm:py-8">
        <Link href="/" aria-label="Arvo home" className="self-start">
          <Logo />
        </Link>
        <main className="settle mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">{children}</main>
        <p className="text-[12.5px] text-ink-3">
          Arvo is an educational tool, not a bank or a broker. It never moves your money.
        </p>
      </div>

      <aside className="relative hidden overflow-hidden bg-brand text-on-brand lg:block" aria-hidden="true">
        <Rings className="absolute -bottom-24 -left-24 h-[130%] w-auto opacity-90" />
        <div className="relative flex h-full flex-col justify-end p-12 xl:p-16">
          <p className="display max-w-md text-[40px] xl:text-[46px]">
            Know where it goes. Decide what it becomes.
          </p>
          <p className="mt-5 max-w-sm text-[15px] opacity-80">
            A clear view of your spending, an investor profile that is actually yours, and a plan you can follow with any broker.
          </p>
        </div>
      </aside>
    </div>
  );
}
