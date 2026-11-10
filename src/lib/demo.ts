/**
 * Sample statement for people who want to look around before connecting a
 * bank. Deterministic per seed, clearly labelled as sample data in the UI,
 * and removable in one tap.
 */

export type DemoRow = { date: string; description: string; amountCents: number };

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const GROCERS = ["Lidl", "Aldi", "Carrefour Express", "Rimi", "Tesco Metro"];
const EATING_OUT = [
  ["Wolt", 1450, 2600],
  ["Uber Eats", 1500, 2900],
  ["Starbucks Coffee", 390, 640],
  ["Cafe Central", 320, 780],
  ["Pizza Napoli Restaurant", 1400, 3200],
  ["Sushi Bar Kumo", 1900, 4100],
  ["McDonald's", 690, 1250],
  ["The Old Town Pub", 900, 2800],
] as const;
const SHOPS = [
  ["Amazon Marketplace", 1200, 8900],
  ["Zara", 2500, 9000],
  ["H&M", 1500, 6000],
  ["IKEA", 2000, 12000],
  ["Decathlon", 1500, 7000],
  ["Zalando", 3000, 11000],
] as const;

/** About six months of believable activity ending on `today`. */
export function generateDemoRows(seed: number, today = new Date()): DemoRow[] {
  const rand = mulberry32(seed);
  const between = (min: number, max: number) => Math.round(min + rand() * (max - min));
  const pick = <T,>(items: readonly T[]) => items[Math.floor(rand() * items.length)];

  const rows: DemoRow[] = [];
  const endY = today.getUTCFullYear();
  const endM = today.getUTCMonth();
  const endD = today.getUTCDate();

  for (let back = 6; back >= 0; back--) {
    const first = new Date(Date.UTC(endY, endM - back, 1));
    const y = first.getUTCFullYear();
    const m = first.getUTCMonth();
    const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const lastDay = back === 0 ? endD : daysInMonth;
    const add = (d: number, description: string, amountCents: number) => {
      if (d <= lastDay) rows.push({ date: iso(y, m, d), description, amountCents });
    };

    // Income and fixed costs.
    add(Math.min(27, daysInMonth), "Salary Northwind Studio", 245000);
    add(1, "Rent - Standing order landlord", -89000);
    add(4, "Vattenfall Electricity", -between(4800, 7400));
    add(6, "Vodafone Mobile", -1999);
    add(8, "Telia Broadband Internet", -3490);
    add(2, "Public transit monthly pass", -4000);
    add(28, "Transfer to savings account", -10000);
    add(15, "Account maintenance fee", -495);

    // Subscriptions, including the kind people forget about.
    add(3, "Netflix.com", -1399);
    add(5, "Spotify Premium", -1099);
    add(9, "Disney+ subscription", -899);
    add(11, "Apple.com/bill iCloud", -299);
    add(12, "MyFitness Gym membership", -3900);
    add(19, "Audible", -999);

    // Groceries two or three times a week.
    for (let d = 2; d <= lastDay; d += between(2, 4)) {
      add(d, pick(GROCERS), -between(1400, 6200));
    }

    // Eating out and coffee: frequent small amounts that add up.
    const meals = between(11, 17);
    for (let i = 0; i < meals; i++) {
      const [name, min, max] = pick(EATING_OUT);
      add(between(1, daysInMonth), name, -between(min, max));
    }

    // Getting around.
    const rides = between(3, 6);
    for (let i = 0; i < rides; i++) add(between(1, daysInMonth), "Bolt ride", -between(520, 1600));

    // Shopping, with a busier month now and then.
    const shops = between(2, back % 3 === 0 ? 6 : 4);
    for (let i = 0; i < shops; i++) {
      const [name, min, max] = pick(SHOPS);
      add(between(1, daysInMonth), name, -between(min, max));
    }

    // Occasional things.
    if (rand() < 0.7) add(between(5, 25), "Apteek Pharmacy", -between(600, 3200));
    if (rand() < 0.6) add(between(5, 25), "Cinema Artis", -between(900, 2400));
    if (rand() < 0.5) add(between(5, 25), "ATM cash withdrawal", -between(2000, 6000));
    if (back === 4 || back === 1) {
      add(between(8, 20), "Ryanair flight", -between(6400, 18900));
      add(between(8, 20), "Booking.com hotel", -between(9000, 24000));
    }
    if (back === 3) add(14, "Amazon Marketplace refund", 3499);
  }

  return rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
