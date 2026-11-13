import { requireAdmin } from "@/lib/auth";
import { todayIso } from "@/lib/format";
import { monthlyEmail } from "@/lib/monthly";
import { addMonths } from "@/lib/spending";

/** Admin only: the monthly email you would get for last month, as plain text. */
export async function GET() {
  const user = await requireAdmin();
  const email = await monthlyEmail(user.id, addMonths(todayIso().slice(0, 7), -1));
  const text = email ? `Subject: ${email.subject}\n\n${email.text}` : "Nothing to send yet: no transactions last month and no investor profile.";
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
