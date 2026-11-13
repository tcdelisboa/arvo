import type { Fit } from "@/lib/market/suitability";
import { Badge } from "./ui";
import type { T } from "@/lib/i18n/core";

const TONE = { "Good fit": "brand", "Reasonable fit": "neutral", "A stretch": "accent", "Poor fit": "neg" } as const;

export function FitBadge({ label, t }: { label: Fit["label"]; t: T }) {
  return <Badge tone={TONE[label]}>{t(label)}</Badge>;
}
