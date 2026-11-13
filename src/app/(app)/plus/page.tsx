import { getI18n, titled } from "@/lib/i18n/server";
import type { T } from "@/lib/i18n/core";
import { msg } from "@/lib/i18n/core";
import { Check } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { q1 } from "@/lib/db";
import { joinWaitlist, setPlusPrice } from "@/lib/actions/plan";
import { FREE_FEATURES, FREE_HISTORY_MONTHS, PLUS_FEATURES, PLUS_PRICE, priceOptions } from "@/lib/plan";
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
  const waiting = plus ? null : await q1<{ price_cents: number | null }>("SELECT price_cents FROM plan_interest WHERE user_id = $1", [user.id]);
  const answered = waiting?.price_cents ?? null;
  const priceText = (cents: number) => (cents === 0 ? t("I would not pay for it") : t("{amount} a month", { amount: f.money(cents, user.currency) }));

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
          {user.currency === "EUR" ? (
            <p className="figure mt-3 text-[40px] leading-none text-ink">
              {PLUS_PRICE}
              <span className="font-sans text-[15px] font-normal text-ink-3"> {t("a month")}</span>
            </p>
          ) : (
            <p className="mt-3 text-[15px] text-ink-2">{t("Price in your currency to be decided. Your answer below helps set it.")}</p>
          )}
          <p className="mt-1.5 text-[13.5px] text-ink-3">{t("Cancel whenever you want")}</p>
          <Features items={PLUS_FEATURES} strong t={t} />

          <div className="mt-7">
            {plus ? (
              <Notice tone="accent">{t("You have Plus. Everything on this list is switched on.")}</Notice>
            ) : waiting ? (
              <div className="space-y-4">
                <Notice tone="accent" title={t("You are on the list.")}>
                  {t("We will email {email} when Plus opens.", { email: user.email })}
                </Notice>
                <form action={setPlusPrice}>
                  <p className="text-[14.5px] font-medium text-ink">{t("One honest question: what would you pay for Plus each month?")}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {priceOptions(user.currency).map((cents) => (
                      <button
                        key={cents}
                        type="submit"
                        name="price"
                        value={cents}
                        aria-pressed={answered === cents}
                        className={cx(
                          "h-10 rounded-full border px-4 text-[14px] font-medium transition-colors",
                          answered === cents ? "border-brand bg-brand text-on-brand" : "border-line-strong bg-raised text-ink hover:border-brand hover:bg-brand-soft",
                        )}
                      >
                        {priceText(cents)}
                      </button>
                    ))}
                  </div>
                  {answered !== null ? <p className="mt-2 text-[13px] text-ink-3">{t("Thank you. You can change your answer at any time.")}</p> : null}
                </form>
              </div>
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
