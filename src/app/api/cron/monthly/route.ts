import { q } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { todayIso } from "@/lib/format";
import { monthlyEmail } from "@/lib/monthly";
import { addMonths } from "@/lib/spending";

/**
 * Sends the monthly summary for the month that just ended. Called once a month
 * by a scheduled GitHub workflow with `Authorization: Bearer $CRON_SECRET`.
 * Safe to call twice: each person gets at most one email per month.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 24) return Response.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "Not allowed" }, { status: 401 });

  const ym = addMonths(todayIso().slice(0, 7), -1);
  const users = await q<{ id: string }>(
    `SELECT u.id FROM users u
      WHERE u.monthly_email AND u.onboarded
        AND NOT EXISTS (SELECT 1 FROM monthly_emails m WHERE m.user_id = u.id AND m.ym = $1)
      ORDER BY u.created_at`,
    [ym],
  );

  let sent = 0;
  let skipped = 0;
  for (const { id } of users) {
    const email = await monthlyEmail(id, ym).catch(() => null);
    if (!email) {
      skipped += 1;
      continue;
    }
    const ok = await sendEmail(email.to, email.subject, email.text, {
      "List-Unsubscribe": `<${email.unsubscribe}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
    if (ok) {
      await q("INSERT INTO monthly_emails (user_id, ym) VALUES ($1, $2) ON CONFLICT DO NOTHING", [id, ym]);
      sent += 1;
    } else {
      skipped += 1;
    }
  }
  return Response.json({ month: ym, candidates: users.length, sent, skipped });
}
