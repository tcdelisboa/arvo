import { Lightbulb } from "lucide-react";
import { aiEnabled, aiInsights, type AiInput } from "@/lib/ai";
import { totalPotentialSaving, type Insight } from "@/lib/insights";
import { Badge, Panel, PanelHeader } from "./ui";

function List({ insights, fmt }: { insights: Insight[]; fmt: (cents: number) => string }) {
  return (
    <ol className="divide-y divide-line">
      {insights.map((insight) => (
        <li key={insight.id} className="py-4 first:pt-1 last:pb-0">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="text-[15px] font-semibold text-ink">{insight.title}</h3>
            {insight.saveCents > 0 ? <Badge tone="brand">Save about {fmt(insight.saveCents)} a month</Badge> : null}
          </div>
          <p className="mt-1.5 max-w-[68ch] text-[14px] leading-relaxed text-ink-2">{insight.body}</p>
        </li>
      ))}
    </ol>
  );
}

function Frame({
  insights,
  fmt,
  written,
}: {
  insights: Insight[];
  fmt: (cents: number) => string;
  written: "ai" | "calculated";
}) {
  const saving = totalPotentialSaving(insights);
  return (
    <Panel id="save" className="scroll-mt-20">
      <PanelHeader
        title="Ways to save"
        note={
          written === "ai"
            ? "Written by Arvo's AI from your category totals. Your individual transactions are never sent."
            : "Calculated from your transactions."
        }
        action={saving > 0 ? <span className="figure text-[22px] text-ink">up to {fmt(saving)}<span className="font-sans text-[13px] font-normal text-ink-3"> a month</span></span> : null}
      />
      <div className="px-5 pb-5 pt-3 sm:px-6 sm:pb-6">
        {insights.length ? (
          <List insights={insights} fmt={fmt} />
        ) : (
          <p className="flex items-center gap-2 text-[14.5px] text-ink-2">
            <Lightbulb size={17} /> Savings ideas appear once Arvo has a full month of transactions.
          </p>
        )}
      </div>
    </Panel>
  );
}

/** Streams in: the AI version when a key is configured, the calculated version otherwise. */
export async function InsightsPanel({ input, fmt }: { input: AiInput; fmt: (cents: number) => string }) {
  const written = aiEnabled() && input.calculated.length ? await aiInsights(input) : null;
  return <Frame insights={written ?? input.calculated} fmt={fmt} written={written ? "ai" : "calculated"} />;
}

export function InsightsFallback({ insights, fmt }: { insights: Insight[]; fmt: (cents: number) => string }) {
  return <Frame insights={insights} fmt={fmt} written="calculated" />;
}
