// Portuguese walk-through: signs up with a pt-BR browser, screenshots the main pages and lists likely English leftovers.
// Usage: BASE=http://localhost:3111 CHROME=/usr/bin/google-chrome node scripts/pt-check.mjs  (screenshots go to /tmp/ptcheck)
import puppeteer from "puppeteer-core";
const BASE = process.env.BASE;
const OUT = process.argv[2] ?? "/tmp/ptcheck";
await import("node:fs").then((fs) => fs.mkdirSync(OUT, { recursive: true }));
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || "/usr/bin/google-chrome", args: ["--no-sandbox", "--lang=pt-BR"] });
const page = await browser.newPage();
await page.setExtraHTTPHeaders({ "Accept-Language": "pt-BR,pt;q=0.9" });
await page.setViewport({ width: 1280, height: 900 });
const ENGLISH = /\b(the|your|and|with|you|month|spending|invest|profile|this|what|from)\b/i;
const report = [];
async function visit(path, name, full = true) {
  await page.goto(BASE + path, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
  const lines = (await page.evaluate(() => document.body.innerText)).split("\n").map((s) => s.trim()).filter(Boolean);
  const leftovers = lines.filter((l) => ENGLISH.test(l) && !/Arvo|Vanguard|iShares|Xtrackers|Yahoo|SEC|Xetra|ETF|UCITS|Microsoft|Visa|LVMH|Sanofi|ASML/.test(l));
  report.push(`== ${path}\n` + leftovers.slice(0, 25).join("\n"));
}
await visit("/", "landing");
await page.goto(BASE + "/signup", { waitUntil: "networkidle0" });
await page.type("#name", "Teste Silva");
await page.type("#email", `pt${Date.now()}@example.com`);
await page.type("#password", "uma senha bem longa aqui");
await page.click('input[name="terms"]');
await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), page.click('main form button[type="submit"]')]);
report.push("after signup: " + page.url());
await page.screenshot({ path: `${OUT}/welcome1.png` });
await page.click("main button"); // first goal
await new Promise((r) => setTimeout(r, 300));
await page.screenshot({ path: `${OUT}/welcome2.png`, fullPage: true });
await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), page.click('button[value="sample"]')]);
await visit("/overview", "overview");
await visit("/spending", "spending");
await visit("/portfolio/profile", "profile", false);
await visit("/portfolio", "portfolio");
await visit("/markets", "markets");
await visit("/markets/AAPL", "asset");
await visit("/markets/PETR4.SA", "petr4", false);
await visit("/accounts", "accounts");
await visit("/settings", "settings");
await visit("/plus", "plus", false);
await visit("/privacy", "privacy", false);
// switch to English via the switch and back
await page.goto(BASE + "/settings", { waitUntil: "networkidle0" });
await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {}), page.evaluate(() => [...document.querySelectorAll('button[name="lang"][value="en"]')].find((b) => b.offsetParent)?.click())]);
await new Promise((r) => setTimeout(r, 800));
report.push("after EN switch, h1: " + (await page.$eval("h1", (h) => h.textContent)));
await page.setViewport({ width: 390, height: 844, isMobile: true });
await page.evaluate(() => [...document.querySelectorAll('button[name="lang"][value="pt"]')].find((b) => b.offsetParent)?.click());
await new Promise((r) => setTimeout(r, 1200));
report.push("after PT switch, h1: " + (await page.$eval("h1", (h) => h.textContent)));
await visit("/overview", "overview-mobile", false);
console.log(report.join("\n\n"));
await browser.close();
