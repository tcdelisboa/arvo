import Papa from "papaparse";
import { parseAmountToCents } from "./format";

/**
 * Bank statement (CSV) parser.
 *
 * Banks disagree on everything: delimiter, column names, language, date
 * order, decimal mark, and whether money out is negative or in its own column.
 * This reads the common shapes without asking the person to map columns.
 */

export type ParsedRow = { date: string; description: string; amountCents: number };

export type ParsedStatement = {
  rows: ParsedRow[];
  skipped: number;
  error?: string;
};

const MAX_ROWS = 20_000;

const norm = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

type Role = "date" | "description" | "amount" | "debit" | "credit";

// Each role lists header names from best to worst match.
const HEADERS: Record<Role, string[]> = {
  date: [
    "date", "transaction date", "booking date", "started date", "completed date", "posting date",
    "data", "data mov", "data movimento", "data operacao", "data da operacao", "datum", "buchungstag",
    "fecha", "date operation", "kuupaev", "value date", "data valor", "valuta",
  ],
  description: [
    "description", "descricao", "details", "transaction details", "narrative", "memo", "payee",
    "merchant", "partner name", "counterparty", "name", "reference", "payment reference", "concepto",
    "verwendungszweck", "buchungstext", "libelle", "selgitus", "text", "descritivo", "movimento",
  ],
  amount: ["amount", "montante", "valor", "importe", "betrag", "montant", "summa", "value", "quantia"],
  debit: ["debit", "debito", "paid out", "money out", "withdrawals", "withdrawal", "saida", "ausgabe", "debit amount"],
  credit: ["credit", "credito", "paid in", "money in", "deposits", "deposit", "entrada", "einnahme", "credit amount"],
};

function matchRole(header: string): { role: Role; rank: number } | null {
  const h = norm(header);
  if (!h) return null;
  let best: { role: Role; rank: number } | null = null;
  for (const role of Object.keys(HEADERS) as Role[]) {
    HEADERS[role].forEach((name, index) => {
      const exact = h === name;
      const loose = h.startsWith(name + " ") || h.endsWith(" " + name);
      if (!exact && !loose) return;
      const rank = index + (exact ? 0 : 100);
      if (!best || rank < best.rank) best = { role, rank };
    });
  }
  return best;
}

const MONTH_NAMES: Record<string, number> = {
  jan: 1, feb: 2, fev: 2, mar: 3, apr: 4, abr: 4, may: 5, mai: 5, jun: 6, jul: 7,
  aug: 8, ago: 8, sep: 9, set: 9, oct: 10, out: 10, okt: 10, nov: 11, dec: 12, dez: 12,
};

type DateOrder = "dmy" | "mdy";

