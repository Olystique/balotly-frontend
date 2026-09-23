import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Notice } from "@/components/ui/notice";
import { getSession, load } from "@/lib/session";
import type { Category, Contest, VotePackage } from "@/lib/types";
import { Wizard, type WizardStep } from "./wizard";

export const metadata: Metadata = { title: "New contest · Balotly" };

type Props = { searchParams: Promise<{ contest?: string; step?: string }> };

/**
 * Steps 2 to 4 of setup (FE-08). Once the contest exists its id is in the
 * URL, so a refresh or a dropped connection resumes the same contest rather
 * than creating a second one.
 */
export default async function NewContestPage({ searchParams }: Props) {
  const user = await getSession();
  if (user?.role === "organizer" && !user.organization_id) redirect("/organizer/onboarding");

  const { contest: contestId, step } = await searchParams;
  if (!contestId) return <Wizard initialStep="contest" contest={null} categories={[]} packages={[]} />;

  const id = encodeURIComponent(contestId);
  const [contest, categories, packages] = await Promise.all([
    load<{ contest: Contest }>(`/contests/${id}`),
    load<{ categories: Category[] }>(`/contests/${id}/categories`),
    load<{ vote_packages: VotePackage[] }>(`/contests/${id}/vote-packages`),
  ]);
  if (contest.error || categories.error || packages.error) {
    return (
      <main className="mx-auto w-full max-w-voter px-4 py-6">
        <Notice tone="error">We couldn&apos;t load this contest. Check your connection and try again.</Notice>
      </main>
    );
  }
  const cats = categories.data.categories;
  const packs = packages.data.vote_packages;
  const derived: WizardStep = cats.length === 0 ? "categories" : packs.length === 0 ? "packages" : "done";
  const requested = ["categories", "packages", "done"].includes(step ?? "") ? (step as WizardStep) : derived;
  // Never jump past a step that is still empty.
  const order: WizardStep[] = ["contest", "categories", "packages", "done"];
  const initialStep = order.indexOf(requested) > order.indexOf(derived) ? derived : requested;

  return <Wizard initialStep={initialStep} contest={contest.data.contest} categories={cats} packages={packs} />;
}
