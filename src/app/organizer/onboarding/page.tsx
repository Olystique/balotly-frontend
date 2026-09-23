import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { WizardProgress } from "../components/wizard-progress";
import { OrganizationForm } from "./organization-form";

export const metadata: Metadata = { title: "Set up your organization · Balotly" };

/** Step 1 of the setup wizard (FE-08). Skipped if the organization exists. */
export default async function OnboardingPage() {
  const user = await getSession();
  if (user?.organization_id) redirect("/organizer/contests/new");
  return (
    <main className="mx-auto flex w-full max-w-voter flex-1 flex-col gap-6 px-4 py-6 md:max-w-3xl md:flex-row md:gap-12">
      <WizardProgress step={1} />
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-3xl">Your organization</h1>
          <p className="text-muted">The body running the contest, as voters and candidates will see it.</p>
        </header>
        <OrganizationForm />
      </div>
    </main>
  );
}
