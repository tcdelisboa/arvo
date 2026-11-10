import type { Fit } from "@/lib/market/suitability";
import { Badge } from "./ui";

const TONE = { "Good fit": "brand", "Reasonable fit": "neutral", "A stretch": "accent", "Poor fit": "neg" } as const;

export function FitBadge({ label }: { label: Fit["label"] }) {
  return <Badge tone={TONE[label]}>{label}</Badge>;
}
