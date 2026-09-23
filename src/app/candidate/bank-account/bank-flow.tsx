"use client";

import { useState, type FormEvent } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { ApiError, NETWORK_MESSAGE, bff, json } from "@/lib/api";
import type { Bank, BankAccount } from "@/lib/types";
import { BankPicker } from "./bank-picker";

type Step = "form" | "confirm" | "linked";

/**
 * Enter details, resolve, "Is this you?", link. The confirmation step is not
 * skippable: the resolved name is shown and the candidate taps "Yes, that's
 * me" before any subaccount exists. It is the tap that stops money going to
 * the wrong person (BE-06).
 */
export function BankFlow({
  candidateId,
  banks,
  existing,
}: {
  candidateId: string;
  banks: Bank[];
  existing: BankAccount | null;
}) {
  const initialStep: Step = existing?.status === "verified" ? "linked" : existing?.account_name ? "confirm" : "form";
  const [step, setStep] = useState<Step>(initialStep);
  const [account, setAccount] = useState<BankAccount | null>(existing);
  const [bank, setBank] = useState<Bank | null>(banks.find((b) => b.code === existing?.bank_code) ?? null);
  const [number, setNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [numberError, setNumberError] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; retry?: boolean } | null>(null);
  const base = `/candidates/${encodeURIComponent(candidateId)}/bank-account`;
  const dashboard = `/candidate/dashboard?candidate=${candidateId}`;

  async function resolve(event?: FormEvent) {
    event?.preventDefault();
    if (!bank || !/^\d{10}$/.test(number)) return;
    setLoading(true);
    setNumberError(null);
    setError(null);
    try {
      const resolved = await bff<BankAccount>(`${base}/resolve`, json("POST", { bank_code: bank.code, account_number: number }));
      setAccount(resolved);
      setStep("confirm");
    } catch (e) {
      if (!(e instanceof ApiError)) setError({ message: NETWORK_MESSAGE, retry: true });
      else if (e.code === "ACCOUNT_NOT_RESOLVED") {
        setNumberError("We couldn't find an account with that number at that bank. Check both and try again.");
      } else if (e.code === "PAYMENT_PROVIDER_UNAVAILABLE") {
        setError({ message: "Bank verification is temporarily unavailable. Please try again in a minute.", retry: true });
      } else if (e.code === "VALIDATION_ERROR") {
        setNumberError("Account numbers are 10 digits.");
      } else {
        setError({ message: e.code === "NETWORK_ERROR" ? NETWORK_MESSAGE : e.message, retry: true });
      }
    } finally {
      setLoading(false);
    }
  }

  async function confirm() {
    setLoading(true);
    setError(null);
    try {
      setAccount(await bff<BankAccount>(`${base}/confirm`, json("POST")));
      setStep("linked");
    } catch (e) {
      if (e instanceof ApiError && e.code === "BANK_ACCOUNT_NOT_RESOLVED") {
        setStep("form");
        setError({ message: "Please verify the account number again." });
      } else if (e instanceof ApiError && e.code === "SUBACCOUNT_REJECTED") {
        setError({ message: e.message, retry: true });
      } else if (e instanceof ApiError && e.code === "PAYMENT_PROVIDER_UNAVAILABLE") {
        setError({ message: "Linking is temporarily unavailable. Please try again in a minute.", retry: true });
      } else {
        setError({ message: NETWORK_MESSAGE, retry: true });
      }
    } finally {
      setLoading(false);
    }
  }

  function changeDetails() {
    setError(null);
    setStep("form");
  }

  if (step === "linked" && account) {
    return (
      <section className="flex flex-col items-center gap-4 py-6 text-center" aria-live="polite">
        <span className="flex size-14 items-center justify-center rounded-full bg-green text-surface" aria-hidden="true">
          <svg className="size-7" viewBox="0 0 24 24" fill="none">
            <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <h1 className="text-3xl">Bank account linked</h1>
        <div className="flex flex-col gap-0.5">
          <p className="font-display text-xl font-semibold break-words">{account.account_name}</p>
          <p className="text-muted">
            {account.bank_name} · {account.account_number_masked}
          </p>
        </div>
        <p className="text-muted">
          Your share is held safely until the organizer releases it after the contest.
        </p>
        <ButtonLink href={dashboard}>Back to dashboard</ButtonLink>
      </section>
    );
  }

  if (step === "confirm" && account) {
    return (
      <section className="flex flex-col gap-6" aria-live="polite">
        <h1 className="text-3xl">Is this you?</h1>
        <div className="flex flex-col gap-1 rounded-lg border border-line bg-surface px-4 py-5 text-center">
          <p className="font-display text-2xl font-semibold break-words">{account.account_name}</p>
          <p className="text-muted">
            {account.bank_name} · {account.account_number_masked}
          </p>
        </div>
        <p className="text-sm text-muted">
          This is the name your bank has on the account. Your share of the votes will be paid here.
        </p>
        {error && <Notice tone="error">{error.message}</Notice>}
        <div className="flex flex-col gap-3">
          <Button onClick={confirm} loading={loading}>
            {error?.retry ? "Try again" : "Yes, that's me"}
          </Button>
          <button
            type="button"
            onClick={changeDetails}
            disabled={loading}
            className="min-h-tap text-center font-semibold underline underline-offset-4"
          >
            That&apos;s not me, change details
          </button>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={resolve} className="flex flex-col gap-6" noValidate>
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl">Link your bank account</h1>
        <p className="text-muted">This is where your share of the votes will be paid.</p>
      </header>
      <BankPicker banks={banks} value={bank} onChange={setBank} disabled={loading} />
      <Input
        label="Account number"
        inputMode="numeric"
        autoComplete="off"
        maxLength={10}
        value={number}
        onChange={(e) => {
          setNumber(e.target.value.replace(/\D/g, "").slice(0, 10));
          setNumberError(null);
          setError(null);
        }}
        hint="10 digits"
        error={numberError ?? undefined}
        disabled={loading}
      />
      {error && <Notice tone="error">{error.message}</Notice>}
      <Button type="submit" loading={loading} disabled={!bank || number.length !== 10}>
        {error?.retry ? "Try again" : "Verify account"}
      </Button>
    </form>
  );
}
