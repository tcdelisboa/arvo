"use client";

import { useActionState, useRef, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { importStatement, type ImportState } from "@/lib/actions/data";
import { Field, inputClass, Notice } from "./ui";
import { SubmitButton } from "./submit-button";

export function ImportForm() {
  const [state, action] = useActionState<ImportState, FormData>(importStatement, null);
  const [fileName, setFileName] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  return (
    <form action={action} className="space-y-4">
      {state?.error ? <Notice tone="neg">{state.error}</Notice> : null}
      {state?.ok ? <Notice tone="accent">{state.ok}</Notice> : null}

      <div>
        <label
          htmlFor="file"
          className="flex cursor-pointer items-center gap-4 rounded-control border border-dashed border-line-strong bg-raised px-4 py-4 transition-colors hover:border-ink-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
            <FileSpreadsheet size={19} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[14.5px] font-medium text-ink">{fileName ?? "Choose a CSV file"}</span>
            <span className="block text-[13px] text-ink-3">Up to 5 MB. Any bank, any language.</span>
          </span>
          <input
            ref={input}
            id="file"
            name="file"
            type="file"
            accept=".csv,.txt,.tsv,text/csv,text/plain"
            required
            className="sr-only"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
        </label>
      </div>

      <Field label="Account name" htmlFor="name" hint="Optional. For example, the name of your bank.">
        <input id="name" name="name" maxLength={60} placeholder="Current account" className={inputClass} />
      </Field>

      <SubmitButton variant="secondary" pendingLabel="Importing">Import statement</SubmitButton>
    </form>
  );
}
