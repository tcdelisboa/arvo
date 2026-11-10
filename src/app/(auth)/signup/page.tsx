import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { SignupForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignupPage() {
  if (await getUser()) redirect("/overview");
  return (
    <>
      <h1 className="display text-[38px] text-ink">Create your account</h1>
      <p className="mb-8 mt-2 text-ink-2">Free while Arvo is in early access. It takes about a minute.</p>
      <SignupForm />
      <p className="mt-6 text-[14px] text-ink-2">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-ink underline underline-offset-2">Sign in</Link>
      </p>
    </>
  );
}
