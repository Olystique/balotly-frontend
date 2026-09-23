"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { ApiError, NETWORK_MESSAGE, bff, json } from "@/lib/api";
import type { Category, Contest } from "@/lib/types";

/** Each category is saved as it is added, so nothing typed here is lost. */
export function CategoriesStep({
  contest,
  categories,
  onChange,
  onContinue,
}: {
  contest: Contest;
  categories: Category[];
  onChange: (categories: Category[]) => void;
  onContinue: () => void;
}) {
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const base = `/contests/${encodeURIComponent(contest.id)}/categories`;

  async function add(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    setNameError(null);
    setError(null);
    try {
      const { category } = await bff<{ category: Category }>(base, json("POST", { name: name.trim() }));
      onChange([...categories, category]);
      setName("");
    } catch (e) {
      if (e instanceof ApiError && e.code === "CATEGORY_EXISTS") setNameError("You already have a category with that name.");
      else setError(e instanceof ApiError && e.code !== "NETWORK_ERROR" ? e.message : NETWORK_MESSAGE);
    } finally {
      setAdding(false);
    }
  }

  async function remove(category: Category) {
    setRemoving(category.id);
    setError(null);
    try {
      await bff(`${base}/${encodeURIComponent(category.id)}`, { method: "DELETE" });
      onChange(categories.filter((c) => c.id !== category.id));
    } catch (e) {
      setError(e instanceof ApiError && e.code !== "NETWORK_ERROR" ? e.message : NETWORK_MESSAGE);
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl">Categories</h1>
        <p className="text-muted">Add the positions or awards people will vote for.</p>
      </header>

      <form onSubmit={add} className="flex items-end gap-2" noValidate>
        <div className="min-w-0 flex-1">
          <Input label="Category name" placeholder="e.g. Social Director" value={name} onChange={(e) => { setName(e.target.value); setNameError(null); }} error={nameError ?? undefined} disabled={adding} maxLength={255} />
        </div>
        <Button type="submit" variant="secondary" block={false} loading={adding} disabled={!name.trim()} className={nameError ? "mb-7" : undefined}>
          Add
        </Button>
      </form>

      {categories.length > 0 && (
        <ul className="flex flex-col divide-y divide-line rounded-lg border border-line bg-surface">
          {categories.map((c) => (
            <li key={c.id} className="flex min-h-tap items-center justify-between gap-3 px-4 py-2">
              <span className="min-w-0 break-words">{c.name}</span>
              <button
                type="button"
                onClick={() => remove(c)}
                disabled={removing === c.id}
                className="min-h-tap shrink-0 text-sm font-semibold text-red underline-offset-4 hover:underline disabled:opacity-50"
              >
                {removing === c.id ? "Removing" : "Remove"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex flex-col gap-2">
        <Button onClick={onContinue} disabled={categories.length === 0}>
          Continue
        </Button>
        {categories.length === 0 && <p className="text-center text-sm text-muted">Add at least one category to continue.</p>}
      </div>
    </div>
  );
}
