"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { StatusPill } from "@/components/ui/status-pill";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, NETWORK_MESSAGE, bff } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { Candidate, ContestApplication } from "@/lib/types";
import { photoProblem } from "./photo";

export function ApplyForm({ application }: { application: ContestApplication }) {
  const { contest, organization, categories } = application;
  const [categoryId, setCategoryId] = useState(categories.length === 1 ? categories[0].id : "");
  const [name, setName] = useState("");
  const [matric, setMatric] = useState("");
  const [bio, setBio] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<React.ReactNode>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState<Candidate | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Release the object URL when the photo changes or the form goes away.
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  function pickPhoto(file: File | undefined) {
    if (!file) return;
    const problem = photoProblem(file);
    setPhotoError(problem);
    if (problem) return;
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!photo) return setPhotoError("Add a photo to apply.");
    setLoading(true);
    setFieldErrors({});
    setFormError(null);
    const form = new FormData();
    form.set("category_id", categoryId);
    form.set("name", name.trim());
    if (bio.trim()) form.set("bio", bio.trim());
    if (contest.requires_matric_number && matric.trim()) form.set("matric_number", matric.trim().toUpperCase());
    form.set("photo", photo);
    try {
      const { candidate } = await bff<{ candidate: Candidate }>("/candidates", { method: "POST", body: form });
      setSubmitted(candidate);
    } catch (error) {
      setLoading(false);
      if (!(error instanceof ApiError)) return setFormError(NETWORK_MESSAGE);
      switch (error.code) {
        case "ALREADY_APPLIED":
          return setFormError(
            <>
              You&apos;ve already applied to this contest.{" "}
              <Link href="/candidate" className="font-semibold underline underline-offset-4">
                See your applications
              </Link>
            </>,
          );
        case "CONTEST_CLOSED":
          return setFormError("Applications for this contest have closed.");
        case "PHOTO_INVALID":
          return setPhotoError(error.message);
        case "STORAGE_UNAVAILABLE":
          return setFormError("We couldn't upload your photo right now. Nothing was submitted. Please try again in a minute.");
        case "VALIDATION_ERROR":
          return setFieldErrors(error.fieldErrors());
        default:
          return setFormError(error.code === "NETWORK_ERROR" ? NETWORK_MESSAGE : error.message);
      }
    }
  }

  if (submitted) {
    const category = categories.find((c) => c.id === submitted.category_id);
    return (
      <section className="flex flex-col items-center gap-4 py-6 text-center" aria-live="polite">
        <span className="flex size-14 items-center justify-center rounded-full bg-green text-surface" aria-hidden="true">
          <svg className="size-7" viewBox="0 0 24 24" fill="none">
            <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <h1 className="text-3xl">Application sent</h1>
        <p className="text-muted">
          You&apos;re in the queue for {category?.name ?? "your category"}. The organizer will review it and
          you&apos;ll see your status change here.
        </p>
        <p className="flex items-center gap-2 text-sm">
          Status: <StatusPill status={submitted.status} />
        </p>
        <ButtonLink href={`/candidate/dashboard?candidate=${submitted.id}`}>Go to my dashboard</ButtonLink>
      </section>
    );
  }

  const ready = categoryId && name.trim() && photo;

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl leading-tight">Apply to {contest.name}</h1>
        <p className="text-muted">{organization.name}</p>
      </header>

      <fieldset className="flex flex-col gap-2.5" disabled={loading}>
        <legend className="mb-2 text-sm font-medium">Category</legend>
        {categories.length === 0 && (
          <Notice tone="info">The organizer hasn&apos;t added any categories yet. Check back soon.</Notice>
        )}
        {categories.map((c) => (
          <label
            key={c.id}
            className={cn(
              "flex min-h-tap cursor-pointer items-center gap-3 rounded-lg border bg-surface px-4 py-3",
              categoryId === c.id ? "border-green ring-2 ring-green" : "border-line",
            )}
          >
            <input
              type="radio"
              name="category"
              value={c.id}
              checked={categoryId === c.id}
              onChange={() => setCategoryId(c.id)}
              className="size-4 accent-green"
            />
            <span className="text-base">{c.name}</span>
          </label>
        ))}
        {fieldErrors.category_id && <p className="text-sm text-red">Choose a category.</p>}
      </fieldset>

      <Input
        label="Your name as it should appear"
        autoComplete="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={fieldErrors.name}
        disabled={loading}
        maxLength={255}
      />

      {contest.requires_matric_number && (
        <Input
          label="Matric number (optional)"
          autoCapitalize="characters"
          autoComplete="off"
          value={matric}
          onChange={(e) => setMatric(e.target.value.toUpperCase())}
          error={fieldErrors.matric_number}
          disabled={loading}
          maxLength={64}
        />
      )}

      <Textarea
        label="Short bio"
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        maxLength={500}
        hint="What voters should know about you."
        error={fieldErrors.bio}
        disabled={loading}
      />

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Photo</span>
        <div className="flex items-center gap-4">
          <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-skeleton">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Your photo, cropped as it will appear" className="size-full object-cover" />
            ) : (
              <span className="text-xs text-muted">No photo</span>
            )}
          </div>
          <Button variant="secondary" block={false} onClick={() => fileInput.current?.click()} disabled={loading}>
            {photo ? "Change photo" : "Choose photo"}
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => pickPhoto(e.target.files?.[0])}
          />
        </div>
        <p className={cn("text-sm", photoError ? "text-red" : "text-muted")} role={photoError ? "alert" : undefined}>
          {photoError ?? "JPEG or PNG, up to 5 MB. A clear, front facing photo works best on the poster."}
        </p>
      </div>

      {formError && <Notice tone="error">{formError}</Notice>}
      <Button type="submit" loading={loading} disabled={!ready}>
        Submit application
      </Button>
    </form>
  );
}
