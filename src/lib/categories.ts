/**
 * Spending categories and the rule-based categoriser.
 *
 * Rules are plain keyword patterns over the bank's description text. They are
 * deliberately transparent: a person can always override a category by hand,
 * and that choice is locked so later syncs never overwrite it.
 */

import { msg } from "./i18n/core";

export type CategoryGroup = "needs" | "wants" | "income" | "savings" | "neutral";

export const CATEGORIES = {
  housing: { label: msg("Rent & housing"), group: "needs" },
  utilities: { label: msg("Bills & utilities"), group: "needs" },
  groceries: { label: msg("Groceries"), group: "needs" },
  transport: { label: msg("Transport"), group: "needs" },
  health: { label: msg("Health"), group: "needs" },
  education: { label: msg("Education"), group: "needs" },
  fees: { label: msg("Bank fees & interest"), group: "needs" },
  dining: { label: msg("Eating out"), group: "wants" },
  shopping: { label: msg("Shopping"), group: "wants" },
  subscriptions: { label: msg("Subscriptions"), group: "wants" },
  entertainment: { label: msg("Leisure"), group: "wants" },
  travel: { label: msg("Travel"), group: "wants" },
  cash: { label: msg("Cash withdrawals"), group: "wants" },
  other: { label: msg("Other"), group: "wants" },
  income: { label: msg("Income"), group: "income" },
  savings: { label: msg("Savings & investments"), group: "savings" },
  transfers: { label: msg("Transfers"), group: "neutral" },
} satisfies Record<string, { label: string; group: CategoryGroup }>;

export type Category = keyof typeof CATEGORIES;

export const CATEGORY_KEYS = Object.keys(CATEGORIES) as Category[];

export function isCategory(value: unknown): value is Category {
  return typeof value === "string" && value in CATEGORIES;
}

export function categoryLabel(category: string): string {
  return isCategory(category) ? CATEGORIES[category].label : msg("Other");
}

/** True for categories that count as day-to-day spending. */
export function isSpend(category: string): boolean {
  if (!isCategory(category)) return true;
  const group = CATEGORIES[category].group;
  return group === "needs" || group === "wants";
}

const INCOME =
  /\b(salary|payroll|wages?|paycheck|pay ?slip|ordenado|vencimento|salario|gehalt|lohn|nomina|salaire|paie|stipend|scholarship|bolsa|pension|dividend|palk)\b/i;

