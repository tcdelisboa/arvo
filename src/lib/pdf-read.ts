import "server-only";
import type { ParsedStatement } from "./csv";
import { linesFromItems, parsePdfStatement, type PdfItem } from "./pdf-statement";

const MAX_PAGES = 80;

/** Read the transactions out of a PDF bank statement. */
export async function readPdfStatement(bytes: Uint8Array): Promise<ParsedStatement> {
  const failure = (error: string): ParsedStatement => ({ rows: [], skipped: 0, error });
  let pdf;
  try {
    const { getDocumentProxy } = await import("unpdf");
    pdf = await getDocumentProxy(bytes);
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "PasswordException") {
      return failure("This PDF is locked with a password. Save a copy without the password, or download the statement as CSV.");
    }
    return failure("Arvo could not open this PDF. Download the statement again from your bank and try once more.");
  }

  const items: PdfItem[] = [];
  const pages = Math.min(pdf.numPages, MAX_PAGES);
  for (let number = 1; number <= pages; number++) {
    const page = await pdf.getPage(number);
    const content = await page.getTextContent();
    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      items.push({
        text: item.str,
        x: item.transform[4],
        y: item.transform[5],
        width: item.width,
        height: item.height || Math.abs(item.transform[3]) || 10,
        page: number,
      });
    }
  }
  return parsePdfStatement(linesFromItems(items));
}
