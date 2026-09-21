import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { LeaderboardExample } from "./components/leaderboard-example";

const description =
  "Run SUG elections, awards and pageants where every vote is a confirmed payment and the count moves live. No screenshots, no forwarding bank alerts, no candidate in the middle.";

export const metadata: Metadata = {
  title: "Balotly · Paid campus voting, counted by the payment",
  description,
  openGraph: {
    title: "Balotly · Paid campus voting, counted by the payment",
    description,
    type: "website",
  },
};

const steps = [
  {
    title: "Set up your contest",
    body: "Add the positions or awards and the vote packages, for example ₦100 for one vote, ₦500 for five.",
  },
  {
    title: "Candidates get a link and a poster",
    body: "Each approved candidate gets their own vote link and a ready made poster with a QR code to share on WhatsApp.",
  },
  {
    title: "Voters pay, the count moves",
    body: "A voter taps the link, picks a package and pays. The vote is counted the moment the payment is confirmed, and the leaderboard updates live.",
  },
];

const trust = [
  {
    lead: "Every vote is a payment.",
    body: "There is no way to add a vote without a confirmed transaction behind it.",
  },
  {
    lead: "Nobody self reports.",
    body: "Organizers see the live tally directly. Candidates never forward proof.",
  },
  {
    lead: "Money is held until you release it.",
    body: "Each candidate's share is held after the contest closes, so a disqualification can be enforced before payout.",
  },
];

const signUpHref = "/sign-up?role=organizer";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-5">
        <Link href="/" className="font-display text-xl font-semibold tracking-tight">
          Balotly
        </Link>
        <Link href="/sign-in" className="min-h-tap inline-flex items-center text-base font-medium underline-offset-4 hover:underline">
          Sign in
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-16 px-4 pb-20 pt-8 sm:gap-20 sm:pt-12">
        <section className="flex flex-col gap-6">
          <h1 className="text-4xl leading-tight sm:text-5xl sm:leading-[1.05]">
            Paid campus voting, counted by the payment.
          </h1>
          <p className="text-lg text-muted">{description}</p>
          <div className="flex flex-col gap-2 sm:max-w-xs">
            <ButtonLink href={signUpHref}>Create a contest</ButtonLink>
            <p className="text-sm text-muted">Free to set up. A small fee per vote.</p>
          </div>
        </section>

        <Section title="How it works">
          <ol className="flex flex-col gap-8">
            {steps.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <span className="w-8 shrink-0 font-display text-3xl font-semibold leading-none text-gold">
                  {index + 1}
                </span>
                <div className="flex flex-col gap-1">
                  <h3 className="text-lg">{step.title}</h3>
                  <p className="text-base text-muted">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="Why the count can be trusted">
          <ul className="flex flex-col gap-6">
            {trust.map((item) => (
              <li key={item.lead} className="flex flex-col gap-1">
                <p className="text-base font-semibold">{item.lead}</p>
                <p className="text-base text-muted">{item.body}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Who it is for">
          <div className="flex flex-col gap-4 text-base">
            <p>
              Built for student unions, faculties, departments and awards committees: SUG
              elections, &ldquo;Best of&rdquo; awards, pageants, departmental elections.
            </p>
            <p className="rounded-lg border border-line bg-surface px-4 py-3">
              <span className="font-semibold">Not for political elections.</span> Balotly is for
              contests where paid voting is already the accepted norm at the institution, never
              for statutory elections of any kind.
            </p>
          </div>
        </Section>

        <Section title="Live results">
          <LeaderboardExample />
        </Section>

        <section className="flex flex-col gap-4 border-t border-line pt-10">
          <h2 className="text-2xl">Ready to run your contest?</h2>
          <div className="sm:max-w-xs">
            <ButtonLink href={signUpHref}>Create a contest</ButtonLink>
          </div>
          <p className="text-sm text-muted">
            Have a contest link already? Open it on your phone and vote.
          </p>
        </section>
      </main>

      <footer className="border-t border-line">
        <p className="mx-auto w-full max-w-2xl px-4 py-6 text-sm text-muted">
          Balotly · Olystique Ltd ·{" "}
          <a href="mailto:hello@olystique.com" className="underline-offset-4 hover:underline">
            hello@olystique.com
          </a>
        </p>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-2xl">{title}</h2>
      {children}
    </section>
  );
}
