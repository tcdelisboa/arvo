import { parseDate, type ParsedRow, type ParsedStatement } from "./csv";
import { parseAmountToCents } from "./format";

/**
 * Bank statement (PDF) parser.
 *
 * A PDF has no table, only pieces of text at positions on a page. This reads
 * the lines that start with a date and end with money, works out which number
 * is the amount and which the running balance from the column headings, and
 * settles whether money came in or went out from, in order: separate
 * debit/credit columns, a sign on the amount, the change in the balance, and
 * as a last resort the wording.
 *
 * It only works on PDFs that contain real text. A scanned statement is a
 * picture and has no text to read.
 */

export type PdfCell = { text: string; x: number; right: number };
export type PdfLine = { page: number; cells: PdfCell[] };

type Role = "date" | "description" | "amount" | "debit" | "credit" | "balance";
type Column = { role: Role; left: number; right: number };
type Token = { cents: number; sign: -1 | 0 | 1; start: number; end: number; left: number; right: number };
type Draft = {
  date: string;
  /** The line's text and where the description starts, so the description can be cut again once the layout is known. */
  text: string;
  cursor: number;
  /** The run of money that ends the line, left to right. */
  run: Token[];
  /** Money headings in force when the line was read. */
  money: Column[];
  /** Description taken from the line itself, or from the line above when it wraps around the date. */
  head: string;
  wrapped: boolean;
  /** Lines of description that follow the payment. */
  tail: string;
  cents: number;
  /** 0 until the direction is known. */
  sign: -1 | 0 | 1;
  balance: number | null;
};

const MAX_ROWS = 20_000;

const plain = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/* ------------------------------ a line of text ------------------------------ */

/** The line as one string, with a way back from a character to its place on the page. */
function flatten(line: PdfLine) {
  let text = "";
  const spans: { from: number; to: number; cell: PdfCell }[] = [];
  for (const cell of line.cells) {
    if (text) text += " ";
    spans.push({ from: text.length, to: text.length + cell.text.length, cell });
    text += cell.text;
  }
  const xAt = (index: number) => {
    const span = spans.find((s) => index <= s.to) ?? spans[spans.length - 1];
    if (!span) return 0;
    const length = Math.max(1, span.to - span.from);
    const ratio = Math.min(1, Math.max(0, (index - span.from) / length));
    return span.cell.x + (span.cell.right - span.cell.x) * ratio;
  };
  return { text, xAt };
}

/* ---------------------------------- money ---------------------------------- */

