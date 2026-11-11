# Arvo

Arvo helps people start investing from the beginning: it shows where their money goes, works out what they can
afford to set aside, finds their investor profile, and builds a model portfolio that fits. *Arvo* is Finnish for "value".

It is a responsive web app that installs to the home screen on phones (PWA) and runs in any modern browser.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

No setup is needed. With no environment variables Arvo uses an embedded Postgres database (stored in `.arvo-data/`),
statement import, sample data, and calculated insights. Create an account, choose "Look around with sample data",
and every screen fills in.

```bash
npm test           # unit tests for the money logic (59 tests)
npm run e2e        # builds, starts the app and drives a real browser through every flow on desktop, phone and tablet
npm run lint
```

`npm run e2e` needs Chrome (`CHROME=/path/to/chrome` if it is not at `/usr/bin/google-chrome`).

## What is in it

| Area | What it does | Code |
| --- | --- | --- |
| Accounts | Sign up, sign in, password reset, rate limiting, sessions, account deletion, data download | `src/lib/auth.ts`, `src/lib/actions/auth.ts`, `src/lib/actions/settings.ts` |
| Transactions | Bank connection (Plaid), CSV import from any bank, sample data, duplicate protection | `src/lib/plaid.ts`, `src/lib/csv.ts`, `src/lib/demo.ts`, `src/lib/data.ts` |
| Spending | Categories, monthly totals, regular payments, the transaction sheet, Excel export | `src/lib/categories.ts`, `src/lib/spending.ts`, `src/app/api/export` |
| Savings insights | Calculated from transactions; rewritten by AI when a key is set | `src/lib/insights.ts`, `src/lib/ai.ts` |
| Investor profile | Ten questions scored into capacity and tolerance, with hard limits | `src/lib/risk.ts` |
| Monthly amount | A suggestion from income, spending, safety net and debt, with reasons | `src/lib/recommend.ts` |
| Portfolio | Model portfolios per profile, exact weights, projection with a range | `src/lib/portfolio.ts` |
| Plans | Free and Plus tiers, a Plus waitlist (payments are not switched on), and an admin page | `src/lib/plan.ts`, `src/app/(app)/plus`, `src/app/(app)/admin` |
| Waitlist | Public email sign-up on the landing page and `/waitlist`, with `?src=` tracking, listed in the admin page | `src/lib/actions/waitlist.ts`, `src/app/waitlist` |
| Welcome | Two questions: what the person wants, then how to start (statement, investor profile, markets or sample data) | `src/components/welcome-form.tsx`, `src/lib/goals.ts` |
| Markets | Search, quotes, charts, company details, news, and a fit rating per profile | `src/lib/market/*` |

All the money logic is plain TypeScript with no framework or database in it, which is why it can be unit-tested.

## Environment variables

See [`.env.example`](.env.example). In production you need `DATABASE_URL`, `APP_SECRET` and `NEXT_PUBLIC_APP_URL`.
Everything else switches on an optional feature:

| Variable | Switches on | Without it |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | AI-written insights and asset explanations | Calculated insights (always shown first, replaced when AI answers) |
| `PLAID_CLIENT_ID`, `PLAID_SECRET` | "Connect your bank" | Statement import and sample data |
| `RESEND_API_KEY` | Password reset emails | The reset link is printed to the server log |
| `ADMIN_EMAILS` | The `/admin` page for the listed accounts | Nobody can open `/admin` |
| `MARKET_DATA=sample` | Forces sample prices | Live data, with an automatic, labelled fallback to sample prices |

## Deploy (Vercel)

1. Push this folder to a GitHub repository.
2. In Vercel: **Add New Project**, import the repository. No build settings to change.
3. **Storage**: add a Postgres database (Neon from the Marketplace). It sets `DATABASE_URL` for you. Tables are created on first request.
4. **Environment Variables**: add `APP_SECRET` (`openssl rand -base64 48`), `NEXT_PUBLIC_APP_URL` (your domain), and any optional keys.
5. Deploy. For bank connections, add `https://your-domain/accounts/return` as an allowed redirect URI in the Plaid dashboard.

