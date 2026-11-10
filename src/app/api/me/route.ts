import { getUser } from "@/lib/auth";
import { getProfile, listAccounts, listTransactions, listWatchlist } from "@/lib/data";
import { todayIso } from "@/lib/format";

/** Everything Arvo holds about the signed-in person, as one JSON file (GDPR data portability). */
export async function GET() {
  const user = await getUser();
  if (!user) return new Response("Sign in to download your data.", { status: 401 });
  const [accounts, transactions, profile, watchlist] = await Promise.all([
    listAccounts(user.id),
    listTransactions(user.id),
    getProfile(user.id),
    listWatchlist(user.id),
  ]);
  const body = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      account: { name: user.name, email: user.email, currency: user.currency },
      accounts,
      transactions,
      investorProfile: profile,
      watchlist,
    },
    null,
    2,
  );
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="arvo-data-${todayIso()}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
