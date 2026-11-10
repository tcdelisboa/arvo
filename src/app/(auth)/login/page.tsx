import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { LoginForm } from "@/components/auth-forms";
import { Notice } from "@/components/ui";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getUser()) redirect("/overview");
  const params = await searchParams;
  return (
    <>
      <h1 className="display text-[38px] text-ink">Welcome back</h1>
      <p className="mb-8 mt-2 text-ink-2">Sign in to see your money and your plan.</p>
      {params.reset ? (
        <div className="mb-4">
          <Notice tone="accent">Your password was changed. Sign in with the new one.</Notice>
        </div>
      ) : null}
      {params.deleted ? (
        <div className="mb-4">
          <Notice tone="accent">Your account and all of its data were deleted.</Notice>
        </div>
      ) : null}
      <LoginForm />
      <p className="mt-6 text-[14px] text-ink-2">
        New to Arvo?{" "}
        <Link href="/signup" className="font-medium text-ink underline underline-offset-2">Create an account</Link>
      </p>
    </>
  );
}
