import { titled } from "@/lib/i18n/server";
import { msg } from "@/lib/i18n/core";
import { requireUser } from "@/lib/auth";
import { BankConnect } from "@/components/bank-connect";
import { PageHeader, Panel } from "@/components/ui";

export const generateMetadata = titled(msg("Finishing your bank connection"));

/** Banks send the person back here after they approve access on the bank's own site. */
export default async function BankReturnPage() {
  await requireUser();
  return (
    <>
      <PageHeader title="Almost there" lead="Your bank sent you back to Arvo. This takes a few seconds." />
      <Panel className="p-5 sm:p-6">
        <BankConnect resume />
      </Panel>
    </>
  );
}
