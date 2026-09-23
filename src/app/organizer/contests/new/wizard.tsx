"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Category, Contest, VotePackage } from "@/lib/types";
import { WizardProgress } from "../../components/wizard-progress";
import { CategoriesStep } from "./steps/categories-step";
import { ContestStep } from "./steps/contest-step";
import { DoneStep } from "./steps/done-step";
import { PackagesStep } from "./steps/packages-step";

export type WizardStep = "contest" | "categories" | "packages" | "done";

const STEP_NUMBER: Record<WizardStep, number> = { contest: 2, categories: 3, packages: 4, done: 4 };

export function Wizard({
  initialStep,
  contest: initialContest,
  categories: initialCategories,
  packages,
}: {
  initialStep: WizardStep;
  contest: Contest | null;
  categories: Category[];
  packages: VotePackage[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(initialStep);
  const [contest, setContest] = useState<Contest | null>(initialContest);
  const [categories, setCategories] = useState<Category[]>(initialCategories);

  function go(next: WizardStep, forContest: Contest | null = contest) {
    setStep(next);
    if (forContest) router.replace(`/organizer/contests/new?contest=${forContest.id}&step=${next}`, { scroll: false });
    window.scrollTo({ top: 0 });
  }

  return (
    <main className="mx-auto flex w-full max-w-voter flex-1 flex-col gap-6 px-4 py-6 md:max-w-3xl md:flex-row md:gap-12">
      <WizardProgress step={STEP_NUMBER[step]} />
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        {step === "contest" && (
          <ContestStep
            onCreated={(created) => {
              setContest(created);
              go("categories", created);
            }}
          />
        )}
        {step === "categories" && contest && (
          <CategoriesStep contest={contest} categories={categories} onChange={setCategories} onContinue={() => go("packages")} />
        )}
        {step === "packages" && contest && (
          <PackagesStep contest={contest} existing={packages} onBack={() => go("categories")} onContinue={() => go("done")} />
        )}
        {step === "done" && contest && <DoneStep contest={contest} />}
      </div>
    </main>
  );
}
