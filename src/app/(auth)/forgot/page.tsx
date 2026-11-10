import type { Metadata } from "next";
import Link from "next/link";
import { ForgotForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPage() {
  return (
    <>
      <h1 className="display text-[38px] text-ink">Reset your password</h1>
      <p className="mb-8 mt-2 text-ink-2">Enter the email you signed up with and we will send you a link.</p>
      <ForgotForm />
      <p className="mt-6 text-[14px] text-ink-2">
        <Link href="/login" className="font-medium text-ink underline underline-offset-2">Back to sign in</Link>
      </p>
    </>
  );
}
