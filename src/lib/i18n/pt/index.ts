import { site } from "./site";
import { auth } from "./auth";
import { app } from "./app";
import { money } from "./money";
import { pages } from "./pages";
import { more } from "./more";
import { universe } from "./universe";

/** Brazilian Portuguese, keyed by the English text. Missing keys fall back to English. */
export const pt: Record<string, string> = { ...site, ...auth, ...app, ...money, ...pages, ...more, ...universe };