// A sign or bracket, an optional currency, digits with two decimals, then an
// optional currency and a trailing sign or CR/DR. Two decimals are required:
// that is what separates money from the reference numbers around it.
const MONEY =
  /(\(|[-+−–])?\s?(?:[€$£]|EUR|USD|GBP|R\$)?\s?((?:\d{1,3}(?:[.,'’  ]\d{3})+|\d+)[.,]\d{2})(?!\d)\s?(?:[€$£]|EUR|USD|GBP)?(?:\s?(\)|CR|DR|Cr|Dr)(?![A-Za-z])|([-−–+])(?=\s|$))?/g;

function moneyIn(text: string, xAt: (index: number) => number, from: number): Token[] {
  const tokens: Token[] = [];
  MONEY.lastIndex = from;
  for (let match = MONEY.exec(text); match; match = MONEY.exec(text)) {
    // The pattern may begin on the space before the number.
    const start = match.index + (match[0].length - match[0].trimStart().length);
    const end = match.index + match[0].trimEnd().length;
    const before = text[start - 1] ?? " ";
    const after = text.slice(end, end + 2);
    // Part of a longer number, a date (01.10.2026) or a code (AB12,50X): not money.
    if (/[\d.,/:A-Za-z]/.test(before) || /^[.,/:]\d/.test(after) || /^[A-Za-z%]/.test(after)) continue;
    const cents = parseAmountToCents(match[2]);
    if (cents === null) continue;
    const lead = match[1];
    const trail = (match[3] ?? match[4] ?? "").toUpperCase();
    let sign: -1 | 0 | 1 = 0;
    // A leading minus or bracket, or a trailing minus or DR, is money out.
    if (lead) sign = lead === "+" ? 1 : -1;
    if (trail === "CR" || trail === "+") sign = 1;
    else if (trail && trail !== ")") sign = -1;
    tokens.push({ cents: Math.abs(cents), sign, start, end, left: xAt(start), right: xAt(end) });
  }
  return tokens;
}

/* ---------------------------------- dates ---------------------------------- */

const FULL_DATES = [
  /^(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})(?!\d)/,
  /^(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})(?!\d)/,
  /^(\d{1,2}[ -][a-z]{3,9}\.?,?[ -]\d{2,4})(?!\d)/,
  /^([a-z]{3,9}\.? \d{1,2},? \d{4})(?!\d)/,
];
const DAY_MONTH_NAME = /^(\d{1,2}) ([a-z]{3,9})\.?(?=\s|$)/;
const DAY_MONTH = /^(\d{1,2})[/-](\d{1,2})(?=\s|$)/;
const MONTHS = ["jan", "feb", "fev", "mar", "apr", "abr", "may", "mai", "jun", "jul", "aug", "ago", "sep", "set", "oct", "out", "okt", "nov", "dec", "dez"];

type DateHit = { raw: string; length: number; partial: boolean };

/** A date at the very start of the text, with or without its year. */
function dateAt(text: string): DateHit | null {
  const lower = plain(text);
  for (const pattern of FULL_DATES) {
    const match = lower.match(pattern);
    if (match) return { raw: match[1], length: match[1].length, partial: false };
  }
  const named = lower.match(DAY_MONTH_NAME);
  if (named && +named[1] >= 1 && +named[1] <= 31 && MONTHS.includes(named[2].slice(0, 3))) {
    return { raw: `${named[1]} ${named[2]}`, length: named[0].length, partial: true };
  }
  const numeric = lower.match(DAY_MONTH);
  if (numeric && +numeric[1] >= 1 && +numeric[1] <= 31 && +numeric[2] >= 1 && +numeric[2] <= 12) {
    return { raw: numeric[0], length: numeric[0].length, partial: true };
  }
  return null;
}

/* --------------------------------- headings -------------------------------- */

const HEADINGS: [Role, RegExp][] = [
  ["debit", /\b(debito|debitos|debit|debits|paid out|money out|withdrawals?|withdrawn|payments? out|saidas|soll|lastschrift|cargos?|debe)\b/],
  ["credit", /\b(credito|creditos|credit|credits|paid in|money in|deposits?|payments? in|entradas|haben|gutschrift|abonos?|haber)\b/],
  ["balance", /\b(saldo|balance|kontostand|solde)\b/],
  ["amount", /\b(montante|valor|amount|importe|betrag|umsatz|montant|quantia|summa)\b/],
  ["description", /\b(descricao|descritivo|description|details|detalhes|movimento|transaction|particulars|verwendungszweck|concepto|libelle|selgitus)\b/],
  ["date", /\b(data|date|datum|fecha|kuupaev)\b/],
];

/** Column positions, if this line is a table heading. */
function headingOf(line: PdfLine): Column[] | null {
  const { text, xAt } = flatten(line);
  if (text.length > 160 || dateAt(text)) return null;
  // "Data valor" and "value date" name a second date column, not the amount: blank them out.
  const lower = plain(text).replace(/\b(data[- ]valor|value date|data[- ]mov\w*\.?)\b/g, (found) => " ".repeat(found.length));
  const columns: Column[] = [];
  for (const [role, pattern] of HEADINGS) {
    const match = lower.match(pattern);
    if (match?.index === undefined) continue;
    columns.push({ role, left: xAt(match.index), right: xAt(match.index + match[0].length) });
  }
  const money = columns.filter((column) => ["amount", "debit", "credit", "balance"].includes(column.role));
  return money.length >= 1 && columns.length >= 2 ? columns : null;
}

function nearest(token: Token, columns: Column[]): Column | null {
  let best: Column | null = null;
  let bestDistance = 70;
  for (const column of columns) {
    const distance = Math.min(
      Math.abs(token.right - column.right),
      Math.abs(token.left - column.left),
      Math.abs((token.left + token.right) / 2 - (column.left + column.right) / 2),
    );
    if (distance < bestDistance) {
      best = column;
      bestDistance = distance;
    }
  }
  return best;
}

/* ------------------------------- the wording ------------------------------- */

const OPENING = /\b(saldo (inicial|anterior|de abertura)|opening balance|balance brought forward|brought forward|previous balance|alter saldo|anfangssaldo|solde precedent|saldo anterior)\b/;
const NOT_A_PAYMENT = /\b(saldo (inicial|anterior|final|disponivel|contabilistico|de abertura|de fecho)|opening balance|closing balance|balance (brought|carried) forward|(brought|carried) forward|previous balance|new balance|anfangssaldo|endsaldo|neuer saldo|total (debits?|credits?|debitos?|creditos?)|totals?:?$)\b/;
const NOISE = /\b(page|pagina|seite)\s+\d+|\biban\b|\bbic\b|\bswift\b|www\.|https?:|\bcontinua\b|\bcontinued\b/;
const MONEY_IN = /\b(salary|salario|ordenado|vencimento|payroll|wages|gehalt|lohn|refund|reembolso|devolucao|estorno|erstattung|deposit|deposito|top[- ]?up|carregamento|recebid[oa]|received|transfer(encia)? recebida|interest|juros|dividend(o|s)?|cashback|pension|pensao|rente)\b/;

/* --------------------------------- the parse -------------------------------- */

export function parsePdfStatement(lines: PdfLine[], today = new Date()): ParsedStatement {
  if (!lines.some((line) => line.cells.some((cell) => /[A-Za-z0-9]/.test(cell.text)))) {
    return {
      rows: [],
      skipped: 0,
      error: "This PDF has no text to read. It is probably a scan or a photo. Download the statement from your bank's website instead, as a PDF or CSV.",
    };
  }

  // Year for dates printed without one: the year the statement mentions most.
  const years = new Map<number, number>();
  for (const line of lines) {
    for (const match of line.cells.map((cell) => cell.text).join(" ").matchAll(/(?:^|\D)(20[0-4]\d)(?!\d)/g)) {
      years.set(+match[1], (years.get(+match[1]) ?? 0) + 1);
    }
  }
  const statementYear = [...years.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? today.getUTCFullYear();
  const latest = new Date(today.getTime() + 7 * 86_400_000).toISOString().slice(0, 10);

  // 03/04/2026 is ambiguous; one date with a day above 12 settles the file.
  let order: "dmy" | "mdy" = "dmy";
  for (const line of lines) {
    const match = line.cells[0]?.text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.]\d{2,4}/);
    if (!match) continue;
    if (+match[1] > 12) break;
    if (+match[2] > 12) {
      order = "mdy";
      break;
    }
  }

  const resolveDate = (hit: DateHit): string | null => {
    if (!hit.partial) return parseDate(hit.raw, order);
    const numeric = hit.raw.match(/^(\d{1,2})[/-](\d{1,2})$/);
    const build = (year: number) =>
      numeric ? parseDate(`${hit.raw}${hit.raw.includes("/") ? "/" : "-"}${year}`, order) : parseDate(`${hit.raw} ${year}`, order);
    const date = build(statementYear);
    // A statement read in January still lists December of the year before.
    return date && date > latest ? build(statementYear - 1) : date;
  };

  const drafts: Draft[] = [];
  let columns: Column[] | null = null;
  let opening: number | null = null;
  let skipped = 0;
  type Above = { text: string; page: number; x: number; draft: Draft | null };
  let last: { draft: Draft; page: number; x: number; extra: number } | null = null;
  // The text-only line just above the current one, and the payment it was added to, if any.
  let above: Above | null = null;

  const signed = (token: Token) => token.cents * (token.sign < 0 ? -1 : 1);
  /** The description: the text between the date and the first number in use, without a value date at its end. */
  const cut = (draft: Draft, firstUsed: Token | undefined) => {
    let head = draft.text.slice(draft.cursor, firstUsed ? firstUsed.start : draft.text.length).replace(/\s+/g, " ").trim();
    // "CAFE CENTRAL 01/09": the value date printed between the description and the amount.
    const space = head.lastIndexOf(" ");
    const word = head.slice(space + 1);
    if (dateAt(word)?.length === word.length) head = head.slice(0, Math.max(0, space)).trim();
    return head;
  };
  /** Which of the line's numbers to use when there are no headings to go by, or more numbers than headings. */
  const provisional = (run: Token[], money: Column[]) => {
    let used = run;
    if (money.length) {
      while (used.length > Math.max(1, money.length) && !nearest(used[0], money)) used = used.slice(1);
    }
    return used.length > 2 && !money.length ? used.slice(-2) : used;
  };

  for (const line of lines) {
    if (drafts.length >= MAX_ROWS) break;
    const heading = headingOf(line);
    if (heading) {
      columns = heading;
      last = null;
      above = null;
      continue;
    }

    const { text, xAt } = flatten(line);
    const lower = plain(text);
    const first = dateAt(text);

    if (!first) {
      const tokens = moneyIn(text, xAt, 0);
      if (OPENING.test(lower) && tokens.length) {
        opening = signed(tokens[tokens.length - 1]);
        last = null;
        above = null;
        continue;
      }
      // Wording only: no money, has letters, and is not a footer or a balance line.
      const wording = !tokens.length && /[A-Za-z]{2}/.test(text) && text.length <= 70 && !NOISE.test(lower) && !NOT_A_PAYMENT.test(lower);
      // A second line of the payment's description: starts under the first.
      if (wording && last && last.page === line.page && last.extra < 2 && Math.abs((line.cells[0]?.x ?? 0) - last.x) <= 24) {
        last.draft.tail = `${last.draft.tail} ${text.trim()}`.trim().slice(0, 160);
        last.extra += 1;
        above = { text: text.trim(), page: line.page, x: line.cells[0]?.x ?? 0, draft: last.draft };
      } else {
        // A line of digits (a reference number) under a payment does not end its description.
        if (!(last && !/[A-Za-z]{2}/.test(text) && !tokens.length)) last = null;
        above = wording ? { text: text.trim(), page: line.page, x: line.cells[0]?.x ?? 0, draft: null } : null;
      }
      continue;
    }

    const date = resolveDate(first);
    let cursor = first.length;
    // Many statements print a value date right after the booking date.
    const gap = text.slice(cursor).match(/^\s+/)?.[0].length ?? 0;
    const second = dateAt(text.slice(cursor + gap));
    if (second) cursor += gap + second.length;

    const tokens = moneyIn(text, xAt, cursor);
    // The amounts are the run of money at the end of the line; money earlier on belongs to the description.
    let end = text.trimEnd().length;
    const trailing: Token[] = [];
    for (let i = tokens.length - 1; i >= 0; i--) {
      if (text.slice(tokens[i].end, end).trim()) break;
      trailing.unshift(tokens[i]);
      end = tokens[i].start;
    }
    const run = trailing.length ? trailing : tokens.slice(-2);
    const money = columns?.filter((column) => ["amount", "debit", "credit", "balance"].includes(column.role)) ?? [];
    const before: Above | null = above;
    last = null;
    above = null;

    if (!date || !run.length) {
      skipped += 1;
      continue;
    }

    const draft: Draft = { date, text, cursor, run, money, head: "", wrapped: false, tail: "", cents: 0, sign: 0, balance: null };
    draft.head = cut(draft, provisional(run, money)[0]);
    let descriptionX = xAt(cursor + (text.slice(cursor).match(/^\s+/)?.[0].length ?? 0));
    // Some statements wrap the description around the date: its first line sits just above.
    if (!draft.head && before && before.page === line.page) {
      draft.head = before.text;
      draft.wrapped = true;
      descriptionX = before.x;
      if (before.draft?.tail.endsWith(before.text)) before.draft.tail = before.draft.tail.slice(0, -before.text.length).trim();
    }
    if (NOT_A_PAYMENT.test(plain(draft.head)) || (!draft.head && run.length === 1 && OPENING.test(lower))) continue;

    drafts.push(draft);
    last = { draft, page: line.page, x: descriptionX, extra: 0 };
  }

  if (!drafts.length) {
    return {
      rows: [],
      skipped,
      error: "Arvo could not find any transactions in this PDF. Check that it is an account statement, or download it from your bank as CSV instead.",
    };
  }

  // Does the last number on each line behave like a running balance, with the number before it as the amount?
  // If the balances add up from one line to the next, that settles the layout whatever the headings say.
  const pair = (draft: Draft) => (draft.run.length >= 2 ? { amount: draft.run[draft.run.length - 2], balance: signed(draft.run[draft.run.length - 1]) } : null);
  const chained = (i: number, j: number) => {
    const here = drafts[i] ? pair(drafts[i]) : null;
    const there = drafts[j] ? pair(drafts[j]) : null;
    return !!here && !!there && Math.abs(Math.abs(here.balance - there.balance) - here.amount.cents) <= 1;
  };
  const paired = drafts.filter((draft) => pair(draft)).length;
  let ascending = 0;
  let descending = 0;
  for (let i = 0; i < drafts.length; i++) {
    if (chained(i, i - 1)) ascending += 1;
    if (chained(i, i + 1)) descending += 1;
  }
  const step = ascending >= descending ? -1 : 1;
  const balanced = paired >= 3 && Math.max(ascending, descending) >= 0.6 * (paired - 1);

  drafts.forEach((draft, i) => {
    let amount: Token | null = null;
    let sign: -1 | 0 | 1 = 0;
    let used = provisional(draft.run, draft.money);
    const both = pair(draft);

    if (balanced && both) {
      amount = both.amount;
      draft.balance = both.balance;
      used = draft.run.slice(-2);
      // The balance going up means money came in, whatever sign is printed.
      const other = drafts[i + step] ? pair(drafts[i + step])?.balance : step === -1 && i === 0 ? opening : null;
      const change = other === null || other === undefined ? null : both.balance - other;
      sign = change !== null && Math.abs(Math.abs(change) - amount.cents) <= 1 ? (change > 0 ? 1 : -1) : amount.sign;
    } else if (draft.money.length) {
      for (const token of used) {
        const column = nearest(token, draft.money);
        if (!column) continue;
        if (column.role === "balance") draft.balance = signed(token);
        else if (!amount || column.role !== "amount") {
          amount = token;
          sign = column.role === "debit" ? -1 : column.role === "credit" ? 1 : token.sign;
        }
      }
    }
    if (!amount) {
      // No headings to go by: the last number is the balance when there are two or more.
      amount = used.length >= 2 ? used[used.length - 2] : used[0];
      sign = amount.sign;
      if (used.length >= 2) draft.balance = signed(used[used.length - 1]);
    }
    // A heading can still say which way the money went when nothing else does.
    if (sign === 0 && draft.money.length) {
      const role = nearest(amount, draft.money)?.role;
      if (role === "debit") sign = -1;
      if (role === "credit") sign = 1;
    }
    draft.cents = amount.cents;
    draft.sign = sign;
    if (!draft.wrapped) draft.head = cut(draft, used[0].start <= amount.start ? used[0] : amount);
  });

  // Direction for amounts printed without a sign.
  const explicitSigns = drafts.some((draft) => draft.run.some((token) => token.sign !== 0));
  const undecided = drafts.filter((draft) => draft.sign === 0);
  if (undecided.length) {
    if (explicitSigns && !balanced) {
      // Money out carries a minus in this statement, so a bare number is money in.
      for (const draft of undecided) draft.sign = 1;
    } else {
      if (!balanced) {
        // Balances found through the headings can still give the direction.
        const fits = (i: number, j: number) => {
          const a = drafts[i]?.balance;
          const b = drafts[j]?.balance;
          return a !== null && a !== undefined && b !== null && b !== undefined && Math.abs(Math.abs(a - b) - drafts[i].cents) <= 1;
        };
        let up = 0;
        let down = 0;
        for (let i = 0; i < drafts.length; i++) {
          if (fits(i, i - 1)) up += 1;
          if (fits(i, i + 1)) down += 1;
        }
        if (up + down > 0) {
          const direction = up >= down ? -1 : 1;
          drafts.forEach((draft, i) => {
            if (draft.sign !== 0 || draft.balance === null) return;
            const other = drafts[i + direction]?.balance ?? (direction === -1 && i === 0 ? opening : null);
            if (other === null || other === undefined) return;
            const change = draft.balance - other;
            if (Math.abs(Math.abs(change) - draft.cents) <= 1) draft.sign = change > 0 ? 1 : -1;
          });
        }
      }
      // Whatever is left: a printed plus elsewhere means bare numbers are money in; otherwise go by the wording.
      for (const draft of drafts) {
        if (draft.sign !== 0) continue;
        if (explicitSigns) draft.sign = 1;
        else draft.sign = MONEY_IN.test(plain(`${draft.head} ${draft.tail}`)) ? 1 : -1;
      }
    }
  }

  const rows: ParsedRow[] = drafts
    .filter((draft) => draft.cents !== 0)
    .map((draft) => ({
      date: draft.date,
      description: `${draft.head} ${draft.tail}`.replace(/\s+/g, " ").trim().slice(0, 200) || "Payment",
      amountCents: draft.cents * (draft.sign < 0 ? -1 : 1),
    }));
  if (!rows.length) {
    return { rows: [], skipped, error: "Arvo could not find any transactions in this PDF. Download it from your bank as CSV instead." };
  }
  return { rows, skipped };
}

/* ------------------------- from positioned text to lines ------------------------- */

export type PdfItem = { text: string; x: number; y: number; width: number; height: number; page: number };

/** Group the pieces of text a PDF page is made of into lines, and each line into cells. */
export function linesFromItems(items: PdfItem[]): PdfLine[] {
  const usable = items.filter((item) => item.text.trim());
  // Top of the page first (PDF y grows upwards), then left to right.
  usable.sort((a, b) => a.page - b.page || b.y - a.y || a.x - b.x);

  const lines: { page: number; y: number; items: PdfItem[] }[] = [];
  for (const item of usable) {
    const tolerance = Math.max(2, (item.height || 10) * 0.35);
    const line = lines.length ? lines[lines.length - 1] : null;
    if (line && line.page === item.page && Math.abs(line.y - item.y) <= tolerance) line.items.push(item);
    else lines.push({ page: item.page, y: item.y, items: [item] });
  }

  return lines.map((line) => {
    line.items.sort((a, b) => a.x - b.x);
    const cells: PdfCell[] = [];
    for (const item of line.items) {
      const size = item.height || 10;
      const previous = cells[cells.length - 1];
      const gap = previous ? item.x - previous.right : Infinity;
      if (previous && gap < size * 0.6) {
        // Same cell: a word space when there is a visible gap, nothing when the letters touch.
        previous.text += (gap > size * 0.12 && !previous.text.endsWith(" ") ? " " : "") + item.text.trim();
        previous.right = Math.max(previous.right, item.x + item.width);
      } else {
        cells.push({ text: item.text.trim(), x: item.x, right: item.x + item.width });
      }
    }
    return { page: line.page, cells };
  });
}
