import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "../components/auth-form";

export const metadata: Metadata = { title: "Create your account · Balotly" };

export default function SignUpPage() {
  return (
    <>
      <h1 className="text-3xl">Create your account</h1>
      <Suspense>
        <AuthForm mode="sign-up" />
      </Suspense>
    </>
  );
}
