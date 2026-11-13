"use client";

import { useActionState, useRef, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { importStatement, type ImportState } from "@/lib/actions/data";
import { cx, Field, fieldClass, inputClass, Notice } from "./ui";
import { SubmitButton } from "./submit-button";
import { useI18n } from "./i18n";

const ACCEPT = ".csv,.txt,.tsv,.pdf,.ofx,.qfx,.xlsx,text/csv,text/plain,application/pdf,application/x-ofx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Upload statements: pick or drop several files, into a new account or one imported before. */
export function ImportForm({ accounts = [] }: { accounts?: { id: string; name: string }[] }) {
  const [state, action] = useActionState<ImportState, FormData>(importStatement, null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [target, setTarget] = useState(accounts[0]?.id ?? "");
  const input = useRef<HTMLInputElement>(null);
  const { t } = useI18n();

  const describe = (chosen: FileList | null | undefined) =>
    setFileName(!chosen?.length ? null : chosen.length === 1 ? chosen[0].name : t("{n} files chosen", { n: chosen.length }));

  return (
    <form action={action} className="space-y-4">
      {state?.error ? <Notice tone="neg">{state.error}</Notice> : null}
      {state?.ok ? <Notice tone="accent">{state.ok}</Notice> : null}

      <div>
        <label
          htmlFor="file"
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (input.current && e.dataTransfer.files.length) {
              input.current.files = e.dataTransfer.files;
              describe(e.dataTransfer.files);
            }
          }}
          className={cx(
            "flex cursor-pointer items-center gap-4 rounded-control border border-dashed bg-raised px-4 py-5 transition-colors hover:border-ink-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus",
            dragging ? "border-brand bg-brand-soft" : "border-line-strong",
          )}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
            <FileSpreadsheet size={19} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[14.5px] font-medium text-ink">{fileName ?? t("Choose or drop your statements")}</span>
            <span className="block text-[13px] text-ink-3">{t("CSV, OFX, Excel or PDF. Up to 24 files at once, 5 MB each.")}</span>
          </span>
          <input
            ref={input}
            id="file"
            name="file"
            type="file"
            accept={ACCEPT}
            multiple
            required
            className="sr-only"
            onChange={(e) => describe(e.target.files)}
          />
        </label>
      </div>

      {accounts.length ? (
        <div>
          <label htmlFor="account" className="mb-1.5 block text-[13.5px] font-medium text-ink">{t("Add to")}</label>
          <select id="account" name="account" value={target} onChange={(e) => setTarget(e.target.value)} className={cx(fieldClass, "block h-11 w-full px-3 text-base sm:text-[15px]")}>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>{account.name}</option>
            ))}
            <option value="">{t("A new account")}</option>
          </select>
          <p className="mt-1.5 text-[13px] text-ink-3">{t("Transactions already in Arvo are skipped, so overlapping periods are fine.")}</p>
        </div>
      ) : null}

      {!target ? (
        <Field label={t("Account name")} htmlFor="name" hint={t("Optional. For example, the name of your bank.")}>
          <input id="name" name="name" maxLength={60} placeholder={t("Current account")} className={inputClass} />
        </Field>
      ) : null}

      <SubmitButton variant="secondary" pendingLabel={t("Importing")}>{t("Import statement")}</SubmitButton>
    </form>
  );
}
