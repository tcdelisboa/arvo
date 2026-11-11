import type { Metadata } from "next";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Privacy notice" };

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy notice</h1>
      <p className="lead">What Arvo knows about you, why, and how to make it forget. Last updated {LEGAL.updated}.</p>

      <h2>Who is responsible</h2>
      <p>
        The controller of your personal data is {LEGAL.entity}, {LEGAL.address}. Contact: {LEGAL.contact}.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account details:</strong> your name, email address and a one-way hash of your password. We never store the password itself.</li>
        <li><strong>Transactions:</strong> date, description, amount and category of the transactions you import or connect, and the names of the accounts they belong to.</li>
        <li><strong>Investor profile:</strong> your answers to the questionnaire (age, income, time frame, attitude to risk) and the monthly amount you choose.</li>
        <li><strong>Watchlist:</strong> the shares and funds you choose to follow.</li>
        <li><strong>Plan and use:</strong> which plan you are on, whether you asked to be told when Plus opens, and the dates on which you used Arvo. We use the dates to see whether people come back, not what you looked at.</li>
        <li><strong>Technical data:</strong> one session cookie that keeps you signed in, and your IP address in short-lived security logs that limit repeated sign-in attempts.</li>
      </ul>
      <p>We do not use advertising or tracking cookies, and we do not sell or rent personal data.</p>

      <h2>Why we use it, and on what basis</h2>
      <ul>
        <li>To provide Arvo to you: showing your spending, profile and portfolio (performance of our contract with you).</li>
        <li>To keep accounts secure and prevent abuse (our legitimate interest).</li>
        <li>To meet legal obligations that apply to us.</li>
      </ul>

      <h2>Who else processes it</h2>
      <p>We use a small number of service providers, each under a data processing agreement:</p>
      <ul>
        <li><strong>Hosting and database</strong> providers that run the service.</li>
        <li><strong>Open banking provider (Plaid)</strong>, only if you choose to connect a bank. You authorise the connection on your bank&apos;s own page; Arvo never sees your banking password, and bank access tokens are stored encrypted.</li>
        <li><strong>AI provider (Anthropic)</strong>, to write savings insights and explanations. We send only aggregated figures such as totals per category and the names of regular merchants. We do not send your name, email, account details or individual transactions.</li>
        <li><strong>Email provider</strong>, to send password reset emails.</li>
        <li><strong>Market data provider</strong>, which receives the ticker being looked up but nothing about you.</li>
      </ul>
      <p>
        Some providers are outside the European Economic Area. Where they are, transfers rely on an adequacy decision or on
        standard contractual clauses.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep your data for as long as you have an account. When you remove an account or disconnect a bank, its transactions
        are deleted immediately. When you delete your Arvo account, everything linked to it is deleted from the live database
        immediately and from backups within 35 days. Security logs are kept for one day.
      </p>

      <h2>Your rights</h2>
      <p>Under the GDPR and similar laws you can:</p>
      <ul>
        <li>get a copy of your data: Settings, then Download my data;</li>
        <li>correct it: Settings, or by changing a transaction&apos;s category;</li>
        <li>delete it: Settings, then Delete account;</li>
        <li>object to or restrict processing, or ask a question, by writing to {LEGAL.contact};</li>
        <li>complain to the data protection authority where you live.</li>
      </ul>

      <h2>Security</h2>
      <p>
        Connections are encrypted in transit. Passwords are hashed with scrypt. Bank tokens are encrypted at rest with
        AES-256-GCM. Sessions are stored as hashes and expire after 30 days. No system is perfectly secure; if a breach affects
        you, we will tell you and the regulator as the law requires.
      </p>

      <h2>Changes</h2>
      <p>If we change how we use personal data, we will update this notice and tell you about significant changes before they take effect.</p>
    </>
  );
}
