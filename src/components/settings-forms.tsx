"use client";

import { useActionState } from "react";
import { changePassword, deleteAccount, updateName, type SettingsState } from "@/lib/actions/settings";
import { Field, inputClass, Notice } from "./ui";
import { SubmitButton } from "./submit-button";

function Result({ state }: { state: SettingsState }) {
  if (state?.error) return <Notice tone="neg">{state.error}</Notice>;
  if (state?.ok) return <Notice tone="accent">{state.ok}</Notice>;
  return null;
}

export function NameForm({ name, email }: { name: string; email: string }) {
  const [state, action] = useActionState<SettingsState, FormData>(updateName, null);
  return (
    <form action={action} className="space-y-4">
      <Result state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="name">
          <input id="name" name="name" defaultValue={name} autoComplete="name" required className={inputClass} />
        </Field>
        <Field label="Email" htmlFor="email" hint="Your email is how you sign in.">
          <input id="email" value={email} readOnly disabled className={`${inputClass} opacity-70`} />
        </Field>
      </div>
      <SubmitButton variant="secondary" pendingLabel="Saving">Save name</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState<SettingsState, FormData>(changePassword, null);
  return (
    <form action={action} className="space-y-4" key={state?.ok ?? "form"}>
      <Result state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Current password" htmlFor="current">
          <input id="current" name="current" type="password" autoComplete="current-password" required className={inputClass} />
        </Field>
        <Field label="New password" htmlFor="next" hint="At least 10 characters.">
          <input id="next" name="next" type="password" autoComplete="new-password" required className={inputClass} />
        </Field>
      </div>
      <SubmitButton variant="secondary" pendingLabel="Saving">Change password</SubmitButton>
    </form>
  );
}

export function DeleteForm() {
  const [state, action] = useActionState<SettingsState, FormData>(deleteAccount, null);
  return (
    <form action={action} className="space-y-4">
      <Result state={state} />
      <div className="max-w-sm">
        <Field label="Enter your password to confirm" htmlFor="delete-password">
          <input id="delete-password" name="password" type="password" autoComplete="current-password" required className={inputClass} />
        </Field>
      </div>
      <SubmitButton variant="danger" pendingLabel="Deleting">Delete my account and all data</SubmitButton>
    </form>
  );
}
