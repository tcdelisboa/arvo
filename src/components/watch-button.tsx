"use client";

import { useOptimistic, useTransition } from "react";
import { Star } from "lucide-react";
import { toggleWatch } from "@/lib/actions/data";
import { buttonClass } from "./ui";
import { useI18n } from "./i18n";

export function WatchButton({ symbol, watching }: { symbol: string; watching: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(watching);
  const [, startTransition] = useTransition();
  const { t } = useI18n();
  return (
    <button
      type="button"
      aria-pressed={optimistic}
      onClick={() =>
        startTransition(async () => {
          setOptimistic(!optimistic);
          await toggleWatch(symbol);
        })
      }
      className={buttonClass("secondary", "md")}
    >
      <Star size={17} fill={optimistic ? "var(--accent)" : "none"} stroke={optimistic ? "var(--accent)" : "currentColor"} />
      {optimistic ? t("Watching") : t("Watch")}
    </button>
  );
}
