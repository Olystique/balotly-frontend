import { getSession } from "@/lib/session";

// Replaced by the candidate home in FE-05.
export default async function CandidateHome() {
  const user = await getSession();
  return (
    <main className="mx-auto w-full max-w-voter px-4 py-8">
      <h1 className="text-2xl">Signed in</h1>
      <p className="mt-2 text-muted">{user?.email}</p>
    </main>
  );
}