function toIso(y: number, m: number, d: number): string | null {
  if (y < 100) y += 2000;
  if (y < 1990 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function parseDate(raw: string, order: DateOrder = "dmy"): string | null {
  const text = raw.trim();
  if (!text) return null;

  let match = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (match) return toIso(+match[1], +match[2], +match[3]);

  match = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (match) {
    const [a, b, y] = [+match[1], +match[2], +match[3]];
    return order === "dmy" ? toIso(y, b, a) : toIso(y, a, b);
  }

  match = text.match(/^(\d{1,2})[ -]([A-Za-z]{3,})\.?[ -,]+(\d{2,4})/);
  if (match) {
    const m = MONTH_NAMES[match[2].slice(0, 3).toLowerCase()];
    return m ? toIso(+match[3], m, +match[1]) : null;
  }

  match = text.match(/^([A-Za-z]{3,})\.? (\d{1,2}),? (\d{4})/);
  if (match) {
    const m = MONTH_NAMES[match[1].slice(0, 3).toLowerCase()];
    return m ? toIso(+match[3], m, +match[2]) : null;
  }

  match = text.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (match) return toIso(+match[1], +match[2], +match[3]);

  return null;
}

/** 03/04/2026 is ambiguous; one row with a day above 12 settles the file. */
function detectOrder(values: string[]): DateOrder {
  for (const value of values) {
    const match = value.trim().match(/^(\d{1,2})[-/.](\d{1,2})[-/.]\d{2,4}/);
    if (!match) continue;
    if (+match[1] > 12) return "dmy";
    if (+match[2] > 12) return "mdy";
  }
  return "dmy";
}

function looksNumeric(value: string): boolean {
  return /\d/.test(value) && /^[\s\d.,()+\-−€$£A-Za-z]*$/.test(value) && parseAmountToCents(value) !== null && !/[A-Za-z]{4,}/.test(value);
}

/**
 * Pick the delimiter whose count per line is most consistent. Papa's own
 * guess is thrown off by preamble lines and by decimal commas, both of which
 * are normal in European bank exports.
 */
export function detectDelimiter(input: string): string {
  const lines = input.split(/\r?\n/).filter((line) => line.trim()).slice(0, 40);
  // Semicolon first: on a tie, a comma is more likely to be a decimal mark.
  const candidates = [";", "\t", "|", ","];
  let best = ",";
  let bestScore = 0;
  for (const delimiter of candidates) {
    const counts = new Map<number, number>();
    for (const line of lines) {
      let count = 0;
      let quoted = false;
      for (const char of line) {
        if (char === '"') quoted = !quoted;
        else if (char === delimiter && !quoted) count++;
      }
      if (count > 0) counts.set(count, (counts.get(count) ?? 0) + 1);
    }
    let score = 0;
    for (const [count, lineCount] of counts) score = Math.max(score, count * lineCount);
    if (score > bestScore) {
      bestScore = score;
      best = delimiter;
    }
  }
  return best;
}

export function parseStatement(text: string): ParsedStatement {
  const input = text.replace(/^﻿/, "");
  if (!input.trim()) return { rows: [], skipped: 0, error: "The file is empty." };

  const parsed = Papa.parse<string[]>(input, { skipEmptyLines: "greedy", delimiter: detectDelimiter(input) });
  const table = (parsed.data as string[][]).filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""));
  if (table.length < 2) return { rows: [], skipped: 0, error: "We couldn't find any rows in this file." };

  // 1. Find the header row; banks often put account details above it.
  let headerIndex = -1;
  let columns: Partial<Record<Role, number>> = {};
  for (let i = 0; i < Math.min(table.length, 25); i++) {
    const found: Partial<Record<Role, { index: number; rank: number }>> = {};
    table[i].forEach((cell, index) => {
      const hit = matchRole(String(cell ?? ""));
      if (hit && (!found[hit.role] || hit.rank < found[hit.role]!.rank)) {
        found[hit.role] = { index, rank: hit.rank };
      }
    });
    const hasMoney = found.amount || found.debit || found.credit;
    if (found.date && hasMoney) {
      headerIndex = i;
      columns = Object.fromEntries(Object.entries(found).map(([role, hit]) => [role, hit.index]));
      break;
    }
  }

  let body: string[][];
  if (headerIndex >= 0) {
    body = table.slice(headerIndex + 1);
  } else {
    // 2. No recognisable header: infer the columns from what the cells contain.
    body = table;
    const width = Math.max(...body.map((row) => row.length));
    const sample = body.slice(0, 50);
    let bestDate = -1, bestAmount = -1, bestText = -1;
    let dateScore = 0.6, amountScore = 0.6, textLength = 0;
    for (let c = 0; c < width; c++) {
      const cells = sample.map((row) => String(row[c] ?? "").trim());
      const filled = cells.filter(Boolean);
      if (!filled.length) continue;
      const dates = filled.filter((v) => parseDate(v) !== null).length / filled.length;
      const numbers = filled.filter((v) => looksNumeric(v)).length / filled.length;
      const avgLength = filled.reduce((sum, v) => sum + v.length, 0) / filled.length;
      if (dates > dateScore) { dateScore = dates; bestDate = c; }
      else if (numbers > amountScore && dates < 0.5) { amountScore = numbers; bestAmount = c; }
      else if (numbers < 0.5 && dates < 0.5 && avgLength > textLength) { textLength = avgLength; bestText = c; }
    }
    if (bestDate < 0 || bestAmount < 0) {
      return {
        rows: [],
        skipped: 0,
        error: "We couldn't find date and amount columns. Export the statement as CSV with a header row and try again.",
      };
    }
    columns = { date: bestDate, amount: bestAmount, description: bestText >= 0 ? bestText : undefined };
  }

  const dateCol = columns.date!;
  const order = detectOrder(body.map((row) => String(row[dateCol] ?? "")));

  const rows: ParsedRow[] = [];
  let skipped = 0;
  for (const row of body.slice(0, MAX_ROWS)) {
    const cell = (index: number | undefined) => (index === undefined ? "" : String(row[index] ?? "").trim());
    const date = parseDate(cell(dateCol), order);

    let amount: number | null = null;
    if (columns.amount !== undefined && cell(columns.amount)) {
      amount = parseAmountToCents(cell(columns.amount));
    }
    if (amount === null && (columns.debit !== undefined || columns.credit !== undefined)) {
      const debit = parseAmountToCents(cell(columns.debit)) ?? 0;
      const credit = parseAmountToCents(cell(columns.credit)) ?? 0;
      if (debit !== 0 || credit !== 0) amount = Math.abs(credit) - Math.abs(debit);
    }

    let description = cell(columns.description);
    if (!description) {
      // Fall back to the longest text cell in the row.
      description = row
        .map((value) => String(value ?? "").trim())
        .filter((value, index) => index !== dateCol && value && !looksNumeric(value) && parseDate(value) === null)
        .sort((a, b) => b.length - a.length)[0] ?? "Transaction";
    }

    if (!date || amount === null || amount === 0) {
      skipped++;
      continue;
    }
    rows.push({ date, description: description.slice(0, 200), amountCents: amount });
  }

  if (!rows.length) {
    return { rows, skipped, error: "We read the file but found no transactions with a date and an amount." };
  }
  return { rows, skipped };
}
