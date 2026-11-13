import { getI18n, titled } from "@/lib/i18n/server";
import type { T } from "@/lib/i18n/core";
import { msg } from "@/lib/i18n/core";
import { Check } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { q1 } from "@/lib/db";
import { joinWaitlist } from "@/lib/actions/plan";
import { FREE_FEATURES, FREE_HISTORY_MONTHS, PLUS_FEATURES, PLUS_PRICE } from "@/lib/plan";
import { Badge, cx, Notice, PageHeader, Panel } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export const generateMetadata = titled(msg("Plus"));

function Features({ items, strong, t }: { items: string[]; strong?: boolean; t: T }) {
  return (
    <ul className="mt-5 space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-[14.5px] leading-snug text-ink">
          <span className={cx("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full", strong ? "bg-brand text-on-brand" : "bg-sunken text-ink-2")}>
            <Check size={12} strokeWidth={3} />
          </span>
          {t(item, { n: FREE_HISTORY_MONTHS })}
        </li>
      ))}
    </ul>
  );
}

export default async function PlusPage() {
  const user = await requireUser();
  const plus = user.plan === "plus";
  const { t, f } = await getI18n();
  const waiting = plus ? null : await q1("SELECT 1 AS yes FROM plan_interest WHERE user_id = $1", [user.id]);

  return (
    <>
      <PageHeader title="Arvo Plus" lead={t("Free shows you where your money goes. Plus shows you where to find more of it.")} />

      <div className="grid max-w-[860px] gap-5 md:grid-cols-2">
        <Panel className="p-6 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[17px] font-semibold text-ink">{t("Free")}</h2>
            {!plus ? <Badge>{t("Your plan")}</Badge> : null}
          </div>
          <p className="figure mt-3 text-[40px] leading-none text-ink">{f.money(0, user.currency, { whole: true })}</p>
          <p className="mt-1.5 text-[13.5px] text-ink-3">{t("For as long as you like")}</p>
          <Features items={FREE_FEATURES} t={t} />
        </Panel>

        <Panel className="border-brand p-6 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[17px] font-semibold text-ink">Plus</h2>
            {plus ? <Badge tone="brand">{t("Your plan")}</Badge> : null}
          </div>
          <p className="figure mt-3 text-[40px] leading-none text-ink">
            {PLUS_PRICE}
            <span className="font-sans text-[15px] font-normal text-ink-3"> {t("a month")}</span>
          </p>
          <p className="mt-1.5 text-[13.5px] text-ink-3">{t("Cancel whenever you want")}</p>
          <Features items={PLUS_FEATURES} strong t={t} />

          <div className="mt-7">
            {plus ? (
              <Notice tone="accent">{t("You have Plus. Everything on this list is switched on.")}</Notice>
            ) : waiting ? (
              <Notice tone="accent" title={t("You are on the list.")}>
                {t("We will email {email} when Plus opens.", { email: user.email })}
              </Notice>
            ) : (
              <>
                <form action={joinWaitlist}>
                  <SubmitButton size="lg" className="w-full" pendingLabel={t("Adding you")}>{t("Join the Plus waitlist")}</SubmitButton>
                </form>
                <p className="mt-3 text-[13px] leading-relaxed text-ink-3">
                  {t("Plus is not on sale yet. Join the list and we will email you when it opens. No payment details needed.")}
                </p>
              </>
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}
