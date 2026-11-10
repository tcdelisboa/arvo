import "server-only";
import { z } from "zod";
import { cacheGet, cacheSet } from "./db";
import { sha256 } from "./crypto";
import { categoryLabel } from "./categories";
import type { Insight } from "./insights";
import type { CategoryTotal, MonthSummary, Recurring } from "./spending";

/**
 * The AI layer. Optional by design: when ANTHROPIC_API_KEY is set, Claude
 * turns the person's totals into written, personal guidance; when it is not
 * (or the call fails), the app shows the calculated insights instead.
 *
 * Only aggregates leave the server: category totals, recurring merchants and
 * monthly sums. Raw transactions, names, emails and account details are never
 * sent.
 */

const MODEL = process.env.ARVO_AI_MODEL ?? "claude-haiku-5-5";

export function aiEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

const InsightSchema = z.object({
  insights: z
    .array(
      z.object({
        title: z.string().min(8).max(90),
        body: z.string().min(40).max(520),
        saveCents: z.number().int().min(0).max(5_000_000),
        category: z.string().max(40).optional(),
      }),
    )
    .min(2)
    .max(7),
});

export type AiInput = {
  userId: string;
  currency: string;
  months: MonthSummary[];
  averageIncome: number;
  averageSpending: number;
  categories: CategoryTotal[];
  recurring: Recurring[];
  calculated: Insight[];
};

async function ask(system: string, prompt: string, maxTokens: number): Promise<string | null> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 25_000, maxRetries: 1 });
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: prompt }],
  });
  const text = message.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();
  return text || null;
}

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("No JSON in response");
  return JSON.parse(text.slice(start, end + 1));
}

/** Personal savings guidance written from the person's totals. Null when unavailable. */
export async function aiInsights(input: AiInput): Promise<Insight[] | null> {
  if (!aiEnabled()) return null;

  const facts = {
    currency: input.currency,
    amountsAre: "integer cents",
    averageMonthlyIncome: input.averageIncome,
    averageMonthlySpending: input.averageSpending,
    months: input.months.slice(-6),
    spendingByCategoryPerPeriod: input.categories.map((c) => ({
      category: c.category,
      label: categoryLabel(c.category),
      cents: c.cents,
      share: Math.round(c.share * 100),
      purchases: c.count,
    })),
    recurringCharges: input.recurring.slice(0, 15),
    alreadyCalculated: input.calculated.map((i) => ({ title: i.title, saveCents: i.saveCents })),
  };
  const key = `ai-insights:${input.userId}:${sha256(JSON.stringify(facts)).slice(0, 24)}`;

  try {
    const cached = await cacheGet<Insight[]>(key);
    if (cached) return cached;

    const system =
      "You are Arvo, a calm and plain-spoken money coach inside a budgeting and beginner investing app. " +
      "You are given a person's aggregated spending. Find where most of the money goes and the most realistic ways to free up money to invest. " +
      "Rules: use only the numbers provided, never invent merchants or amounts; be specific and kind, never judgemental; " +
      "write for someone with no finance background; sentence case; no emojis; no exclamation marks; amounts written with the currency symbol and no decimals; " +
      "do not recommend specific financial products, loans or investments. " +
      "Reply with JSON only, in this exact shape: " +
      '{"insights":[{"title":string,"body":string,"saveCents":integer,"category":string}]}. ' +
      "Give 4 to 6 insights, most valuable first. title is under 80 characters and states the finding. " +
      "body is 2 to 3 sentences with the evidence and one concrete action. saveCents is your realistic estimate of the monthly saving in cents (0 if informational). " +
      "category is one of the category keys provided, or omitted.";

    const text = await ask(system, JSON.stringify(facts), 1500);
    if (!text) return null;
    const parsed = InsightSchema.parse(extractJson(text));
    const insights: Insight[] = parsed.insights.map((item, index) => ({
      id: `ai-${index}`,
      title: item.title,
      body: item.body,
      saveCents: item.saveCents,
      category: item.category,
    }));
    await cacheSet(key, insights, 24 * 3600);
    return insights;
  } catch (error) {
    console.warn("[ai] insights unavailable:", error instanceof Error ? error.message : error);
    return null;
  }
}

/** A short plain-language note on how an asset relates to a profile. Null when unavailable. */
export async function aiFitNote(input: {
  symbol: string;
  name: string;
  type: string;
  profile: string;
  fitLabel: string;
  reasons: string[];
  description: string | null;
}): Promise<string | null> {
  if (!aiEnabled()) return null;
  const key = `ai-fit:${input.symbol}:${input.profile}:${sha256(input.reasons.join("|")).slice(0, 16)}`;
  try {
    const cached = await cacheGet<{ text: string }>(key);
    if (cached) return cached.text;
    const system =
      "You are Arvo, a plain-spoken guide inside a beginner investing app. In 3 sentences at most, explain to a beginner what this asset is " +
      "and how it relates to their investor profile, using only the facts given. This is education, not advice: " +
      "never say buy, sell, hold or recommend; never predict prices. Sentence case, no emojis, no exclamation marks, no markdown.";
    const text = await ask(system, JSON.stringify(input), 300);
    if (!text) return null;
    const clean = text.replace(/\s+/g, " ").slice(0, 700);
    await cacheSet(key, { text: clean }, 7 * 24 * 3600);
    return clean;
  } catch (error) {
    console.warn("[ai] fit note unavailable:", error instanceof Error ? error.message : error);
    return null;
  }
}
