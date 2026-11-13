"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LANG_COOKIE, isLang } from "@/lib/i18n/core";
import { getUser } from "@/lib/auth";
import { q } from "@/lib/db";

export async function setLang(formData: FormData) {
  const lang = formData.get("lang");
  if (!isLang(lang)) return;
  (await cookies()).set(LANG_COOKIE, lang, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  const user = await getUser();
  if (user) await q("UPDATE users SET lang = $1 WHERE id = $2", [lang, user.id]);
  revalidatePath("/", "layout");
}
