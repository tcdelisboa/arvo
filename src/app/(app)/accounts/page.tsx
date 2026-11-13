import type { Metadata } from "next";
import { Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listAccounts } from "@/lib/data";
import { loadSampleData, removeAccount } from "@/lib/actions/data";
import { disconnectBank, syncBank } from "@/lib/actions/bank";
import { bankEnabled } from "@/lib/plaid";
import { q } from "@/lib/db";
import { Badge, PageHeader, Panel, PanelHeader } from "@/components/ui";
import { BankConnect } from "@/components/bank-connect";
import { ImportForm } from "@/components/import-form";
import { SubmitButton } from "@/components/submit-button";

export const metadata: Metadata = { title: "Accounts" };

const SOURCE_LABEL = { sample: "Sample data", csv: "Statement import", bank: "Bank connection" } as const;

export default async function AccountsPage() {
  const user = await requireUser();
  const [accounts, items] = await Promise.all([
    listAccounts(user.id),
    q<{ id: string; institution: string | null; last_synced_at: Date | null }>(
      "SELECT id, institution, last_synced_at FROM bank_items WHERE user_id = $1 ORDER BY created_at",
      [user.id],
    ),
  ]);
  const bank = bankEnabled();
  const hasSample = accounts.some((a) => a.source === "sample");

  return (
    <>
      <PageHeader title="Accounts" lead="Where your transactions come from. Arvo reads them; it can never move money." />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel className="lg:col-span-2">
          <PanelHeader title="Your accounts" />
          <div className="px-5 pb-5 pt-3 sm:px-6 sm:pb-6">
            {accounts.length ? (
              <ul className="divide-y divide-line">
                {accounts.map((account) => (
                  <li key={account.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-medium text-ink">{account.name}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[13px] text-ink-3">
                        <Badge tone={account.source === "sample" ? "accent" : "neutral"}>{SOURCE_LABEL[account.source]}</Badge>
                        <span className="tnum">{account.count.toLocaleString("en-GB")} transactions</span>
                      </p>
                    </div>
                    {account.source !== "bank" ? (
                      <form action={removeAccount}>
                        <input type="hidden" name="accountId" value={account.id} />
                        <SubmitButton variant="danger" size="sm" pendingLabel="Removing">
                          <Trash2 size={15} /> Remove
                        </SubmitButton>
                      </form>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-2 text-[14.5px] text-ink-2">No accounts yet. Add your transactions below to get started.</p>
            )}

            {items.length ? (
              <div className="mt-4 border-t border-line pt-4">
                <p className="mb-2 text-[13.5px] font-medium text-ink">Connected banks</p>
                <ul className="space-y-2">
                  {items.map((item) => (
                    <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 text-[14px]">
                      <span className="text-ink-2">
                        {item.institution ?? "Bank"}
                        {item.last_synced_at ? (
                          <span className="text-ink-3">, updated {new Date(item.last_synced_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}</span>
                        ) : null}
                      </span>
                      <span className="flex gap-2">
                        <form action={syncBank}>
                          <input type="hidden" name="itemId" value={item.id} />
                          <SubmitButton variant="secondary" size="sm" pendingLabel="Updating">Update now</SubmitButton>
                        </form>
                        <form action={disconnectBank}>
                          <input type="hidden" name="itemId" value={item.id} />
                          <SubmitButton variant="danger" size="sm" pendingLabel="Disconnecting">Disconnect</SubmitButton>
                        </form>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </Panel>

        {/* Direct bank connection stays hidden until an open banking provider is set up. */}
        {bank ? (
          <Panel>
            <PanelHeader title="Connect your bank" note="Read-only, through regulated open banking." />
            <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
              <p className="mb-4 text-[14px] text-ink-2">
                You sign in on your bank&apos;s own page. Arvo never sees your banking password and receives transactions only.
              </p>
              <BankConnect />
            </div>
          </Panel>
        ) : null}

        <Panel>
          <PanelHeader title="Import a statement" note="A CSV or PDF statement from your bank's website or app." />
          <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
            <ImportForm />
            <details className="mt-5 text-[13.5px] text-ink-2">
              <summary className="cursor-pointer font-medium text-ink">How do I get a statement from my bank?</summary>
              <p className="mt-2">
                Sign in to your bank on a computer, open the list of transactions for your current account, choose the longest
                period on offer (six months or more works best), and look for Export or Download. CSV is the most reliable; a PDF statement works too, as long as it is the
                bank&apos;s own file and not a scan or a photo. Arvo works out the columns, dates and decimals on its own, and
                importing the same file twice never creates duplicates.
              </p>
            </details>
          </div>
        </Panel>

        {!hasSample ? (
          <Panel className="lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
              <div className="max-w-xl">
                <h2 className="text-[17px] font-semibold text-ink">Just looking?</h2>
                <p className="mt-0.5 text-[14px] text-ink-2">
                  Load six months of made-up transactions to see how everything works. You can remove them at any time.
                </p>
              </div>
              <form action={loadSampleData}>
                <SubmitButton variant="secondary" pendingLabel="Loading">Load sample data</SubmitButton>
              </form>
            </div>
          </Panel>
        ) : null}
      </div>
    </>
  );
}
