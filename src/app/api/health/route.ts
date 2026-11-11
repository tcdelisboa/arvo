/**
 * Liveness check for the host and the keep-awake ping. Deliberately does not
 * touch the database, so a serverless Postgres can still suspend when idle.
 */
export function GET() {
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
