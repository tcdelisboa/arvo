import "server-only";
import Papa from "papaparse";
import { parseStatement, type ParsedStatement } from "./csv";
import { msg } from "./i18n/core";

const pad = (n: number) => String(n).padStart(2, "0");

/** A bank export saved as .xlsx: the busiest sheet, read as a table and parsed like a CSV. */
export async function readXlsxStatement(buffer: Buffer): Promise<ParsedStatement> {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    return { rows: [], skipped: 0, error: msg("Arvo could not open this Excel file. Save it again as .xlsx or CSV and try once more.") };
  }
  const sheet = [...workbook.worksheets].sort((a, b) => b.actualRowCount - a.actualRowCount)[0];
  if (!sheet) return { rows: [], skipped: 0, error: msg("We couldn't find any rows in this file.") };

  const table: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, column) => {
      let value: unknown = cell.value;
      if (value && typeof value === "object" && "result" in value) value = (value as { result: unknown }).result;
      if (value && typeof value === "object" && "richText" in value) value = (value as { richText: { text: string }[] }).richText.map((r) => r.text).join("");
      if (value && typeof value === "object" && "text" in value) value = (value as { text: string }).text;
      let text = "";
      if (value instanceof Date) text = `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
      else if (typeof value === "number") text = String(Math.round(value * 100) / 100);
      else if (value != null) text = String(value);
      cells[column - 1] = text;
    });
    table.push(Array.from(cells, (cell) => cell ?? ""));
  });
  return parseStatement(Papa.unparse(table, { delimiter: ";" }));
}
