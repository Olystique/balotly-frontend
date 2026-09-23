import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "../components/auth-form";

export const metadata: Metadata = { title: "Sign in · Balotly" };

export default function SignInPage() {
  return (
    <>
      <h1 className="text-3xl">Sign in</h1>
      <Suspense>
        <AuthForm mode="sign-in" />
      </Suspense>
    </>
  );
}
