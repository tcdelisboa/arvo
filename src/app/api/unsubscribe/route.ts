import { q1 } from "@/lib/db";
import { verifySignature } from "@/lib/crypto";
import { isLang, makeT } from "@/lib/i18n/core";
import { appUrl } from "@/lib/url";

async function unsubscribe(request: Request): Promise<{ ok: boolean; lang: string | null }> {
  const url = new URL(request.url);
  const userId = url.searchParams.get("u") ?? "";
  const signature = url.searchParams.get("s") ?? "";
  if (!userId || !signature || !verifySignature(`unsubscribe:${userId}`, signature)) return { ok: false, lang: null };
  const row = await q1<{ lang: string | null }>("UPDATE users SET monthly_email = FALSE WHERE id = $1 RETURNING lang", [userId]);
  return { ok: !!row, lang: row?.lang ?? null };
}

/** The link in the email. A plain page, no sign-in needed. */
export async function GET(request: Request) {
  const { ok, lang } = await unsubscribe(request);
  const t = makeT(isLang(lang) ? lang : "en");
  const title = ok ? t("You will not get the monthly email any more.") : t("This link is not valid.");
  const body = ok
    ? t("You can switch it back on whenever you like in Settings.")
    : t("Open Arvo and switch the monthly email off in Settings instead.");
  const html = `<!doctype html><html lang="${lang === "pt" ? "pt-BR" : "en"}"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Arvo</title>
<body style="font-family:system-ui,sans-serif;max-width:520px;margin:15vh auto;padding:0 20px;color:#14211e">
<h1 style="font-size:26px;font-weight:600">${title}</h1><p style="color:#4a5a56;font-size:16px">${body}</p>
<p><a href="${appUrl()}/settings" style="color:#1d5b4c">${t("Open settings")}</a></p></body></html>`;
  return new Response(html, { status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

/** One-click unsubscribe from the mail client (RFC 8058). */
export async function POST(request: Request) {
  const { ok } = await unsubscribe(request);
  return new Response(null, { status: ok ? 200 : 400 });
}
