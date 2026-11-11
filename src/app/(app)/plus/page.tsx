import type { Metadata } from "next";
import { Check } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { q1 } from "@/lib/db";
import { joinWaitlist } from "@/lib/actions/plan";
import { FREE_FEATURES, PLUS_FEATURES, PLUS_PRICE } from "@/lib/plan";
import { Badge, cx, Notice, PageHeader, Panel } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export const metadata: Metadata = { title: "Plus" };

function Features({ items, strong }: { items: string[]; strong?: boolean }) {
  return (
    <ul className="mt-5 space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-[14.5px] leading-snug text-ink">
          <span className={cx("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full", strong ? "bg-brand text-on-brand" : "bg-sunken text-ink-2")}>
            <Check size={12} strokeWidth={3} />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

export default async function PlusPage() {
  const user = await requireUser();
  const plus = user.plan === "plus";
  const waiting = plus ? null : await q1("SELECT 1 AS yes FROM plan_interest WHERE user_id = $1", [user.id]);

  return (
    <>
      <PageHeader title="Arvo Plus" lead="Free shows you where your money goes. Plus shows you where to find more of it." />

      <div className="grid max-w-[860px] gap-5 md:grid-cols-2">
        <Panel className="p-6 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[17px] font-semibold text-ink">Free</h2>
            {!plus ? <Badge>Your plan</Badge> : null}
          </div>
          <p className="figure mt-3 text-[40px] leading-none text-ink">{"€"}0</p>
          <p className="mt-1.5 text-[13.5px] text-ink-3">For as long as you like</p>
          <Features items={FREE_FEATURES} />
        </Panel>

        <Panel className="border-brand p-6 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[17px] font-semibold text-ink">Plus</h2>
            {plus ? <Badge tone="brand">Your plan</Badge> : null}
          </div>
          <p className="figure mt-3 text-[40px] leading-none text-ink">
            {PLUS_PRICE}
            <span className="font-sans text-[15px] font-normal text-ink-3"> a month</span>
          </p>
          <p className="mt-1.5 text-[13.5px] text-ink-3">Cancel whenever you want</p>
          <Features items={PLUS_FEATURES} strong />

          <div className="mt-7">
            {plus ? (
              <Notice tone="accent">You have Plus. Everything on this list is switched on.</Notice>
            ) : waiting ? (
              <Notice tone="accent" title="You are on the list.">
                We will email {user.email} when Plus opens.
              </Notice>
            ) : (
              <>
                <form action={joinWaitlist}>
                  <SubmitButton size="lg" className="w-full" pendingLabel="Adding you">Join the Plus waitlist</SubmitButton>
                </form>
                <p className="mt-3 text-[13px] leading-relaxed text-ink-3">
                  Plus is not on sale yet. Join the list and we will email you when it opens. No payment details needed.
                </p>
              </>
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}
