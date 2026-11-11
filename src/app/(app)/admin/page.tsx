import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { q, q1 } from "@/lib/db";
import { setUserPlan } from "@/lib/actions/plan";
import { day } from "@/lib/format";
import { PROFILES, type Level } from "@/lib/risk";
import { Badge, PageHeader, Panel, PanelHeader, Stat } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export const metadata: Metadata = { title: "Admin" };

type Row = {
  id: string;
  name: string;
  email: string;
  plan: string;
  created_at: Date | string;
  last_seen_at: Date | string | null;
  txs: number;
  sources: string | null;
  level: number | null;
  interested: boolean;
  days: number;
};

const iso = (value: Date | string) => new Date(value).toISOString().slice(0, 10);
const share = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}% of ${whole}` : "No one yet");
const SOURCE: Record<string, string> = { csv: "Own statement", bank: "Bank", sample: "Sample" };

export default async function AdminPage() {
  await requireAdmin();
  const count = async (sql: string) => Number((await q1<{ n: number }>(sql))?.n ?? 0);

  const [total, newWeek, activeWeek, imported, profiled, interested, plusCount, returned, weekOld, backAfterWeek, rows] =
    await Promise.all([
      count("SELECT count(*)::int AS n FROM users"),
      count("SELECT count(*)::int AS n FROM users WHERE created_at > now() - interval '7 days'"),
      count("SELECT count(*)::int AS n FROM users WHERE last_seen_at > now() - interval '7 days'"),
      count("SELECT count(DISTINCT user_id)::int AS n FROM accounts WHERE source IN ('csv', 'bank')"),
      count("SELECT count(*)::int AS n FROM investor_profiles"),
      count("SELECT count(*)::int AS n FROM plan_interest"),
      count("SELECT count(*)::int AS n FROM users WHERE plan = 'plus'"),
      count("SELECT count(*)::int AS n FROM (SELECT user_id FROM activity GROUP BY user_id HAVING count(*) >= 2) t"),
      count("SELECT count(*)::int AS n FROM users WHERE created_at < now() - interval '7 days'"),
      count(
        `SELECT count(DISTINCT a.user_id)::int AS n
           FROM activity a JOIN users u ON u.id = a.user_id
          WHERE a.day::date >= (u.created_at::date + 7)`,
      ),
      q<Row>(
        `SELECT u.id, u.name, u.email, u.plan, u.created_at, u.last_seen_at,
                (SELECT count(*)::int FROM transactions t WHERE t.user_id = u.id) AS txs,
                (SELECT string_agg(DISTINCT a.source, ',') FROM accounts a WHERE a.user_id = u.id) AS sources,
                (SELECT p.level FROM investor_profiles p WHERE p.user_id = u.id) AS level,
                EXISTS (SELECT 1 FROM plan_interest i WHERE i.user_id = u.id) AS interested,
                (SELECT count(*)::int FROM activity a WHERE a.user_id = u.id) AS days
           FROM users u ORDER BY u.created_at DESC LIMIT 200`,
      ),
    ]);

  return (
    <>
      <PageHeader title="Admin" lead="Who signed up, what they did, and who wants Plus. Only you can see this page." />

      <Panel className="p-5 sm:p-7">
        <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Accounts" value={total} note={`${newWeek} new in the last 7 days`} />
          <Stat label="Used Arvo in the last 7 days" value={activeWeek} note={share(activeWeek, total)} />
          <Stat label="Imported their own statement" value={imported} note={share(imported, total)} />
          <Stat label="Finished the investor profile" value={profiled} note={share(profiled, total)} />
          <Stat label="Asked for Plus" value={interested} note={share(interested, total)} />
          <Stat label="On Plus" value={plusCount} note="Granted by hand; payments are off" />
          <Stat label="Came back on another day" value={returned} note={share(returned, total)} />
          <Stat label="Back a week or more after signing up" value={backAfterWeek} note={weekOld > 0 ? `${share(backAfterWeek, weekOld)} old enough` : "No account is a week old yet"} />
        </div>
      </Panel>

      <Panel className="mt-5">
        <PanelHeader title="Accounts" note={total > rows.length ? `Newest ${rows.length} of ${total}` : "Newest first"} />
        {rows.length ? (
          <ul className="mt-3 divide-y divide-line border-t border-line">
            {rows.map((row) => {
              const sources = (row.sources ?? "").split(",").filter(Boolean);
              const isPlus = row.plan === "plus";
              return (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4 sm:px-6">
                  <div className="min-w-0 flex-1 basis-[280px]">
                    <p className="truncate text-[14.5px] font-medium text-ink">
                      {row.name} <span className="font-normal text-ink-3">{row.email}</span>
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-3">
                      <span>Joined {day(iso(row.created_at))}</span>
                      <span>{row.last_seen_at ? `Last seen ${day(iso(row.last_seen_at))}` : "Not seen since"}</span>
                      <span className="tnum">{row.days} {row.days === 1 ? "day" : "days"} active</span>
                      <span className="tnum">{Number(row.txs).toLocaleString("en-GB")} transactions</span>
                    </p>
                    <p className="mt-2 flex flex-wrap gap-1.5">
                      {sources.map((source) => (
                        <Badge key={source} tone={source === "sample" ? "neutral" : "brand"}>{SOURCE[source] ?? source}</Badge>
                      ))}
                      {row.level ? <Badge>{PROFILES[Math.min(5, Math.max(1, Number(row.level))) as Level].name} profile</Badge> : null}
                      {row.interested ? <Badge tone="accent">Asked for Plus</Badge> : null}
                      {isPlus ? <Badge tone="brand">Plus</Badge> : null}
                    </p>
                  </div>
                  <form action={setUserPlan}>
                    <input type="hidden" name="userId" value={row.id} />
                    <input type="hidden" name="plan" value={isPlus ? "free" : "plus"} />
                    <SubmitButton variant="secondary" size="sm" pendingLabel="Saving">{isPlus ? "Remove Plus" : "Give Plus"}</SubmitButton>
                  </form>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-5 py-6 text-[14.5px] text-ink-2 sm:px-6">No accounts yet.</p>
        )}
      </Panel>
    </>
  );
}
