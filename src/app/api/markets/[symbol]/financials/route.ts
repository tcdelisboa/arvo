import ExcelJS from "exceljs";
import { getUser } from "@/lib/auth";
import { getStatements } from "@/lib/market";
import { normaliseSymbol } from "@/lib/market/types";

/** A company's last annual income statement, balance sheet and cash flow as an Excel workbook. */
export async function GET(_request: Request, { params }: { params: Promise<{ symbol: string }> }) {
  if (!(await getUser())) return new Response("Sign in to download statements.", { status: 401 });
  const symbol = normaliseSymbol(decodeURIComponent((await params).symbol));
  if (!symbol) return new Response("Unknown symbol.", { status: 400 });
  const data = await getStatements(symbol).catch(() => null);
  if (!data) return new Response("No financial statements are available for this asset right now.", { status: 404 });
  const { statements } = data;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Arvo";
  workbook.created = new Date();
  const unit = statements.currency ? `${statements.currency} millions` : "Millions";
  const sheets: [string, typeof statements.income][] = [
    ["Income statement", statements.income],
    ["Balance sheet", statements.balance],
    ["Cash flow", statements.cashflow],
  ];
  for (const [title, rows] of sheets) {
    const sheet = workbook.addWorksheet(title);
    sheet.columns = [{ width: 30 }, ...statements.years.map(() => ({ width: 16 }))];
    sheet.addRow([`${symbol}: ${title}`]).font = { bold: true, size: 13 };
    sheet.addRow([`${unit}, except per-share figures. Fiscal years ending on the dates shown. Source: Yahoo Finance.`]).font = { italic: true, size: 9, color: { argb: "FF666666" } };
    sheet.addRow([]);
    const head = sheet.addRow(["", ...statements.years.map((d) => new Date(`${d}T12:00:00Z`))]);
    head.font = { bold: true };
    head.border = { bottom: { style: "thin" } };
    statements.years.forEach((_, i) => {
      const cell = head.getCell(i + 2);
      cell.numFmt = "dd/mm/yyyy";
      cell.alignment = { horizontal: "right" };
    });
    for (const row of rows) {
      const added = sheet.addRow([row.label, ...row.values.map((v) => (v === null ? null : row.perShare ? v : v / 1e6))]);
      row.values.forEach((_, i) => (added.getCell(i + 2).numFmt = row.perShare ? "#,##0.00;(#,##0.00)" : "#,##0;(#,##0)"));
      if (/^(Gross profit|Operating income|Net income|Total assets|Total liabilities|Shareholders' equity|Free cash flow)$/.test(row.label)) added.font = { bold: true };
    }
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${symbol.replace(/[^A-Za-z0-9.-]/g, "")}-financials.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
