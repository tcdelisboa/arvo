"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { usePlaidLink, type PlaidLinkOnSuccess } from "react-plaid-link";
import { connectBank, getLinkToken } from "@/lib/actions/bank";
import { Button, Notice } from "./ui";

const STORAGE_KEY = "arvo-link-token";

/**
 * Opens Plaid Link, the bank's own consent screen. Arvo never sees or stores
 * banking passwords; it receives a read-only token for transactions.
 *
 * `resume` is used on the page banks redirect back to after their own login.
 */
const noop = () => () => {};

function readStoredToken(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function BankConnect({ resume = false }: { resume?: boolean }) {
  const router = useRouter();
  // On the return page the token comes from this tab's session storage.
  const stored = useSyncExternalStore(noop, readStoredToken, () => null);
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const [started, setStarted] = useState<string | null>(null);
  const token = resume ? stored : started;
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const error = failure ?? (resume && mounted && !stored && !done ? "We lost track of this connection. Start again from Accounts." : null);

  const onSuccess = useCallback<PlaidLinkOnSuccess>(
    async (publicToken, metadata) => {
      if (!publicToken) return;
      setBusy(true);
      const result = await connectBank(publicToken, metadata.institution?.name ?? null);
      setBusy(false);
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {}
      if (result.error) {
        setFailure(result.error);
        return;
      }
      setDone(`Connected. ${result.count ?? 0} transactions imported.`);
      router.replace("/accounts");
      router.refresh();
    },
    [router],
  );

  const { open, ready } = usePlaidLink({
    token,
    onSuccess,
    onExit: () => setBusy(false),
    receivedRedirectUri: resume && typeof window !== "undefined" ? window.location.href : undefined,
  });

  // Open as soon as a token is available: straight after the click, or on return from the bank.
  useEffect(() => {
    if (token && ready) open();
  }, [token, ready, open]);

  const start = async () => {
    setFailure(null);
    setBusy(true);
    const result = await getLinkToken();
    if (!result.token) {
      setBusy(false);
      setFailure(result.error ?? "We couldn't start the connection. Try again.");
      return;
    }
    try {
      sessionStorage.setItem(STORAGE_KEY, result.token);
    } catch {}
    setStarted(result.token);
  };

  return (
    <div className="space-y-3">
      {error ? <Notice tone="neg">{error}</Notice> : null}
      {done ? <Notice tone="accent">{done}</Notice> : null}
      {resume ? (
        <p className="text-[14px] text-ink-2">{busy ? "Importing your transactions." : "Finishing the connection with your bank."}</p>
      ) : (
        <Button type="button" onClick={start} disabled={busy} aria-busy={busy}>
          {busy ? "Opening your bank" : "Connect a bank"}
        </Button>
      )}
    </div>
  );
}
