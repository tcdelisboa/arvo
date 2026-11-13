import "server-only";

/**
 * Transactional email through Resend's HTTP API. Without RESEND_API_KEY the
 * message is printed to the server log, which is enough for local development.
 */
export async function sendEmail(to: string, subject: string, text: string, headers?: Record<string, string>): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Arvo <onboarding@resend.dev>";
  if (!key) {
    console.info(`[email] (not sent, RESEND_API_KEY is not set)\nTo: ${to}\nSubject: ${subject}\n\n${text}\n`);
    return false;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, text, ...(headers ? { headers } : {}) }),
  });
  if (!response.ok) {
    console.error("[email] send failed:", response.status, await response.text().catch(() => ""));
    return false;
  }
  return true;
}
