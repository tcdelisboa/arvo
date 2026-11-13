"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { login, requestReset, resetPassword, signup, type AuthState } from "@/lib/actions/auth";
import { Field, inputClass, Notice } from "./ui";
import { SubmitButton } from "./submit-button";
import { useI18n } from "./i18n";

function PasswordInput({ id, autoComplete, invalid }: { id: string; autoComplete: string; invalid?: boolean }) {
  const [shown, setShown] = useState(false);
  const { t } = useI18n();
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
        aria-label={shown ? t("Hide password") : t("Show password")}
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
  const { t } = useI18n();
  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.error ? <Notice tone="neg">{t(state.error)}</Notice> : null}
      <Field label={t("Your name")} htmlFor="name" error={state?.fields?.name && t(state.fields.name)}>
        <input id="name" name="name" autoComplete="name" required defaultValue={state?.values?.name} aria-invalid={!!state?.fields?.name || undefined} className={inputClass} />
      </Field>
      <Field label={t("Email")} htmlFor="email" error={state?.fields?.email && t(state.fields.email)}>
        <input id="email" name="email" type="email" inputMode="email" autoComplete="email" required defaultValue={state?.values?.email} aria-invalid={!!state?.fields?.email || undefined} className={inputClass} />
      </Field>
      <Field label={t("Password")} htmlFor="password" hint={t("At least 10 characters. A short sentence works well.")} error={state?.fields?.password && t(state.fields.password)}>
        <PasswordInput id="password" autoComplete="new-password" invalid={!!state?.fields?.password} />
      </Field>
      <div>
        <label className="flex items-start gap-3 text-[13.5px] text-ink-2">
          <input type="checkbox" name="terms" className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-[var(--brand)]" />
          <span>
            {t("I agree to the")}{" "}
            <Link href="/terms" target="_blank" className="font-medium text-ink underline underline-offset-2">{t("terms")}</Link> {t("and")}{" "}
            <Link href="/privacy" target="_blank" className="font-medium text-ink underline underline-offset-2">{t("privacy notice")}</Link>
            {t(", and I understand that Arvo provides education, not personal investment advice.")}
          </span>
        </label>
        {state?.fields?.terms ? <p role="alert" className="mt-1.5 text-[13px] text-neg">{t(state.fields.terms)}</p> : null}
      </div>
      <SubmitButton className="w-full" pendingLabel={t("Creating your account")}>{t("Create account")}</SubmitButton>
    </form>
  );
}

export function LoginForm() {
  const [state, action] = useActionState<AuthState, FormData>(login, null);
  const { t } = useI18n();
  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.error ? <Notice tone="neg">{t(state.error)}</Notice> : null}
      <Field label={t("Email")} htmlFor="email">
        <input id="email" name="email" type="email" inputMode="email" autoComplete="email" required defaultValue={state?.values?.email} className={inputClass} />
      </Field>
      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <label htmlFor="password" className="text-[13.5px] font-medium text-ink">{t("Password")}</label>
          <Link href="/forgot" className="text-[13px] text-ink-2 underline underline-offset-2 hover:text-ink">{t("Forgot it?")}</Link>
        </div>
        <PasswordInput id="password" autoComplete="current-password" />
      </div>
      <SubmitButton className="w-full" pendingLabel={t("Signing in")}>{t("Sign in")}</SubmitButton>
    </form>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState<AuthState, FormData>(requestReset, null);
  const { t } = useI18n();
  if (state?.sent) {
    return (
      <Notice tone="accent" title={t("Check your inbox.")}>
        {t("If an account exists for {email}, a reset link is on its way. It expires in one hour.", { email: state.values?.email ?? "" })}
      </Notice>
    );
  }
  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.error ? <Notice tone="neg">{t(state.error)}</Notice> : null}
      <Field label={t("Email")} htmlFor="email" error={state?.fields?.email && t(state.fields.email)}>
        <input id="email" name="email" type="email" inputMode="email" autoComplete="email" required defaultValue={state?.values?.email} className={inputClass} />
      </Field>
      <SubmitButton className="w-full" pendingLabel={t("Sending link")}>{t("Send reset link")}</SubmitButton>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState<AuthState, FormData>(resetPassword, null);
  const { t } = useI18n();
  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.error ? <Notice tone="neg">{t(state.error)}</Notice> : null}
      <input type="hidden" name="token" value={token} />
      <Field label={t("New password")} htmlFor="password" hint={t("At least 10 characters.")} error={state?.fields?.password && t(state.fields.password)}>
        <PasswordInput id="password" autoComplete="new-password" invalid={!!state?.fields?.password} />
      </Field>
      <SubmitButton className="w-full" pendingLabel={t("Saving")}>{t("Save new password")}</SubmitButton>
    </form>
  );
}
