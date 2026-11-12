import { describe, expect, it } from "vitest";
import { linesFromItems, parsePdfStatement, type PdfItem, type PdfLine } from "../src/lib/pdf-statement";

const TODAY = new Date("2026-11-12T12:00:00Z");

/** One line of a page: [text, left edge, right edge] for each cell. */
const line = (page: number, ...cells: [string, number, number][]): PdfLine => ({
  page,
  cells: cells.map(([text, x, right]) => ({ text, x, right })),
});

const amounts = (lines: PdfLine[]) =>
  parsePdfStatement(lines, TODAY).rows.map((row) => `${row.date} ${row.amountCents} ${row.description}`);

describe("PDF statements", () => {
  it("reads separate debit and credit columns", () => {
    const rows = amounts([
      line(1, ["Data", 30, 55], ["Descrição", 120, 175], ["Débito", 380, 415], ["Crédito", 450, 490], ["Saldo", 530, 560]),
      line(1, ["2026-10-01", 30, 85], ["TRF VENCIMENTO", 120, 220], ["1.980,50", 448, 490], ["2.480,50", 518, 560]),
      line(1, ["2026-10-03", 30, 85], ["PAG SERVICOS EDP", 120, 230], ["64,20", 388, 415], ["2.416,30", 518, 560]),
    ]);
    expect(rows).toEqual(["2026-10-01 198050 TRF VENCIMENTO", "2026-10-03 -6420 PAG SERVICOS EDP"]);
  });

  it("treats a bare number as money in when the statement marks money out with a minus", () => {
    const rows = amounts([
      line(1, ["Date", 30, 55], ["Description", 120, 180], ["Amount", 450, 490], ["Balance", 520, 560]),
      line(1, ["01/10/2026", 30, 85], ["01/10/2026", 95, 150], ["SALARY", 160, 200], ["2.100,00", 448, 490], ["3.350,00", 518, 560]),
      line(1, ["02/10/2026", 30, 85], ["02/10/2026", 95, 150], ["RENT", 160, 190], ["-850,00", 452, 490], ["2.500,00", 518, 560]),
    ]);
    expect(rows).toEqual(["2026-10-01 210000 SALARY", "2026-10-02 -85000 RENT"]);
  });

  it("works out the direction from the balance, oldest first, starting from the opening balance", () => {
    const rows = amounts([
      line(1, ["Date", 30, 55], ["Details", 120, 160], ["Amount", 450, 490], ["Balance", 520, 560]),
      line(1, ["Balance brought forward", 120, 250], ["1,204.11", 518, 560]),
      line(1, ["02 Oct", 30, 62], ["TESCO STORES 3321", 120, 230], ["23.80", 462, 490], ["1,180.31", 518, 560]),
      line(1, ["04 Oct", 30, 62], ["ACME LTD", 120, 180], ["2,450.00", 448, 490], ["3,630.31", 518, 560]),
    ]);
    expect(rows).toEqual(["2026-10-02 -2380 TESCO STORES 3321", "2026-10-04 245000 ACME LTD"]);
  });

  it("works out the direction from the balance when the newest payment comes first", () => {
    const rows = amounts([
      line(1, ["Oct 30, 2026", 30, 95], ["Spotify", 120, 160], ["€10.99", 455, 490], ["€889.01", 520, 560]),
      line(1, ["Oct 21, 2026", 30, 95], ["Card payment in", 120, 200], ["€500.00", 450, 490], ["€900.00", 520, 560]),
      line(1, ["Oct 12, 2026", 30, 95], ["Lidl Tallinn", 120, 180], ["€31.40", 455, 490], ["€400.00", 520, 560]),
    ]);
    expect(rows).toEqual(["2026-10-30 -1099 Spotify", "2026-10-21 50000 Card payment in", "2026-10-12 -3140 Lidl Tallinn"]);
  });

  it("falls back to the wording when there is no sign and no balance", () => {
    const rows = amounts([
      line(1, ["03/10/2026", 30, 85], ["Salário Empresa", 120, 210], ["1.500,00", 448, 490]),
      line(1, ["04/10/2026", 30, 85], ["Supermercado", 120, 200], ["45,10", 462, 490]),
    ]);
    expect(rows).toEqual(["2026-10-03 150000 Salário Empresa", "2026-10-04 -4510 Supermercado"]);
  });

  it("reads trailing signs, brackets and CR/DR", () => {
    const rows = amounts([
      line(1, ["01.10.2026", 30, 85], ["GEHALT", 120, 170], ["3.200,00+", 440, 490]),
      line(1, ["02.10.2026", 30, 85], ["MIETE", 120, 160], ["950,00-", 450, 490]),
      line(1, ["03.10.2026", 30, 85], ["FEE", 120, 140], ["(12.00)", 455, 490]),
      line(1, ["04.10.2026", 30, 85], ["INTEREST", 120, 170], ["1.25 CR", 450, 490]),
    ]);
    expect(rows).toEqual(["2026-10-01 320000 GEHALT", "2026-10-02 -95000 MIETE", "2026-10-03 -1200 FEE", "2026-10-04 125 INTEREST"]);
  });

  it("keeps money inside the description out of the amount", () => {
    const rows = amounts([
      line(1, ["Date", 30, 55], ["Description", 120, 180], ["Amount", 450, 490], ["Balance", 520, 560]),
      line(1, ["05/10/2026", 30, 85], ["NETFLIX.COM 12.99 EUR", 120, 250], ["-12,99", 458, 490], ["2.444,64", 518, 560]),
      line(1, ["06/10/2026", 30, 85], ["REF 01.10.2026 INV 4417", 120, 260], ["-30,00", 458, 490], ["2.414,64", 518, 560]),
    ]);
    expect(rows).toEqual(["2026-10-05 -1299 NETFLIX.COM 12.99 EUR", "2026-10-06 -3000 REF 01.10.2026 INV 4417"]);
  });

  it("joins a description that wraps onto the next line or around the date", () => {
    const rows = amounts([
      line(1, ["Date", 30, 55], ["Description", 120, 180], ["Amount", 450, 490]),
      line(1, ["01/10/2026", 30, 85], ["CARD PAYMENT", 120, 200], ["-20,00", 458, 490]),
      line(1, ["PINGO DOCE LISBOA", 120, 230]),
      line(1, ["COMPRA 1234", 120, 190]),
      line(1, ["03/10/2026", 30, 85], ["-42,37", 458, 490]),
      line(1, ["CARTAO 4417", 120, 190]),
      line(1, ["Page 1 of 2", 280, 330]),
    ]);
    expect(rows).toEqual(["2026-10-01 -2000 CARD PAYMENT PINGO DOCE LISBOA", "2026-10-03 -4237 COMPRA 1234 CARTAO 4417"]);
  });

  it("gives dates without a year the statement's year, and December the year before in January", () => {
    const january = new Date("2027-01-05T12:00:00Z");
    const result = parsePdfStatement(
      [
        line(1, ["Statement 20 December 2026 to 4 January 2027, printed 5 January 2027", 30, 400]),
        line(1, ["Date", 30, 55], ["Details", 120, 160], ["Paid out", 400, 440], ["Paid in", 460, 495]),
        line(1, ["28 Dec", 30, 62], ["GIFT SHOP", 120, 180], ["40.00", 412, 440]),
        line(1, ["02 Jan", 30, 62], ["WAGES", 120, 160], ["900.00", 462, 495]),
      ],
      january,
    );
    expect(result.rows.map((row) => `${row.date} ${row.amountCents}`)).toEqual(["2026-12-28 -4000", "2027-01-02 90000"]);
  });

  it("skips balance and total lines, and follows headings repeated on a new page", () => {
    const heading = (page: number) =>
      line(page, ["Data", 30, 55], ["Descrição", 120, 175], ["Montante", 440, 490], ["Saldo", 530, 560]);
    const rows = amounts([
      heading(1),
      line(1, ["01/10/2026", 30, 85], ["Saldo anterior", 120, 200], ["1.000,00", 518, 560]),
      line(1, ["02/10/2026", 30, 85], ["CAFE", 120, 150], ["-3,50", 462, 490], ["996,50", 525, 560]),
      line(1, ["IBAN PT50 0000 0000 0000", 30, 200]),
      heading(2),
      line(2, ["03/10/2026", 30, 85], ["PADARIA", 120, 170], ["-2,10", 462, 490], ["994,40", 525, 560]),
      line(2, ["31/10/2026", 30, 85], ["Saldo final", 120, 180], ["994,40", 525, 560]),
    ]);
    expect(rows).toEqual(["2026-10-02 -350 CAFE", "2026-10-03 -210 PADARIA"]);
  });

  it("reads a statement with the value date between the description and the amount", () => {
    // Heading stacked on two lines, so "valor" under the second "Data" looks like the amount heading.
    const stacked = [line(1, ["Data", 30, 50], ["Data", 330, 350]), line(1, ["lanç.", 30, 55], ["Descritivo", 80, 130], ["valor", 330, 355], ["Valor", 430, 455], ["Saldo", 530, 555])];
    const single = [line(1, ["Data lanç.", 30, 75], ["Descritivo", 80, 130], ["Data valor", 320, 365], ["Valor", 430, 455], ["Saldo", 530, 555])];
    const body = [
      line(1, ["SALDO INICIAL", 80, 150], ["350,48", 525, 555]),
      line(1, ["01/09", 30, 55], ["Compra 8453186 CAFE CENTRAL", 80, 240], ["01/09", 330, 355], ["-5,00", 432, 455], ["345,48", 525, 555]),
      line(1, ["01/09", 30, 55], ["Compra 8453186 MERCADO 623, RUA", 80, 260], ["01/09", 330, 355], ["-21,09", 428, 455], ["324,39", 525, 555]),
      line(1, ["07/09", 30, 55], ["Trf a credito sepa+ - EMPRESA X -", 80, 270], ["07/09", 330, 355], ["2.168,00", 420, 455], ["2.492,39", 518, 555]),
      line(1, ["2120004835202", 80, 150]),
      line(1, ["07/09", 30, 55], ["Compra 8453186 LOJA 3908", 80, 220], ["07/09", 330, 355], ["-40,00", 428, 455], ["2.452,39", 518, 555]),
      line(1, ["Extracto de Setembro de 2026", 30, 200]),
    ];
    const expected = [
      "2026-09-01 -500 Compra 8453186 CAFE CENTRAL",
      "2026-09-01 -2109 Compra 8453186 MERCADO 623, RUA",
      "2026-09-07 216800 Trf a credito sepa+ - EMPRESA X -",
      "2026-09-07 -4000 Compra 8453186 LOJA 3908",
    ];
    expect(amounts([...stacked, ...body])).toEqual(expected);
    expect(amounts([...single, ...body])).toEqual(expected);
    expect(amounts(body)).toEqual(expected);
    // The same statement without a balance column.
    const noBalance = [...stacked, ...body].map((row) => ({ ...row, cells: row.cells.filter((cell) => cell.x < 500) }));
    expect(amounts(noBalance)).toEqual(expected);
  });

  it("explains a scan, and a PDF with no transactions", () => {
    expect(parsePdfStatement([], TODAY).error).toMatch(/scan/);
    expect(parsePdfStatement([line(1, ["Terms and conditions of your account", 30, 300])], TODAY).error).toMatch(/could not find/);
  });

  it("rebuilds lines and cells from text split into words", () => {
    const item = (text: string, x: number, y: number, width: number): PdfItem => ({ text, x, y, width, height: 10, page: 1 });
    const lines = linesFromItems([
      item("1.980,50", 448, 700.4, 42),
      item("TRF", 120, 700, 18),
      item("VENCIMENTO", 141, 700, 62),
      item("2026-10-01", 30, 700, 55),
      item(" ", 90, 700, 20),
      item("2026-10-03", 30, 680, 55),
      item("EDP", 120, 680, 20),
      item("-", 455, 680, 4),
      item("64,20", 459, 680, 28),
    ]);
    expect(lines.map((l) => l.cells.map((c) => c.text))).toEqual([
      ["2026-10-01", "TRF VENCIMENTO", "1.980,50"],
      ["2026-10-03", "EDP", "-64,20"],
    ]);
    expect(amounts(lines)).toEqual(["2026-10-01 198050 TRF VENCIMENTO", "2026-10-03 -6420 EDP"]);
  });
});
