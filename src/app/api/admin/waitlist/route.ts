import { getUser } from "@/lib/auth";
import { q } from "@/lib/db";

const cell = (value: unknown) => {
  const text = value === null || value === undefined ? "" : String(value);
  // Quote everything, and defuse values a spreadsheet would run as a formula.
  return `"${(/^[=+\-@]/.test(text) ? `'${text}` : text).replace(/"/g, '""')}"`;
};

/** The waitlist as a CSV file. Admins only. */
export async function GET() {
  const user = await getUser();
  if (!user?.isAdmin) return new Response("Not found", { status: 404 });
  const rows = await q<{ email: string; goal: string | null; source: string | null; created_at: Date | string }>(
    "SELECT email, goal, source, created_at FROM waitlist ORDER BY created_at DESC",
  );
  const lines = [
    ["email", "goal", "source", "joined"].map(cell).join(","),
    ...rows.map((row) => [row.email, row.goal, row.source, new Date(row.created_at).toISOString()].map(cell).join(",")),
  ];
  return new Response(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="arvo-waitlist.csv"',
      "Cache-Control": "no-store",
    },
  });
}
