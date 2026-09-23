"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { ApiError, NETWORK_MESSAGE, json, request } from "@/lib/api";
import { cn } from "@/lib/cn";
import { homeFor, safeNext } from "@/lib/session-cookies";
import type { User } from "@/lib/types";

type Mode = "sign-in" | "sign-up";
type Role = "candidate" | "organizer";

const roles: Array<{ value: Role; title: string; body: string }> = [
  { value: "candidate", title: "I'm a candidate", body: "Apply to a contest, get your vote link and poster." },
  { value: "organizer", title: "I'm an organizer", body: "Run a contest, approve candidates, watch the count." },
];

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const [role, setRole] = useState<Role>(params.get("role") === "organizer" ? "organizer" : "candidate");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [emailTaken, setEmailTaken] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setFieldErrors({});
    setFormError(null);
    setEmailTaken(false);
    try {
      const payload = mode === "sign-up" ? { email, password, role } : { email, password };
      const { user } = await request<{ user: User }>(`/api/auth/${mode === "sign-up" ? "signup" : "login"}`, json("POST", payload));
      router.replace(safeNext(params.get("next")) ?? homeFor(user.role));
      router.refresh();
    } catch (error) {
      setLoading(false);
      if (!(error instanceof ApiError)) return setFormError(NETWORK_MESSAGE);
      if (error.code === "EMAIL_TAKEN") return setEmailTaken(true);
      if (error.code === "INVALID_CREDENTIALS") return setFormError("Email or password is incorrect.");
      if (error.status === 422) {
        const errors = error.fieldErrors();
        setFieldErrors({
          email: errors.email ? "Enter a valid email address." : "",
          password: errors.password ? "Use at least 8 characters." : "",
        });
        return;
      }
      setFormError(error.code === "NETWORK_ERROR" ? NETWORK_MESSAGE : error.message);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      {mode === "sign-up" && (
        <fieldset className="flex flex-col gap-3">
          <legend className="sr-only">I am signing up as</legend>
          {roles.map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex min-h-tap cursor-pointer flex-col gap-0.5 rounded-lg border bg-surface px-4 py-3 transition-colors",
                role === option.value ? "border-green ring-1 ring-green" : "border-line",
              )}
            >
              <input
                type="radio"
                name="role"
                value={option.value}
                checked={role === option.value}
                onChange={() => setRole(option.value)}
                className="sr-only"
              />
              <span className="text-base font-semibold">{option.title}</span>
              <span className="text-sm text-muted">{option.body}</span>
            </label>
          ))}
        </fieldset>
      )}

      <Input
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={fieldErrors.email || undefined}
        required
      />
      {emailTaken && (
        <Notice tone="error">
          There&apos;s already an account with this email.{" "}
          <Link href="/sign-in" className="font-semibold underline underline-offset-4">
            Sign in instead.
          </Link>
        </Notice>
      )}
      <Input
        label="Password"
        type="password"
        autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        hint={mode === "sign-up" ? "At least 8 characters" : undefined}
        error={fieldErrors.password || undefined}
        required
      />

      {formError && <Notice tone="error">{formError}</Notice>}

      <Button type="submit" loading={loading} disabled={!email || !password}>
        {mode === "sign-up" ? "Create account" : "Sign in"}
      </Button>

      <p className="text-center text-sm text-muted">
        {mode === "sign-up" ? (
          <>
            Already have an account?{" "}
            <Link href="/sign-in" className="font-semibold text-ink underline underline-offset-4">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/sign-up" className="font-semibold text-ink underline underline-offset-4">
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