// Order matters: the first matching rule wins. Specific merchants come before
// generic words, and anything that could also look like a transfer comes first.
const RULES: [Category, RegExp][] = [
  ["housing", /\b(rent|landlord|mortgage|renda|aluguel|miete|loyer|alquiler|hipoteca|housing|uur)\b/i],
  [
    "subscriptions",
    /\b(netflix|spotify|disney\+?|hbo|prime video|amazon prime|apple\.com\/bill|icloud|youtube premium|google one|google storage|dropbox|notion|chatgpt|openai|claude\.ai|anthropic|adobe|microsoft 365|office 365|playstation|xbox|nintendo|audible|patreon|duolingo|linkedin premium|tinder|bumble|gym|fitness|basic-?fit|puregym|mcfit|myfitness|membership|subscription)\b/i,
  ],
  [
    "groceries",
    /\b(lidl|aldi|tesco|sainsbury'?s?|asda|morrisons|waitrose|carrefour|auchan|continente|pingo doce|mercadona|rewe|edeka|kaufland|penny|netto|albert heijn|jumbo|rimi|selver|prisma|maxima|co-?op|spar|intermarche|leclerc|whole foods|trader joe'?s?|walmart|kroger|safeway|costco|supermarket|supermercado|grocer(y|ies)|minipreco)\b/i,
  ],
  [
    "dining",
    /\b(restaurant|restaurante|ristorante|cafe|coffee|starbucks|costa|pret|mcdonald'?s?|burger king|kfc|domino'?s?|pizza|uber ?eats|deliveroo|just ?eat|glovo|bolt food|wolt|doordash|grubhub|bar|pub|bistro|kebab|sushi|bakery|padaria|pastelaria|nando'?s?|five guys|chipotle|taqueria|tasca|brasserie|kohvik)\b/i,
  ],
  [
    "travel",
    /\b(ryanair|easyjet|wizz ?air|tap air|tap portugal|lufthansa|klm|air france|british airways|iberia|vueling|airbaltic|finnair|booking\.com|airbnb|hotel|hostel|expedia|skyscanner|trainline|flixbus|tallink|viking line|airlines?|flight)\b/i,
  ],
  [
    "transport",
    /\b(uber|bolt|lyft|taxi|free ?now|metro|train|rail|renfe|sncf|deutsche bahn|comboios|tfl|transport|bus|carris|navegante|fuel|petrol|shell|bp|repsol|galp|esso|totalenergies|parking|toll|via verde|lime|tier|voi|elron|public transit)\b/i,
  ],
  [
    "shopping",
    /\b(amazon|amzn|zara|h&m|uniqlo|primark|ikea|decathlon|fnac|worten|media ?markt|apple store|nike|adidas|zalando|asos|shein|temu|aliexpress|ebay|el corte ingles|john lewis|argos|target|best buy|etsy)\b/i,
  ],
  [
    "health",
    /\b(pharmacy|farmacia|apotheke|apteek|boots|doctor|dentist|dental|clinic|clinica|hospital|medical|optician|physio|cvs|walgreens)\b/i,
  ],
  [
    "entertainment",
    /\b(cinema|theatre|theater|concert|ticketmaster|eventbrite|museum|steam|bowling|festival|bet365|betfair|casino)\b/i,
  ],
  ["education", /\b(tuition|university|universidade|college|udemy|coursera|books?|bookshop|school|propinas?)\b/i],
  [
    "utilities",
    /\b(electric(ity)?|energy|energia|edp|endesa|iberdrola|e\.?on|vattenfall|british gas|octopus|water|aguas|gas|internet|broadband|vodafone|meo|nos|telekom|o2|orange|movistar|telia|elisa|tele2|verizon|at&t|t-mobile|comcast|mobile|council tax|insurance|seguros?|versicherung|allianz|axa)\b/i,
  ],
  ["fees", /\b(fees?|commission|comissao|interest charged|overdraft|imposto do selo|stamp duty|account maintenance)\b/i],
  ["cash", /\b(atm|cash withdrawal|levantamento|multibanco|bargeld|withdrawal)\b/i],
  [
    "savings",
    /\b(savings?|investment|trading ?212|trade republic|degiro|interactive brokers|etoro|xtb|scalable|vanguard|lightyear|broker|pension contribution|ppr|isa)\b/i,
  ],
  ["transfers", /\b(transfer|trf|revolut|wise|paypal|mb ?way|bizum|venmo|zelle|standing order|own account|internal)\b/i],
];

/** Pick a category from the description and the sign of the amount. */
export function categorize(description: string, amountCents: number): Category {
  // Strip accents so "Café" and "CAFE" match the same plain-ASCII rule.
  const text = description
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[*_]+/g, " ")
    .replace(/\s+/g, " ");

  if (amountCents > 0) {
    if (INCOME.test(text)) return "income";
    for (const [category, pattern] of RULES) {
      if (pattern.test(text)) {
        // Money back from a shop is a refund in that category.
        return category;
      }
    }
    return "income";
  }

  for (const [category, pattern] of RULES) {
    if (pattern.test(text)) return category;
  }
  return "other";
}

const NOISE =
  /\b(card payment( to)?|direct debit( to)?|payment( to)?|purchase( at)?|pos|compra|pagamento|contactless|visa|mastercard|debit|credit|ref[:.]?\s*\S+|sepa|www\.|\.com|\.co\.uk|ltd|gmbh|s\.?a\.?|inc)\b/gi;

/** A tidy display name from a raw statement line. */
export function cleanMerchant(description: string): string {
  let text = description
    .normalize("NFKC")
    .replace(/[*#_|/]+/g, " ")
    .replace(NOISE, " ")
    .replace(/\b\d{4,}\b/g, " ")
    .replace(/\b\d{1,2}[/.-]\d{1,2}([/.-]\d{2,4})?\b/g, " ")
    .replace(/(^|\s)[-.,:;]+(?=\s|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) text = description.trim();
  const words = text.split(" ").slice(0, 4);
  return words
    .map((word) => {
      const shouting = word === word.toUpperCase();
      const quiet = word === word.toLowerCase();
      if (shouting && word.length <= 3) return word; // H&M, KFC, BP
      if (shouting || quiet) return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      return word; // already mixed case: McDonald's, iCloud
    })
    .join(" ")
    .slice(0, 48);
}
