import type { Metadata } from "next";
import { Confirmation } from "./confirmation";

export const metadata: Metadata = {
  title: "Confirming your vote · Balotly",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ reference?: string | string[] }>;
};

/**
 * Where Paystack sends the voter back to (FE-03). Arriving here proves
 * nothing about the vote; the page waits for the backend to say so.
 */
export default async function ConfirmPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { reference } = await searchParams;
  return (
    <main className="mx-auto flex w-full max-w-voter flex-1 flex-col px-4 pb-10 pt-5">
      <p className="text-sm">
        <span className="font-display font-semibold">Balotly</span>
      </p>
      <Confirmation slug={slug} reference={typeof reference === "string" ? reference : null} />
    </main>
  );
}
