"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Check } from "lucide-react";
import { joinWaitlist, type WaitlistState } from "@/lib/actions/waitlist";
import { GOALS } from "@/lib/goals";
import { cx, inputClass } from "./ui";
import { SubmitButton } from "./submit-button";

/** Email capture for the public pages. `onBrand` is for the dark green closing panel. */
export function WaitlistForm({ id = "waitlist-email", onBrand = false }: { id?: string; onBrand?: boolean }) {
  const [state, action] = useActionState<WaitlistState, FormData>(joinWaitlist, null);
  const quiet = onBrand ? "text-on-brand opacity-80" : "text-ink-3";

  if (state?.email !== undefined && !state.error) {
    return (
      <div role="status" className={cx("rounded-panel border p-5", onBrand ? "border-on-brand/30" : "border-line bg-surface")}>
        <p className={cx("flex items-center gap-2 text-[16px] font-semibold", onBrand ? "text-on-brand" : "text-ink")}>
          <span className={cx("flex h-6 w-6 items-center justify-center rounded-full", onBrand ? "bg-on-brand text-brand" : "bg-brand text-on-brand")}>
            <Check size={14} strokeWidth={3} />
          </span>
          You are on the list.
        </p>
        {state.done ? (
          <p className={cx("mt-2 text-[14.5px]", quiet)}>Thank you. We will email you when Arvo opens.</p>
        ) : (
          <form action={action} className="mt-3">
            <input type="hidden" name="known" value={state.email} />
            <p className={cx("text-[14.5px]", quiet)}>One question, if you have a second: what would you want Arvo for?</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {GOALS.map((goal) => (
                <button
                  key={goal.id}
                  type="submit"
                  name="goal"
                  value={goal.id}
                  className={cx(
                    "h-10 rounded-full border px-4 text-[14px] font-medium transition-colors",
                    onBrand
                      ? "border-on-brand/40 text-on-brand hover:bg-on-brand hover:text-brand"
                      : "border-line-strong bg-raised text-ink hover:border-brand hover:bg-brand-soft",
                  )}
                >
                  {goal.short}
                </button>
              ))}
            </div>
          </form>
        )}
      </div>
    );
  }

  return (
    <form action={action} noValidate>
      <label htmlFor={id} className={cx("mb-2 block text-[14px] font-medium", onBrand ? "text-on-brand" : "text-ink")}>
        Get an email when Arvo opens
      </label>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <input
          id={id}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={state?.error ? true : undefined}
          aria-describedby={state?.error ? `${id}-error` : undefined}
          className={cx(inputClass, "h-[52px] sm:max-w-[320px]")}
        />
        {/* Hidden from people; scripts that fill every field give themselves away. */}
        <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
        <SubmitButton size="lg" variant={onBrand ? "secondary" : "primary"} pendingLabel="Adding you">
          Join the waitlist
        </SubmitButton>
      </div>
      {state?.error ? (
        <p id={`${id}-error`} role="alert" className={cx("mt-2 text-[13.5px] font-medium", onBrand ? "text-on-brand" : "text-neg")}>
          {state.error}
        </p>
      ) : null}
      <p className={cx("mt-3 text-[13px]", quiet)}>
        Only news about Arvo&apos;s launch. Ask to be removed whenever you like.{" "}
        <Link href="/privacy" className="underline underline-offset-2">Privacy</Link>
      </p>
    </form>
  );
}
