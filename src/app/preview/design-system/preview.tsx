"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton, SkeletonNumber, SkeletonText } from "@/components/ui/skeleton";
import { formatNaira } from "@/lib/money";

const swatches = [
  { name: "Ink", token: "ink", className: "bg-ink", use: "Body text, headings" },
  { name: "Paper", token: "paper", className: "bg-paper", use: "Page background" },
  { name: "Certified Green", token: "green", className: "bg-green", use: "Primary actions, success" },
  { name: "Result Gold", token: "gold", className: "bg-gold", use: "Live counts, rank #1. Never a fill" },
  { name: "Line", token: "line", className: "bg-line", use: "Borders, dividers" },
  { name: "Alert Red", token: "red", className: "bg-red", use: "Errors, disqualification" },
];

export function DesignSystemPreview() {
  const [loading, setLoading] = useState(false);
  const [matric, setMatric] = useState("");

  function simulateCheckout() {
    setLoading(true);
    window.setTimeout(() => setLoading(false), 1800);
  }

  return (
    <main className="mx-auto flex w-full max-w-voter flex-col gap-10 px-4 py-8 sm:max-w-2xl">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted">Balotly · Design system</p>
        <h1 className="text-3xl">FE-01 foundation</h1>
      </header>

      <Section title="Color">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {swatches.map((s) => (
            <li key={s.token} className="flex flex-col gap-2">
              <div className={`h-14 rounded-md border border-line ${s.className}`} />
              <div className="flex flex-col">
                <span className="text-sm font-medium">{s.name}</span>
                <span className="text-xs text-muted">{s.use}</span>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Type">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs text-muted">Display · Space Grotesk · vote count</p>
            <p className="font-display text-6xl font-semibold tabular-nums text-ink">4,812</p>
          </div>
          <div>
            <p className="text-xs text-muted">Display · Space Grotesk · price</p>
            <p className="font-display text-3xl font-semibold tabular-nums">
              {formatNaira(50000)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">Heading · Space Grotesk</p>
            <h2 className="text-2xl">Best SUG Social Director</h2>
          </div>
          <div>
            <p className="text-xs text-muted">Body · IBM Plex Sans</p>
            <p className="text-base">
              Your vote is confirmed instantly after payment. If the payment
              doesn&apos;t go through, no vote is recorded and nothing is
              charged.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Button">
        <div className="flex flex-col gap-3">
          <Button onClick={simulateCheckout} loading={loading}>
            Vote now · {formatNaira(50000)}
          </Button>
          <Button variant="secondary">Download poster</Button>
          <Button disabled>Vote now · {formatNaira(50000)}</Button>
          <Button loading>Confirming your vote</Button>
          <Button variant="danger">Disqualify Adeoye Toheeb</Button>
          <p className="text-xs text-muted">
            Tap the first one: it shows the loading state for two seconds.
          </p>
        </div>
      </Section>

      <Section title="Input">
        <div className="flex flex-col gap-4">
          <Input
            label="Matric number"
            placeholder="e.g. CSC/2021/044"
            hint="Only needed for this contest. One vote per matric number."
            value={matric}
            onChange={(e) => setMatric(e.target.value)}
            autoCapitalize="characters"
          />
          <Input
            label="Account number"
            inputMode="numeric"
            defaultValue="012345678"
            error="That account number is 9 digits; Nigerian NUBAN numbers are 10. Check it and try again."
          />
          <Input label="Bank" defaultValue="Guaranty Trust Bank" disabled />
        </div>
      </Section>

      <Section title="Loading skeleton">
        <div className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-16 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <SkeletonText className="w-3/4" />
              <SkeletonText className="w-1/2" />
            </div>
          </div>
          <SkeletonNumber className="w-32" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-tap" />
            <Skeleton className="h-tap" />
            <Skeleton className="h-tap" />
          </div>
        </div>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="border-b border-line pb-2 text-xl">{title}</h2>
      {children}
    </section>
  );
}
