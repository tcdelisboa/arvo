/**
 * Public address of the app, without a trailing slash. Set NEXT_PUBLIC_APP_URL
 * for a custom domain; otherwise the address the host assigns is used.
 */
export function appUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  const render = process.env.RENDER_EXTERNAL_URL;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  const url = explicit || render || (vercel ? `https://${vercel}` : "") || "http://localhost:3000";
  return url.replace(/\/$/, "");
}
