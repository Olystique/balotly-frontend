"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { ApiError, NETWORK_MESSAGE, bff, json } from "@/lib/api";

export function OrganizationForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});
    try {
      await bff("/organizations", json("POST", {
        name: name.trim(),
        contact_email: email.trim() || null,
        contact_phone: phone.trim() || null,
      }));
      router.push("/organizer/contests/new");
      router.refresh();
    } catch (e) {
      setLoading(false);
      if (e instanceof ApiError && e.code === "ORGANIZATION_EXISTS") {
        router.push("/organizer/contests/new");
        return;
      }
      if (e instanceof ApiError && e.code === "VALIDATION_ERROR") return setFieldErrors(e.fieldErrors());
      setError(e instanceof ApiError && e.code !== "NETWORK_ERROR" ? e.message : NETWORK_MESSAGE);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <Input label="Organization name" placeholder="e.g. XYZ College SUG" value={name} onChange={(e) => setName(e.target.value)} error={fieldErrors.name} disabled={loading} maxLength={255} />
      <Input label="Contact email (optional)" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fieldErrors.contact_email} disabled={loading} />
      <Input label="Contact phone (optional)" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} error={fieldErrors.contact_phone} disabled={loading} />
      {error && <Notice tone="error">{error}</Notice>}
      <Button type="submit" loading={loading} disabled={name.trim().length < 2}>
        Continue
      </Button>
    </form>
  );
}
