import { cache } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import type { VotePage } from "@/lib/types";

export type VotePageResult = { page: VotePage; error: null } | { page: null; error: ApiError };

/** Fetched once per request, shared by the page and its metadata. */
export const loadVotePage = cache(async (slug: string): Promise<VotePageResult> => {
  try {
    return { page: await apiFetch<VotePage>(`/vote/${encodeURIComponent(slug)}`), error: null };
  } catch (error) {
    if (error instanceof ApiError) return { page: null, error };
    throw error;
  }
});
