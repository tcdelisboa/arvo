"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireUser } from "../auth";
import { q } from "../db";
import { isPlan, priceOptions } from "../plan";

/** Record that this person wants Plus. Payments are not open yet. */
export async function joinWaitlist(): Promise<void> {
  const user = await requireUser();
  await q("INSERT INTO plan_interest (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING", [user.id]);
  revalidatePath("/plus");
  revalidatePath("/admin");
}

/** What this person says they would pay for Plus each month, in their own currency. */
export async function setPlusPrice(formData: FormData): Promise<void> {
  const user = await requireUser();
  const cents = Number(formData.get("price"));
  if (!priceOptions(user.currency).includes(cents)) return;
  await q(
    `INSERT INTO plan_interest (user_id, price_cents, price_currency) VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO UPDATE SET price_cents = EXCLUDED.price_cents, price_currency = EXCLUDED.price_currency`,
    [user.id, cents, user.currency],
  );
  revalidatePath("/plus");
  revalidatePath("/admin");
}

/** Admin only: grant or remove Plus for one account. */
export async function setUserPlan(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const plan = formData.get("plan");
  if (!userId || !isPlan(plan)) return;
  await q("UPDATE users SET plan = $1 WHERE id = $2", [plan, userId]);
  revalidatePath("/", "layout");
}