### Deploy (Render + Neon, free)

1. Create a free Postgres database on [Neon](https://neon.tech) in **AWS Europe Central 1 (Frankfurt)** and copy the
   pooled connection string (the host contains `-pooler`).
2. In Render choose **New, Blueprint**, pick the repository, and apply. `render.yaml` creates the web service in
   Frankfurt, generates `APP_SECRET`, and asks for `DATABASE_URL`: paste the Neon string there.
3. Tables are created on the first request.

The free Render plan sleeps after 15 minutes without visitors (the first page then takes about a minute). The Neon
free database does not expire.

Any Node host works the same way: `npm run build && npm start` with the variables set.

## Before you launch to the public

These are not code tasks; they are things only the owner of the product can do.

1. **Regulation.** Arvo is built as education: profiles, model portfolios and "fit" ratings come from fixed rules and
   are worded as suitability, not as buy or sell recommendations. Whether that is enough depends on the country you
   launch in (MiFID II in the EU). Have a lawyer who knows financial regulation review the product and the three
   legal pages before you market it.
2. **Legal pages.** `/terms`, `/privacy` and `/risk` are complete drafts with placeholders for your company. Set
   `NEXT_PUBLIC_LEGAL_ENTITY`, `NEXT_PUBLIC_LEGAL_ADDRESS` and `NEXT_PUBLIC_CONTACT_EMAIL`, then have them reviewed.
3. **Market data licence.** Live prices come from Yahoo Finance's public web endpoints (`src/lib/market/yahoo.ts`). `/api/markets/status` and the admin page show whether each part answers from the server.
   Yahoo has no official public API and its terms do not allow commercial use, and it rate-limits servers. Before
   charging money or growing, replace `src/lib/market/yahoo.ts` with a licensed provider (Twelve Data, EODHD,
   Financial Modeling Prep). Nothing else in the app changes: everything goes through `src/lib/market/index.ts`.
4. **Bank connection.** Create a Plaid account, test in sandbox, then apply for production access (Plaid reviews
   each app). Sign a data processing agreement with them.
5. **Name.** Check the "Arvo" trademark and domain in your launch countries. Other finance products use similar names.
6. **Email verification.** Sign-up does not yet confirm that the email address belongs to the person. Add it once
   `RESEND_API_KEY` is configured (the reset flow in `src/lib/actions/auth.ts` is the pattern to copy).
7. **Content Security Policy.** Security headers are set in `next.config.ts`; a strict CSP is not, because it has to
   be tuned to your final domain and to Plaid's script.

## How it was verified

- 59 unit tests cover formatting, categorisation, statement parsing (English, Portuguese, German, Revolut-style
  files), spending maths, insights, risk scoring, the monthly suggestion, portfolio construction and the fit rating.
- The browser test signs up, imports a statement twice, loads sample data, filters and recategorises transactions,
  downloads the Excel file, completes the questionnaire, checks that weights add up to 100, toggles the companies
  sleeve, searches markets, opens assets, switches chart ranges, uses the watchlist, signs out and in, and deletes
  the account. It runs at desktop, phone and tablet sizes and fails on any console error, server error or sideways
  scrolling. It passes on the embedded database and on PostgreSQL 18.
- Not verified, because they need accounts that only the owner can create: live Yahoo data, Plaid, the AI calls and
  email delivery. Each has a fallback, and each is isolated in one file.

## Design

Cool mist paper, spruce ink and one warm cloudberry accent. Figures are set in Newsreader, the interface in
Schibsted Grotesk; both are bundled, so no font request leaves the site. Light and dark themes share one set of
tokens in `src/app/globals.css`. Chart colours were checked for colour-blind separation in both themes.
