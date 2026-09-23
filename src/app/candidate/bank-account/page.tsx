import type { Metadata } from "next";
import { Notice } from "@/components/ui/notice";
import { load } from "@/lib/session";
import type { Bank, BankAccount } from "@/lib/types";
import { BankFlow } from "./bank-flow";

export const metadata: Metadata = { title: "Bank account · Balotly" };

type Props = { searchParams: Promise<{ candidate?: string | string[] }> };

/**
 * Bank account linking (FE-06). Opens on the step the candidate left off:
 * the form, "Is this you?" for a resolved but unconfirmed account, or the
 * linked state.
 */
export default async function BankAccountPage({ searchParams }: Props) {
  const { candidate } = await searchParams;
  const candidateId = typeof candidate === "string" ? candidate : null;

  return (
    <main className="mx-auto flex w-full max-w-voter flex-1 flex-col gap-6 px-4 py-6">
      {candidateId ? (
        <Flow candidateId={candidateId} />
      ) : (
        <Notice tone="info">Open this from your dashboard to link a bank account.</Notice>
      )}
    </main>
  );
}

async function Flow({ candidateId }: { candidateId: string }) {
  const [account, banks] = await Promise.all([
    load<BankAccount>(`/candidates/${encodeURIComponent(candidateId)}/bank-account`),
    load<{ banks: Bank[] }>("/banks"),
  ]);
  if (account.error && account.error.code !== "BANK_ACCOUNT_NOT_LINKED") {
    return account.error.status === 404 ? (
      <Notice tone="error">We couldn&apos;t find that application.</Notice>
    ) : (
      <Notice tone="error">We couldn&apos;t load your bank details. Check your connection and try again.</Notice>
    );
  }
  if (banks.error) {
    return <Notice tone="error">We couldn&apos;t load the list of banks. Check your connection and try again.</Notice>;
  }
  return <BankFlow candidateId={candidateId} banks={banks.data.banks} existing={account.data} />;
}
