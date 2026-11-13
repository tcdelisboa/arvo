import ExcelJS from "exceljs";
import { getUser } from "@/lib/auth";
import { listAccounts, listTransactions } from "@/lib/data";
import { categoryLabel, isSpend } from "@/lib/categories";
import { summarizeMonths, ymOf } from "@/lib/spending";
import { todayIso } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";

/** The spending sheet as an Excel workbook: transactions, a category-by-month grid, and monthly totals. */
export async function GET() {
  const user = await getUser();
  const { t } = await getI18n();
  if (!user) return new Response(t("Sign in to export your data."), { status: 401 });
  if (user.plan !== "plus") return new Response(t("Excel export is part of Arvo Plus."), { status: 403 });

  const [txs, accounts] = await Promise.all([listTransactions(user.id), listAccounts(user.id)]);
  const accountName = new Map(accounts.map((a) => [a.id, a.name]));
  const moneyFormat = `#,##0.00;[Red]-#,##0.00`;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Arvo";
  workbook.created = new Date();

  const head = (sheet: ExcelJS.Worksheet) => {
    const row = sheet.getRow(1);
    row.font = { bold: true };
    row.border = { bottom: { style: "thin" } };
  };

  // 1. Every transaction.
  const sheet = workbook.addWorksheet(t("Transactions"));
  sheet.columns = [
    { header: t("Date"), key: "date", width: 12 },
    { header: t("Description"), key: "description", width: 44 },
    { header: t("Merchant"), key: "merchant", width: 26 },
    { header: t("Category"), key: "category", width: 22 },
    { header: t("Account"), key: "account", width: 24 },
    { header: t("Amount ({currency})", { currency: user.currency }), key: "amount", width: 16 },
  ];
  for (const tx of txs) {
    const [y, m, d] = tx.date.split("-").map(Number);
    sheet.addRow({
      date: new Date(Date.UTC(y, m - 1, d)),
      description: tx.description,
      merchant: tx.merchant,
      category: t(categoryLabel(tx.category)),
      account: accountName.get(tx.accountId) ?? "",
      amount: tx.amountCents / 100,
    });
  }
  sheet.getColumn("date").numFmt = "dd/mm/yyyy";
  sheet.getColumn("amount").numFmt = moneyFormat;
  head(sheet);
  if (txs.length) sheet.autoFilter = { from: "A1", to: `F${txs.length + 1}` };

  // 2. Spending by category and month, with live formulas over the first sheet's data.
  const months = summarizeMonths(txs).map((m) => m.ym);
  const grid = new Map<string, Map<string, number>>();
  for (const tx of txs) {
    if (!isSpend(tx.category)) continue;
    const label = t(categoryLabel(tx.category));
    const row = grid.get(label) ?? new Map<string, number>();
    row.set(ymOf(tx.date), (row.get(ymOf(tx.date)) ?? 0) - tx.amountCents);
    grid.set(label, row);
  }
  const byCategory = workbook.addWorksheet(t("By category"));
  byCategory.columns = [
    { header: t("Category"), key: "category", width: 24 },
    ...months.map((ym) => ({ header: ym, key: ym, width: 12 })),
    { header: t("Total"), key: "total", width: 14 },
  ];
  const labels = [...grid.keys()].sort(
    (a, b) => [...grid.get(b)!.values()].reduce((s, v) => s + v, 0) - [...grid.get(a)!.values()].reduce((s, v) => s + v, 0),
  );
  const lastCol = byCategory.getColumn(months.length + 1).letter;
  labels.forEach((label, index) => {
    const rowNumber = index + 2;
    const values: Record<string, unknown> = { category: label };
    for (const ym of months) values[ym] = Math.max(0, grid.get(label)!.get(ym) ?? 0) / 100;
    values.total = months.length ? { formula: `SUM(B${rowNumber}:${lastCol}${rowNumber})` } : 0;
    byCategory.addRow(values);
  });
  if (labels.length && months.length) {
    const totalRow: Record<string, unknown> = { category: t("Total") };
    months.forEach((ym, i) => {
      const letter = byCategory.getColumn(i + 2).letter;
      totalRow[ym] = { formula: `SUM(${letter}2:${letter}${labels.length + 1})` };
    });
    const totalLetter = byCategory.getColumn(months.length + 2).letter;
    totalRow.total = { formula: `SUM(${totalLetter}2:${totalLetter}${labels.length + 1})` };
    const added = byCategory.addRow(totalRow);
    added.font = { bold: true };
    added.border = { top: { style: "thin" } };
  }
  for (let c = 2; c <= months.length + 2; c++) byCategory.getColumn(c).numFmt = "#,##0.00";
  head(byCategory);

  // 3. Monthly totals.
  const monthly = workbook.addWorksheet(t("Monthly"));
  monthly.columns = [
    { header: t("Month"), key: "ym", width: 12 },
    { header: t("Money in"), key: "income", width: 14 },
    { header: t("Spending"), key: "spending", width: 14 },
    { header: t("To savings"), key: "saved", width: 14 },
    { header: t("Left over"), key: "net", width: 14 },
  ];
  summarizeMonths(txs).forEach((m, index) => {
    const r = index + 2;
    monthly.addRow({ ym: m.ym, income: m.income / 100, spending: m.spending / 100, saved: m.saved / 100, net: { formula: `B${r}-C${r}` } });
  });
  for (let c = 2; c <= 5; c++) monthly.getColumn(c).numFmt = moneyFormat;
  head(monthly);

  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="arvo-spending-${todayIso()}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
