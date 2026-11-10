import type { Level } from "../risk";
import type { AssetType, Candle, Metrics } from "./types";
import type { UniverseEntry } from "./universe";

/**
 * How well an asset fits a person's investor profile.
 *
 * This is a suitability check, not a prediction and not a buy or sell call:
 * it compares how much the asset's price moves, how concentrated it is, and a
 * few signs of financial health against the amount of risk the person's
 * profile can carry. Every point added or removed is explained.
 */

export type Fit = {
  score: number; // 0-100
  label: "Good fit" | "Reasonable fit" | "A stretch" | "Poor fit";
  /** Asset risk on the same 1-5 scale as investor profiles. */
  risk: number;
  riskLabel: string;
  summary: string;
  reasons: { tone: "plus" | "minus" | "note"; text: string }[];
  /** Suggested ceiling for this position as a share of the portfolio, in percent. */
  maxWeight: number;
};

export type FitInput = {
  type: AssetType;
  name: string;
  metrics: Metrics;
  /** Annualised volatility in percent, if price history is available. */
  volatility: number | null;
  known?: UniverseEntry;
};

/** Annualised volatility (percent) from a series of closes. */
export function volatilityFrom(candles: Candle[]): number | null {
  if (candles.length < 30) return null;
  const returns: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    if (candles[i - 1].c > 0 && candles[i].c > 0) returns.push(Math.log(candles[i].c / candles[i - 1].c));
  }
  if (returns.length < 20) return null;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (returns.length - 1);
  const spanDays = (candles[candles.length - 1].t - candles[0].t) / 86_400_000;
  const perYear = spanDays > 0 ? (returns.length / spanDays) * 365 : 252;
  return Math.sqrt(variance * perYear) * 100;
}

const RISK_LABELS = ["Very low", "Low", "Moderate", "High", "Very high"];

function riskFromVolatility(vol: number): number {
  if (vol < 3) return 1;
  if (vol < 8) return 1.5;
  if (vol < 13) return 2.5;
  if (vol < 19) return 3;
  if (vol < 26) return 3.5;
  if (vol < 35) return 4;
  if (vol < 50) return 4.5;
  return 5;
}

export function assessFit(input: FitInput, level: Level): Fit {
  const { type, metrics, volatility, known } = input;
  const reasons: Fit["reasons"] = [];
  const isFund = type === "etf";
  const broad = isFund && (known ? known.broad !== false : true);

  // 1. How much does the price move?
  let risk: number;
  if (volatility !== null) {
    risk = riskFromVolatility(volatility);
  } else if (metrics.beta !== null && !isFund) {
    risk = riskFromVolatility(Math.max(8, metrics.beta * 17));
  } else if (known) {
    risk = known.swing;
  } else {
    risk = isFund ? 3 : 4;
  }

  // 2. Signs of a fragile business push the risk up.
  if (!isFund) {
    if (metrics.marketCap !== null && metrics.marketCap < 2e9) {
      risk += 0.5;
      reasons.push({ tone: "minus", text: "It is a small company. Small companies fail more often and their shares are harder to sell in a panic." });
    } else if (metrics.marketCap !== null && metrics.marketCap > 100e9) {
      reasons.push({ tone: "plus", text: "It is one of the largest listed companies in the world, which usually means a more resilient business." });
    }
    if (metrics.profitMargin !== null && metrics.profitMargin < 0) {
      risk += 0.5;
      reasons.push({ tone: "minus", text: "The company is currently losing money, so its share price depends on profits that have not arrived yet." });
    } else if (metrics.profitMargin !== null && metrics.profitMargin >= 15) {
      reasons.push({ tone: "plus", text: `It keeps about ${Math.round(metrics.profitMargin)}% of sales as profit, a sign of a strong business.` });
    }
    if (metrics.debtToEquity !== null && metrics.debtToEquity > 200) {
      risk += 0.25;
      reasons.push({ tone: "minus", text: "It carries a lot of debt relative to its equity, which hurts most when times are hard." });
    }
    if (metrics.trailingPE !== null && metrics.trailingPE > 45) {
      reasons.push({ tone: "minus", text: `Investors pay about ${Math.round(metrics.trailingPE)} times its yearly profit. High expectations leave little room for disappointment.` });
    }
    if (metrics.dividendYield !== null && metrics.dividendYield >= 2.5) {
      reasons.push({ tone: "plus", text: `It pays a dividend of about ${metrics.dividendYield.toFixed(1)}% a year, which softens the wait during flat periods.` });
    }
  }
  risk = Math.min(5, Math.max(1, risk));

  // 3. Compare with what the profile can carry.
  let score = 100;
  const gap = risk - level;
  if (gap > 0) {
    score -= gap * 24;
    reasons.unshift({
      tone: "minus",
      text:
        volatility !== null
          ? `Its price has moved about ${Math.round(volatility)}% a year, more than your profile is built to absorb.`
          : "Its price typically swings more than your profile is built to absorb.",
    });
  } else if (gap < -2) {
    score -= 12;
    reasons.unshift({ tone: "note", text: "It is much steadier than your profile needs. Fine as a stabiliser, but too much of it will slow your growth." });
  } else {
    reasons.unshift({
      tone: "plus",
      text:
        volatility !== null
          ? `Its price has moved about ${Math.round(volatility)}% a year, within what your profile can absorb.`
          : "Its typical price swings are within what your profile can absorb.",
    });
  }

  // 4. Concentration.
  if (broad) {
    score += 5;
    reasons.push({ tone: "plus", text: "It is a diversified fund: one purchase spreads your money across hundreds or thousands of holdings." });
  } else if (isFund) {
    score -= 8;
    reasons.push({ tone: "minus", text: "It is a narrow fund focused on one theme or sector, so it is far less diversified than a global fund." });
  } else {
    const penalty = level <= 2 ? 22 : level === 3 ? 16 : level === 4 ? 12 : 10;
    score -= penalty;
    reasons.push({
      tone: "minus",
      text:
        level <= 2
          ? "It is a single company. One bad result can cut its value sharply, which sits badly with a cautious plan."
          : "It is a single company, so it carries risk that a fund would spread out. Keep it a small part of the whole.",
    });
  }

  score = Math.round(Math.min(100, Math.max(0, score)));
  const label: Fit["label"] = score >= 75 ? "Good fit" : score >= 55 ? "Reasonable fit" : score >= 35 ? "A stretch" : "Poor fit";

  // 5. A ceiling for the position.
  let maxWeight: number;
  if (broad) {
    maxWeight = gap > 0 ? Math.max(10, 60 - Math.round(gap * 20)) : 100;
  } else if (isFund) {
    maxWeight = [0, 3, 5, 8, 10][level - 1];
  } else {
    const base = [0, 2, 4, 6, 8][level - 1];
    maxWeight = gap > 1 ? Math.floor(base / 2) : base;
  }

  const summary =
    label === "Good fit"
      ? broad
        ? "This suits your profile and could be a core holding."
        : "This suits your profile as a small part of a diversified portfolio."
      : label === "Reasonable fit"
        ? "This can work for your profile in a limited amount."
        : label === "A stretch"
          ? "This asks for more risk than your profile is set up to take."
          : "This does not match your profile.";

  return {
    score,
    label,
    risk,
    riskLabel: RISK_LABELS[Math.min(4, Math.max(0, Math.round(risk) - 1))],
    summary,
    reasons: reasons.slice(0, 6),
    maxWeight,
  };
}
