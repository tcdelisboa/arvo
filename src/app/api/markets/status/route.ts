import { marketStatus } from "@/lib/market";

export const dynamic = "force-dynamic";

/** Whether each part of the live market feed answers from this server. No personal data. */
export async function GET() {
  const status = await marketStatus();
  return Response.json({
    mode: status.mode,
    checkedAt: new Date(status.checkedAt).toISOString(),
    ok: status.checks.every((check) => check.ok || check.name === "Company profile"),
    checks: status.checks,
  });
}
