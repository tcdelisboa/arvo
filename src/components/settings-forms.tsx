"use client";

import { useActionState } from "react";
import { changePassword, deleteAccount, updateName, type SettingsState } from "@/lib/actions/settings";
import { Field, inputClass, Notice } from "./ui";
import { SubmitButton } from "./submit-button";
import { useI18n } from "./i18n";

function Result({ state }: { state: SettingsState }) {
  const { t } = useI18n();
  if (state?.error) return <Notice tone="neg">{t(state.error)}</Notice>;
  if (state?.ok) return <Notice tone="accent">{t(state.ok)}</Notice>;
  return null;
}

export function NameForm({ name, email }: { name: string; email: string }) {
  const [state, action] = useActionState<SettingsState, FormData>(updateName, null);
  const { t } = useI18n();
  return (
    <form action={action} className="space-y-4">
      <Result state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("Name")} htmlFor="name">
          <input id="name" name="name" defaultValue={name} autoComplete="name" required className={inputClass} />
        </Field>
        <Field label={t("Email")} htmlFor="email" hint={t("Your email is how you sign in.")}>
          <input id="email" value={email} readOnly disabled className={`${inputClass} opacity-70`} />
        </Field>
      </div>
      <SubmitButton variant="secondary" pendingLabel={t("Saving")}>{t("Save name")}</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState<SettingsState, FormData>(changePassword, null);
  const { t } = useI18n();
  return (
    <form action={action} className="space-y-4" key={state?.ok ?? "form"}>
      <Result state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("Current password")} htmlFor="current">
          <input id="current" name="current" type="password" autoComplete="current-password" required className={inputClass} />
        </Field>
        <Field label={t("New password")} htmlFor="next" hint={t("At least 10 characters.")}>
          <input id="next" name="next" type="password" autoComplete="new-password" required className={inputClass} />
        </Field>
      </div>
      <SubmitButton variant="secondary" pendingLabel={t("Saving")}>{t("Change password")}</SubmitButton>
    </form>
  );
}

export function DeleteForm() {
  const [state, action] = useActionState<SettingsState, FormData>(deleteAccount, null);
  const { t } = useI18n();
  return (
    <form action={action} className="space-y-4">
      <Result state={state} />
      <div className="max-w-sm">
        <Field label={t("Enter your password to confirm")} htmlFor="delete-password">
          <input id="delete-password" name="password" type="password" autoComplete="current-password" required className={inputClass} />
        </Field>
      </div>
      <SubmitButton variant="danger" pendingLabel={t("Deleting")}>{t("Delete my account and all data")}</SubmitButton>
    </form>
  );
}
