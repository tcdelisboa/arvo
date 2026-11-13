"use client";

import { useState, useTransition } from "react";
import { setCategory } from "@/lib/actions/data";
import { CATEGORIES, CATEGORY_KEYS } from "@/lib/categories";
import { useI18n } from "./i18n";

/** Change a transaction's category in place. The choice sticks. */
export function CategorySelect({ id, value, label }: { id: string; value: string; label: string }) {
  const [current, setCurrent] = useState(value);
  const [pending, startTransition] = useTransition();
  const { t } = useI18n();
  return (
    <select
      aria-label={t("Category for {name}", { name: label })}
      value={current}
      disabled={pending}
      onChange={(event) => {
        const next = event.target.value;
        setCurrent(next);
        startTransition(() => setCategory(id, next));
      }}
      className="h-8 max-w-[168px] cursor-pointer rounded-lg border border-transparent bg-sunken px-2 text-[13px] text-ink-2 transition-colors hover:border-line-strong focus:border-focus focus:outline-none disabled:opacity-60"
    >
      {CATEGORY_KEYS.map((key) => (
        <option key={key} value={key}>
          {t(CATEGORIES[key].label)}
        </option>
      ))}
    </select>
  );
}
