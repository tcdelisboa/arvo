/**
 * Liveness check for the host and the keep-awake ping. Deliberately does not
 * touch the database, so a serverless Postgres can still suspend when idle.
 * `version` is the commit the host built, so a deploy can be confirmed.
 */
export function GET() {
  const version = process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? null;
  return Response.json({ ok: true, version }, { headers: { "Cache-Control": "no-store" } });
}
