import { parseDate, type ParsedRow, type ParsedStatement } from "./csv";
import { parseAmountToCents } from "./format";
import { msg } from "./i18n/core";

/**
 * OFX (and QFX), the "Money" export most Brazilian banks offer. Version 1 is
 * SGML with unclosed field tags, version 2 is XML; reading each field up to
 * the next tag or line break handles both.
 */
export function isOfx(text: string): boolean {
  return /OFXHEADER|<OFX>/i.test(text.slice(0, 4000));
}

export function parseOfx(text: string): ParsedStatement {
  const blocks = text.split(/<STMTTRN>/i).slice(1).map((block) => block.split(/<\/STMTTRN>/i)[0]);
  if (!blocks.length) return { rows: [], skipped: 0, error: msg("We read the file but found no transactions with a date and an amount.") };

  const field = (block: string, tag: string) => block.match(new RegExp(`<${tag}>([^<\\r\\n]*)`, "i"))?.[1]?.trim() ?? "";
  const rows: ParsedRow[] = [];
  let skipped = 0;
  for (const block of blocks) {
    const posted = field(block, "DTPOSTED").match(/^(\d{4})(\d{2})(\d{2})/);
    const date = posted ? parseDate(`${posted[1]}-${posted[2]}-${posted[3]}`) : null;
    const amount = parseAmountToCents(field(block, "TRNAMT"));
    const name = field(block, "NAME");
    const memo = field(block, "MEMO");
    const description = (memo && name && !memo.toLowerCase().includes(name.toLowerCase()) ? `${name} ${memo}` : memo || name || "Transaction")
      .replace(/&amp;/g, "&")
      .slice(0, 200);
    if (!date || amount === null || amount === 0) {
      skipped += 1;
      continue;
    }
    rows.push({ date, description, amountCents: amount });
  }
  if (!rows.length) return { rows, skipped, error: msg("We read the file but found no transactions with a date and an amount.") };
  return { rows, skipped };
}
