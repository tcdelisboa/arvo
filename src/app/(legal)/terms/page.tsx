import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Terms of use" };

export default function TermsPage() {
  return (
    <>
      <h1>Terms of use</h1>
      <p className="lead">The agreement between you and Arvo. Last updated {LEGAL.updated}.</p>

      <h2>1. Who we are</h2>
      <p>
        Arvo is operated by {LEGAL.entity}, {LEGAL.address} (&ldquo;Arvo&rdquo;, &ldquo;we&rdquo;). You can reach us at {LEGAL.contact}.
      </p>

      <h2>2. What Arvo does</h2>
      <p>
        Arvo helps you understand your spending and learn about investing. It reads transactions you import or connect, sorts
        them into categories, suggests ways to save, estimates an investor profile from a questionnaire, shows a model portfolio,
        and displays information about shares and funds.
      </p>
      <p>
        Arvo is an educational tool. It is not a bank, payment institution, broker or investment adviser. It does not provide
        personal investment advice, does not hold client money, and does not execute transactions. See the{" "}
        <Link href="/risk">risk notice</Link>, which forms part of these terms.
      </p>

      <h2>3. Your account</h2>
      <ul>
        <li>You must be at least 18 years old.</li>
        <li>Give accurate information and keep your password to yourself. You are responsible for activity in your account.</li>
        <li>Tell us straight away if you think someone else has accessed your account.</li>
      </ul>

      <h2>4. Your data and bank connections</h2>
      <p>
        You decide what to bring into Arvo. If you connect a bank, the connection is made through a regulated open banking
        provider and is read-only: Arvo receives account and transaction information and can never move money. You can
        disconnect a bank, remove an account, or delete everything at any time in Settings. How we handle personal data is
        described in the <Link href="/privacy">privacy notice</Link>.
      </p>

      <h2>5. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>use Arvo for anything unlawful, or upload data you have no right to use;</li>
        <li>try to access other people&apos;s accounts, or probe, scrape or overload the service;</li>
        <li>resell Arvo or present its output as professional financial advice to others.</li>
      </ul>

      <h2>6. Information from third parties</h2>
      <p>
        Market prices, company information and news are supplied by third parties. We do not guarantee that they are accurate,
        complete or up to date, and they must not be relied on for trading.
      </p>

      <h2>7. Our responsibility to you</h2>
      <p>
        We provide Arvo with reasonable care and skill, but we do not promise that it will always be available or free of
        errors. To the extent the law allows, we are not liable for investment losses, for decisions you make using Arvo, or for
        indirect or consequential loss. Nothing in these terms limits liability that cannot be limited by law, or your rights
        as a consumer.
      </p>

      <h2>8. Price</h2>
      <p>Arvo is free during early access. If we introduce paid features, we will tell you before you are charged anything.</p>

      <h2>9. Ending the agreement</h2>
      <p>
        You can delete your account at any time in Settings. We may suspend or close an account that breaks these terms. When an
        account is closed, the data in it is deleted as described in the privacy notice.
      </p>

      <h2>10. Changes</h2>
      <p>
        We may update these terms as Arvo develops. If a change is significant we will tell you in the app or by email before it
        takes effect. Using Arvo after that means you accept the new terms.
      </p>

      <h2>11. Law</h2>
      <p>
        These terms are governed by the law of the country in which {LEGAL.entity} is established. If you are a consumer, you
        also keep the protection of the mandatory rules of the country where you live.
      </p>
    </>
  );
}
