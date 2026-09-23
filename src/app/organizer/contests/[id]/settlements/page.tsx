import type { Metadata } from "next";
import Link from "next/link";
import { Notice } from "@/components/ui/notice";
import { load } from "@/lib/session";
import type { Settlements } from "@/lib/types";
import { SettlementScreen } from "./settlement-screen";

export const metadata: Metadata = { title: "Settlement · Balotly" };

type Props = { params: Promise<{ id: string }> };

/** Releasing held funds after a contest (FE-11). This moves real money. */
export default async function SettlementPage({ params }: Props) {
  const id = (await params).id;
  const { data, error } = await load<Settlements>(`/organizer/contests/${encodeURIComponent(id)}/settlements`);
  return (
    <main className="mx-auto flex w-full max-w-voter flex-1 flex-col gap-6 px-4 py-6 md:max-w-3xl">
      {error ? (
        <Notice tone="error">
          {error.status === 404 ? "We couldn't find that contest." : "We couldn't load the settlement. Check your connection and try again."}{" "}
          <Link href="/organizer" className="font-semibold underline underline-offset-4">
            Back to contests
          </Link>
        </Notice>
      ) : (
        <SettlementScreen data={data} />
      )}
    </main>
  );
}
