// End-to-end smoke test: drives a real browser through the whole product.
// Usage: BASE=http://localhost:3111 CHROME=/usr/bin/google-chrome node scripts/e2e.mjs [outDir]
import puppeteer from "puppeteer-core";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = process.argv[2] ?? "/tmp/arvo-shots";
await mkdir(OUT, { recursive: true });

const problems = [];
const note = (msg) => { problems.push(msg); console.log("  PROBLEM:", msg); };
const ok = (msg) => console.log("  ok:", msg);

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME ?? "/usr/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--hide-scrollbars"],
});

async function run(label, viewport) {
  console.log(`\n== ${label} ==`);
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport(viewport);
  page.on("pageerror", (e) => note(`[${label}] page error: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/favicon|status of 40[134]/.test(m.text())) note(`[${label}] console: ${m.text().slice(0, 300)}`);
  });
  page.on("response", (r) => { if (r.status() >= 500) note(`[${label}] ${r.status()} ${r.url()}`); });

  const shot = async (name, full = true) => {
    await new Promise((r) => setTimeout(r, 500));
    await page.screenshot({ path: path.join(OUT, `${label}-${name}.png`), fullPage: full });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 1) note(`[${label}] ${name}: horizontal overflow of ${overflow}px`);
  };
  const go = async (url) => { await page.goto(BASE + url, { waitUntil: "networkidle0" }); };
  const clickText = async (text, selector = "button, a") => {
    const handle = await page.evaluateHandle((t, sel) => [...document.querySelectorAll(sel)].find((el) => el.textContent.trim().includes(t) && el.offsetParent !== null), text, selector);
    const el = handle.asElement();
    if (!el) throw new Error(`No visible element with text "${text}"`);
    // Centre it first so a fixed bar (the phone tab bar) never sits on top of it.
    await el.evaluate((node) => node.scrollIntoView({ block: "center" }));
    await el.click();
  };
  const text = () => page.evaluate(() => document.body.innerText);
  const expectText = async (needle, what) => {
    await page
      .waitForFunction((n) => document.body.innerText.includes(n), { timeout: 8000 }, needle)
      .then(() => ok(what), () => note(`[${label}] expected "${needle}" (${what})`));
  };

  // run-e2e.sh starts each run on an empty database and lists the desktop and
  // phone accounts in ADMIN_EMAILS. The tablet account stays an ordinary one.
  const email = `e2e-${label}@example.com`;
  const admin = label !== "tablet";
  const password = "a long enough passphrase";

  // Landing
  await go("/");
  await shot("01-landing");
  await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
  await shot("02-landing-dark", false);
  await page.evaluate(() => { document.documentElement.dataset.theme = "light"; });

  // Sign-up validation, then success
  await go("/signup");
  await clickText("Create account", "button[type=submit]");
  await page.waitForSelector("[role=alert]");
  await expectText("Enter your name", "sign-up shows field errors");
  await shot("03-signup-errors");
  await page.type("#name", "Thor Tester");
  await page.type("#email", email);
  await page.type("#password", password);
  await page.click("input[name=terms]");
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), clickText("Create account", "button[type=submit]")]);
  page.url().endsWith("/welcome") ? ok("sign-up lands on welcome") : note(`[${label}] after sign-up at ${page.url()}`);
  await shot("04-welcome");

  // Empty state first
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), clickText("Skip for now", "button")]);
  await expectText("Start by bringing in your transactions", "empty overview guides the person");
  await shot("05-overview-empty");
  await go("/spending");
  await expectText("Nothing to show yet", "empty spending state");
  await go("/portfolio");
  await expectText("First, find out what kind of investor you are", "empty portfolio state");
  await shot("06-portfolio-empty");

  // CSV import
  await go("/accounts");
  const csv = "Data Mov.;Descrição;Débito;Crédito\n03/10/2026;COMPRA PINGO DOCE;45,30;\n25/10/2026;ORDENADO EMPRESA;;1.850,00\n28/10/2026;NETFLIX.COM;13,99;\n";
  const file = path.join(OUT, "statement.csv");
  await writeFile(file, csv);
  const input = await page.$("input[type=file]");
  await input.uploadFile(file);
  await page.type("#name", "My bank");
  await shot("07a-accounts-before-import");
  await clickText("Import statement", "button");
  await page.waitForFunction(() => document.body.innerText.includes("Imported 3 transactions"), { timeout: 15000 }).then(() => ok("CSV import of 3 rows"), () => note(`[${label}] CSV import message missing`));
  // Importing the same file again must not duplicate.
  const input2 = await page.$("input[type=file]");
  await input2.uploadFile(file);
  await page.type("#name", "My bank");
  await clickText("Import statement", "button");
  await page.waitForFunction(() => document.body.innerText.includes("Imported 0 transactions"), { timeout: 15000 }).then(() => ok("re-import creates no duplicates"), () => note(`[${label}] duplicate protection failed`));
  await shot("07-accounts");

  // Sample data
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), clickText("Load sample data", "button")]);
  await expectText("You are looking at sample data", "sample data banner");
  await expectText("Money in and out", "overview has the monthly chart");
  await page.waitForSelector("svg[role=img]");
  await shot("08-overview");
  await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
  await shot("09-overview-dark");
  await page.evaluate(() => { document.documentElement.dataset.theme = "light"; });

  // Spending
  await go("/spending");
  await expectText("Ways to save", "insights panel");
  await expectText("Regular payments", "recurring payments");
  await shot("10-spending");
  await go("/spending?cat=subscriptions#transactions");
  await expectText("Netflix", "category filter shows subscriptions");
  const before = await page.evaluate(() => document.body.innerText.match(/([\d,]+) transactions?/)?.[1]);
  // Recategorise the first row and confirm it sticks.
  const select = await page.evaluateHandle(() => [...document.querySelectorAll("select[aria-label^='Category for']")].find((el) => el.offsetParent !== null));
  await select.asElement().select("entertainment");
  await new Promise((r) => setTimeout(r, 1500));
  await go("/spending?cat=subscriptions#transactions");
  const after = await page.evaluate(() => document.body.innerText.match(/([\d,]+) transactions?/)?.[1]);
  Number(after?.replace(",", "")) === Number(before?.replace(",", "")) - 1 ? ok("changing a category sticks") : note(`[${label}] category change: ${before} -> ${after}`);
  await go("/spending?q=lidl");
  await expectText("Lidl", "search finds a merchant");
  await go("/spending?m=" + (await page.evaluate(() => new Date().toISOString().slice(0, 7))));
  await shot("11-spending-month", false);

  // Free plan: the overall picture is there, the savings, old months and export are not.
  await go("/spending");
  await expectText("are part of Plus", "free plan shows the savings teaser");
  await expectText("Export to Excel with Plus", "free plan points export to Plus");
  await expectText("Free shows this month and the 3 before it", "free plan explains the history limit");
  const freeView = await page.evaluate(() => ({
    saveBadges: document.body.innerText.includes("Save about"),
    months: document.querySelectorAll("nav[aria-label='Period'] a, [data-period] a").length,
  }));
  !freeView.saveBadges ? ok("free plan hides the individual savings") : note(`[${label}] free plan shows savings details`);
  const tooOld = await page.evaluate(() => { const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - 5); return d.toISOString().slice(0, 7); });
  await go("/spending?m=" + tooOld + "&tm=" + tooOld);
  await expectText("Spent in a typical month", "free plan cannot open an older month by address");
  const freeExport = await page.evaluate(async () => (await fetch("/api/export")).status);
  freeExport === 403 ? ok("export refuses the free plan") : note(`[${label}] free export status: ${freeExport}`);
  await go("/overview");
  await expectText("to save with Plus", "overview points savings to Plus");

  // Plus page and waitlist
  await go("/plus");
  await expectText("Plus is not on sale yet", "plus page is honest that payments are off");
  await shot("11a-plus");
  await clickText("Join the Plus waitlist", "button");
  await expectText("You are on the list", "waitlist confirmed");
  await shot("11b-plus-waiting", false);

  // Admin: only for the listed accounts
  await go("/admin");
  if (admin) {
    await expectText("Asked for Plus", "admin lists the waitlist request");
    await expectText("Own statement", "admin shows who imported a statement");
    await shot("11c-admin");
    await clickText("Give Plus", "button");
    await expectText("Remove Plus", "admin can grant Plus");
    await shot("11d-admin-plus", false);
    await go("/spending");
    await expectText("Save about", "plus shows every way to save");
    const plusView = await page.evaluate(() => document.body.innerText.includes("are part of Plus") || document.body.innerText.includes("Free shows this month"));
    !plusView ? ok("plus has no locked parts") : note(`[${label}] plus still shows free limits`);
    await go("/spending?m=" + tooOld);
    await expectText("Spent in " + new Date(tooOld + "-01").toLocaleString("en-GB", { month: "long", timeZone: "UTC" }), "plus opens older months");
    await shot("11e-spending-plus");
    const exported = await page.evaluate(async () => {
      const r = await fetch("/api/export");
      const b = await r.arrayBuffer();
      const head = new Uint8Array(b.slice(0, 2));
      return { status: r.status, type: r.headers.get("content-type"), size: b.byteLength, zip: head[0] === 0x50 && head[1] === 0x4b };
    });
    exported.status === 200 && exported.zip && exported.size > 5000 ? ok(`Excel export (${exported.size} bytes)`) : note(`[${label}] export: ${JSON.stringify(exported)}`);
    await go("/plus");
    await expectText("You have Plus", "plus page confirms the plan");
  } else {
    await expectText("This page doesn't exist", "admin is hidden from ordinary accounts");
  }
  const mine = await page.evaluate(async () => { const r = await fetch("/api/me"); const j = await r.json(); return { status: r.status, n: j.transactions.length, hasHash: JSON.stringify(j).includes("scrypt") }; });
  mine.status === 200 && mine.n > 200 && !mine.hasHash ? ok(`data download (${mine.n} transactions, no password hash)`) : note(`[${label}] data download: ${JSON.stringify(mine)}`);

  // Investor profile
  await go("/portfolio/profile");
  await clickText("Continue", "button");
  await expectText("Enter your age", "questionnaire validates each step");
  await page.type("#age", "24");
  const income = await page.$eval("#monthlyIncome", (el) => el.value);
  // Sample salary 2,450 plus the 1,850 from the imported statement, averaged over three months.
  income === "3067" ? ok("income pre-filled from transactions") : note(`[${label}] income prefill was "${income}"`);
  const choose = async (name, value) => page.evaluate((n, v) => document.querySelector(`input[name="${n}"][value="${v}"]`).click(), name, value);
  await choose("stability", "high");
  await shot("12-profile-step1");
  await clickText("Continue", "button");
  await choose("buffer", "3to6"); await choose("debt", "no");
  await clickText("Continue", "button");
  await choose("horizon", "gt20"); await choose("goal", "growth");
  await clickText("Continue", "button");
  await choose("reaction", "hold"); await choose("tradeoff", "c"); await choose("experience", "some");
  await shot("13-profile-step4");
  await clickText("Continue", "button");
  await expectText("Arvo suggests investing", "recommendation shown");
  const suggested = await page.$eval("#monthly", (el) => el.value);
  Number(suggested) > 0 ? ok(`suggested monthly amount: ${suggested}`) : note(`[${label}] no suggested amount`);
  await shot("14-profile-amount");
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), clickText("See my portfolio", "button")]);
  await expectText("Growth", "profile result is Growth");
  await expectText("VWCE", "portfolio lists the global fund");
  await expectText("What it could become", "projection present");
  await page.waitForSelector("svg[role=img]");
  await shot("15-portfolio");
  const weights = await page.evaluate(() => [...document.querySelectorAll("summary .figure")].map((el) => parseFloat(el.textContent)));
  Math.abs(weights.reduce((a, b) => a + b, 0) - 100) < 0.01 ? ok(`weights add up to 100 (${weights.join(", ")})`) : note(`[${label}] weights: ${weights}`);
  await clickText("Add individual companies", "button");
  await page.waitForFunction(() => document.body.innerText.includes("Microsoft"), { timeout: 15000 }).then(() => ok("companies sleeve toggles on"), () => note(`[${label}] companies toggle failed`));
  await shot("16-portfolio-companies", false);
  await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
  await shot("17-portfolio-dark", false);
  await page.evaluate(() => { document.documentElement.dataset.theme = "light"; });

  // Markets
  await go("/markets");
  await expectText("Sample prices", "sample data is labelled");
  await expectText("Good fit", "fit badges shown");
  await shot("18-markets", false);
  await page.type("input[role=combobox]", "micro");
  await page.waitForSelector("[role=option]", { timeout: 10000 }).then(() => ok("search suggestions appear"), () => note(`[${label}] no search suggestions`));
  await shot("19-markets-search", false);
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), page.keyboard.press("Enter")]);
  page.url().includes("/markets/MSFT") ? ok("search opens the asset page") : note(`[${label}] search navigated to ${page.url()}`);
  await expectText("Does it fit you?", "fit panel");
  await page.waitForSelector("svg[role=img]");
  await shot("20-asset");
  await clickText("5 years", "button");
  await new Promise((r) => setTimeout(r, 1200));
  await expectText("over 5 years", "range switch reloads the chart");
  await clickText("Watch", "button");
  await page.waitForFunction(() => document.body.innerText.includes("Watching"), { timeout: 10000 }).then(() => ok("watchlist toggle"), () => note(`[${label}] watch failed`));
  // The button updates optimistically; give the server a moment to save before leaving the page.
  await page.waitForNetworkIdle({ idleTime: 600 });
  await go("/markets");
  await expectText("Watching", "watchlist appears on markets");
  await go("/markets/VWCE.DE");
  await expectText("core of a portfolio", "global fund rated as a core holding");
  await shot("21-asset-fund", false);
  await go("/markets/NOPE123");
  await expectText("This page doesn't exist", "unknown symbol shows the not-found page");

  // Settings and sign out / in
  await go("/settings");
  await shot("22-settings");
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), clickText("Sign out", "button")]);
  const guarded = await page.goto(BASE + "/overview", { waitUntil: "networkidle0" });
  page.url().includes("/login") ? ok("signed-out visitors are sent to sign in") : note(`[${label}] guard: ${page.url()} ${guarded.status()}`);
  const api = await page.evaluate(async () => (await fetch("/api/export")).status);
  api === 401 ? ok("export refuses signed-out requests") : note(`[${label}] export status when signed out: ${api}`);
  await page.type("#email", email);
  await page.type("#password", "wrong password here");
  await clickText("Sign in", "button[type=submit]");
  await page.waitForFunction(() => document.body.innerText.includes("don't match"), { timeout: 15000 }).then(() => ok("wrong password is rejected"), () => note(`[${label}] wrong password not rejected`));
  await shot("23-login-error");
  await page.$eval("#password", (el) => { el.value = ""; });
  await page.type("#password", password);
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), clickText("Sign in", "button[type=submit]")]);
  page.url().endsWith("/overview") ? ok("sign-in lands on overview") : note(`[${label}] after sign-in at ${page.url()}`);

  // Legal pages
  for (const p of ["/terms", "/privacy", "/risk"]) {
    const r = await page.goto(BASE + p, { waitUntil: "networkidle0" });
    if (r.status() !== 200) note(`[${label}] ${p} -> ${r.status()}`);
  }
  await shot("24-risk", false);

  // Delete the account
  await go("/settings");
  await page.type("#delete-password", password);
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), clickText("Delete my account", "button")]);
  await expectText("were deleted", "account deletion confirmed");
  await page.type("#email", email);
  await page.type("#password", password);
  await clickText("Sign in", "button[type=submit]");
  await page.waitForFunction(() => document.body.innerText.includes("don't match"), { timeout: 15000 }).then(() => ok("deleted account can no longer sign in"), () => note(`[${label}] deleted account still signs in`));

  await context.close();
}

try {
  await run("desktop", { width: 1440, height: 900 });
  await run("mobile", { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await run("tablet", { width: 820, height: 1180, deviceScaleFactor: 1, hasTouch: true });
} catch (error) {
  note(`fatal: ${error.stack ?? error}`);
} finally {
  await browser.close();
}

console.log(`\n${problems.length ? `${problems.length} PROBLEM(S)` : "ALL CHECKS PASSED"}`);
process.exit(problems.length ? 1 : 0);
