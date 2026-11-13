import { Lightbulb } from "lucide-react";
import { aiEnabled, aiInsights, type AiInput } from "@/lib/ai";
import { totalPotentialSaving, type Insight } from "@/lib/insights";
import { Badge, ButtonLink, Panel, PanelHeader } from "./ui";
import { getI18n } from "@/lib/i18n/server";
import type { T } from "@/lib/i18n/core";

function List({ insights, fmt, t }: { insights: Insight[]; fmt: (cents: number) => string; t: T }) {
  return (
    <ol className="divide-y divide-line">
      {insights.map((insight) => (
        <li key={insight.id} className="py-4 first:pt-1 last:pb-0">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="text-[15px] font-semibold text-ink">{insight.title}</h3>
            {insight.saveCents > 0 ? <Badge tone="brand">{t("Save about {amount} a month", { amount: fmt(insight.saveCents) })}</Badge> : null}
          </div>
          <p className="mt-1.5 max-w-[68ch] text-[14px] leading-relaxed text-ink-2">{insight.body}</p>
        </li>
      ))}
    </ol>
  );
}

async function Frame({
  insights,
  fmt,
  written,
  plus,
}: {
  insights: Insight[];
  fmt: (cents: number) => string;
  written: "ai" | "calculated";
  plus: boolean;
}) {
  const { t } = await getI18n();
  const saving = totalPotentialSaving(insights);
  // Free shows the overall picture; the specific ways to save are part of Plus.
  const shown = plus ? insights : insights.filter((insight) => insight.saveCents === 0);
  const locked = insights.length - shown.length;
  return (
    <Panel id="save" className="scroll-mt-20">
      <PanelHeader
        title={t("Ways to save")}
        note={
          written === "ai"
            ? t("Written by Arvo's AI from your category totals. Your individual transactions are never sent.")
            : t("Calculated from your transactions.")
        }
        action={saving > 0 ? <span className="figure text-[22px] text-ink">{t("up to {amount}", { amount: fmt(saving) })}<span className="font-sans text-[13px] font-normal text-ink-3"> {t("a month")}</span></span> : null}
      />
      <div className="px-5 pb-5 pt-3 sm:px-6 sm:pb-6">
        {insights.length ? (
          <>
            <List insights={shown} fmt={fmt} t={t} />
            {locked > 0 ? (
              <div className="mt-4 rounded-control bg-brand-soft p-4 sm:p-5">
                <p className="text-[15px] font-semibold text-brand-ink">
                  {locked === 1
                    ? t("1 way to save, worth up to {amount} a month", { amount: fmt(saving) })
                    : t("{n} ways to save, worth up to {amount} a month", { n: locked, amount: fmt(saving) })}
                </p>
                <p className="mt-1 max-w-[60ch] text-[14px] leading-relaxed text-brand-ink">
                  {locked === 1
                    ? t("Arvo found a specific saving in your transactions. The details, with the amount each is worth, are part of Plus.")
                    : t("Arvo found specific savings in your transactions. The details, with the amount each is worth, are part of Plus.")}
                </p>
                <div className="mt-3.5">
                  <ButtonLink href="/plus" size="sm">{t("See what Plus includes")}</ButtonLink>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <p className="flex items-center gap-2 text-[14.5px] text-ink-2">
            <Lightbulb size={17} /> {t("Savings ideas appear once Arvo has a full month of transactions.")}
          </p>
        )}
      </div>
    </Panel>
  );
}

/** Streams in: the AI version when a key is configured, the calculated version otherwise. */
export async function InsightsPanel({ input, fmt, plus }: { input: AiInput; fmt: (cents: number) => string; plus: boolean }) {
  const written = plus && aiEnabled() && input.calculated.length ? await aiInsights(input) : null;
  return <Frame insights={written ?? input.calculated} fmt={fmt} written={written ? "ai" : "calculated"} plus={plus} />;
}

export function InsightsFallback({ insights, fmt, plus }: { insights: Insight[]; fmt: (cents: number) => string; plus: boolean }) {
  return <Frame insights={insights} fmt={fmt} written="calculated" plus={plus} />;
}
