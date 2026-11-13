import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { pt } from "@/lib/i18n/pt";
import { fmtFor } from "@/lib/format";
import { langFromHeader, makeT } from "@/lib/i18n/core";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return name === "i18n" ? [] : files(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

/** Every literal passed to t("…") or msg("…") anywhere in the app. */
function keys(): Map<string, string> {
  const found = new Map<string, string>();
  const pattern = /\b(?:t|tr|msg)\(\s*("(?:[^"\\]|\\.)*")/g;
  for (const file of files(path.resolve(__dirname, "../src"))) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(pattern)) found.set(JSON.parse(match[1]) as string, file);
  }
  return found;
}

describe("Portuguese", () => {
  it("has a translation for every marked string", () => {
    const missing = [...keys()].filter(([key]) => !(key in pt)).map(([key, file]) => `${path.basename(file)}: ${key}`);
    expect(missing).toEqual([]);
  });

  it("keeps every {placeholder}", () => {
    const broken = Object.entries(pt).filter(([en, translated]) => {
      const names = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
      return names(en) !== names(translated);
    });
    expect(broken).toEqual([]);
  });

  it("translates and fills", () => {
    const t = makeT("pt");
    expect(t("{n} years", { n: 3 })).toBe("3 anos");
    expect(makeT("en")("{n} years", { n: 3 })).toBe("3 years");
    expect(t("A sentence nobody wrote")).toBe("A sentence nobody wrote");
  });

  it("formats numbers and dates the Brazilian way", () => {
    const f = fmtFor("pt");
    expect(f.money(123456, "BRL").replace(/\s/g, " ")).toBe("R$ 1.234,56");
    expect(f.percent(12.5)).toBe("12,5%");
    expect(f.day("2026-11-03")).toBe("3 nov 2026");
    expect(f.month("2026-11", "long")).toBe("novembro de 2026");
  });

  it("picks the browser's language", () => {
    expect(langFromHeader("pt-BR,pt;q=0.9,en;q=0.8")).toBe("pt");
    expect(langFromHeader("en-US,en;q=0.9,pt;q=0.5")).toBe("en");
    expect(langFromHeader(null)).toBe("en");
  });
});

describe("Portuguese markets list", () => {
  it("covers every sector, region and description", async () => {
    const { UNIVERSE } = await import("@/lib/market/universe");
    const texts = new Set(UNIVERSE.flatMap((u) => [u.sector, u.region, u.blurb, u.group]));
    expect([...texts].filter((text) => !(text in pt))).toEqual([]);
  });
});
