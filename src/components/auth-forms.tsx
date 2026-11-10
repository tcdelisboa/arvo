"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { login, requestReset, resetPassword, signup, type AuthState } from "@/lib/actions/auth";
import { Field, inputClass, Notice } from "./ui";
import { SubmitButton } from "./submit-button";

function PasswordInput({ id, autoComplete, invalid }: { id: string; autoComplete: string; invalid?: boolean }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        name="password"
        type={shown ? "text" : "password"}
        autoComplete={autoComplete}
        required
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        className={`${inputClass} pr-12`}
      />
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        aria-label={shown ? "Hide password" : "Show password"}
        aria-pressed={shown}
        className="absolute right-1 top-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-3 hover:text-ink"
      >
        {shown ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

export function SignupForm() {
  const [state, action] = useActionState<AuthState, FormData>(signup, null);
  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.error ? <Notice tone="neg">{state.error}</Notice> : null}
      <Field label="Your name" htmlFor="name" error={state?.fields?.name}>
        <input id="name" name="name" autoComplete="name" required defaultValue={state?.values?.name} aria-invalid={!!state?.fields?.name || undefined} className={inputClass} />
      </Field>
      <Field label="Email" htmlFor="email" error={state?.fields?.email}>
        <input id="email" name="email" type="email" inputMode="email" autoComplete="email" required defaultValue={state?.values?.email} aria-invalid={!!state?.fields?.email || undefined} className={inputClass} />
      </Field>
      <Field label="Password" htmlFor="password" hint="At least 10 characters. A short sentence works well." error={state?.fields?.password}>
        <PasswordInput id="password" autoComplete="new-password" invalid={!!state?.fields?.password} />
      </Field>
      <div>
        <label className="flex items-start gap-3 text-[13.5px] text-ink-2">
          <input type="checkbox" name="terms" className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-[var(--brand)]" />
          <span>
            I agree to the{" "}
            <Link href="/terms" target="_blank" className="font-medium text-ink underline underline-offset-2">terms</Link> and{" "}
            <Link href="/privacy" target="_blank" className="font-medium text-ink underline underline-offset-2">privacy notice</Link>, and I understand
            that Arvo provides education, not personal investment advice.
          </span>
        </label>
        {state?.fields?.terms ? <p role="alert" className="mt-1.5 text-[13px] text-neg">{state.fields.terms}</p> : null}
      </div>
      <SubmitButton className="w-full" pendingLabel="Creating your account">Create account</SubmitButton>
    </form>
  );
}

export function LoginForm() {
  const [state, action] = useActionState<AuthState, FormData>(login, null);
  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.error ? <Notice tone="neg">{state.error}</Notice> : null}
      <Field label="Email" htmlFor="email">
        <input id="email" name="email" type="email" inputMode="email" autoComplete="email" required defaultValue={state?.values?.email} className={inputClass} />
      </Field>
      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <label htmlFor="password" className="text-[13.5px] font-medium text-ink">Password</label>
          <Link href="/forgot" className="text-[13px] text-ink-2 underline underline-offset-2 hover:text-ink">Forgot it?</Link>
        </div>
        <PasswordInput id="password" autoComplete="current-password" />
      </div>
      <SubmitButton className="w-full" pendingLabel="Signing in">Sign in</SubmitButton>
    </form>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState<AuthState, FormData>(requestReset, null);
  if (state?.sent) {
    return (
      <Notice tone="accent" title="Check your inbox.">
        If an account exists for {state.values?.email}, a reset link is on its way. It expires in one hour.
      </Notice>
    );
  }
  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.error ? <Notice tone="neg">{state.error}</Notice> : null}
      <Field label="Email" htmlFor="email" error={state?.fields?.email}>
        <input id="email" name="email" type="email" inputMode="email" autoComplete="email" required defaultValue={state?.values?.email} className={inputClass} />
      </Field>
      <SubmitButton className="w-full" pendingLabel="Sending link">Send reset link</SubmitButton>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState<AuthState, FormData>(resetPassword, null);
  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.error ? <Notice tone="neg">{state.error}</Notice> : null}
      <input type="hidden" name="token" value={token} />
      <Field label="New password" htmlFor="password" hint="At least 10 characters." error={state?.fields?.password}>
        <PasswordInput id="password" autoComplete="new-password" invalid={!!state?.fields?.password} />
      </Field>
      <SubmitButton className="w-full" pendingLabel="Saving">Save new password</SubmitButton>
    </form>
  );
}
