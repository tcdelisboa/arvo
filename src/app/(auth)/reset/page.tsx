import type { Metadata } from "next";
import Link from "next/link";
import { ResetForm } from "@/components/auth-forms";
import { Notice } from "@/components/ui";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPage({ searchParams }: PageProps<"/reset">) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  return (
    <>
      <h1 className="display text-[38px] text-ink">Choose a new password</h1>
      <p className="mb-8 mt-2 text-ink-2">You will be signed out everywhere else.</p>
      {token ? (
        <ResetForm token={token} />
      ) : (
        <Notice tone="neg">
          This link is missing its token. <Link href="/forgot" className="underline">Request a new one.</Link>
        </Notice>
      )}
    </>
  );
}
