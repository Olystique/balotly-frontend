/**
 * Response shapes from the backend issues (BE-02 to BE-15).
 *
 * These are the contract. When a backend PR lands, its response must match
 * the type here; if it does not, one of the two is wrong and the review
 * decides which. Money is always integer kobo. Dates are ISO strings.
 */

export type Role = "admin" | "organizer" | "candidate";

export interface User {
  id: string;
  email: string;
  role: Role;
  organization_id: string | null;
}

export interface AuthPayload {
  user: User;
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
}

export interface Organization {
  id: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  platform_fee_percent: string | null;
  created_at: string;
}

export type ContestStatus = "draft" | "active" | "closed";

export interface Contest {
  id: string;
  organization_id: string;
  name: string;
  status: ContestStatus;
  requires_matric_number: boolean;
  caps_votes_per_identity: boolean;
  starts_at: string;
  ends_at: string;
  platform_fee_percent: string | null;
  category_count: number;
  vote_package_count: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  contest_id: string;
  name: string;
  candidate_count: number;
  created_at: string;
}

export interface VotePackage {
  id: string;
  contest_id?: string;
  amount_kobo: number;
  vote_count: number;
  label: string;
  is_featured: boolean;
  created_at?: string;
}

export type CandidateStatus = "pending_approval" | "approved" | "disqualified";

export interface Candidate {
  id: string;
  category_id: string;
  contest_id: string;
  user_id: string | null;
  name: string;
  slug: string;
  bio: string | null;
  matric_number: string | null;
  photo_url: string | null;
  poster_url: string | null;
  status: CandidateStatus;
  disqualification_reason: string | null;
  vote_url: string;
  created_at: string;
  updated_at: string;
  /** Present on the organizer dashboard's approval queue (BE-14). */
  category_name?: string;
}

/** GET /contests/:id/application (BE-05): what a candidate needs to apply. */
export interface ContestApplication {
  contest: Pick<Contest, "id" | "name" | "status" | "requires_matric_number">;
  organization: { name: string };
  categories: Array<Pick<Category, "id" | "name">>;
}

/** GET /vote/:slug (BE-08). */
export interface VotePage {
  candidate: Pick<Candidate, "id" | "name" | "slug" | "photo_url" | "poster_url" | "bio">;
  category: { id: string; name: string };
  contest: Pick<
    Contest,
    "id" | "name" | "requires_matric_number" | "caps_votes_per_identity" | "ends_at"
  >;
  organization: { name: string };
  vote_packages: VotePackage[];
  can_vote: boolean;
}

/** POST /vote/:slug/checkout (BE-09). */
export interface Checkout {
  authorization_url: string;
  reference: string;
  amount_kobo: number;
  vote_count: number;
}

export type TransactionStatus = "pending" | "success" | "failed";

/** GET /vote/transactions/:reference (BE-10). */
export interface TransactionState {
  reference: string;
  status: TransactionStatus;
  vote_count: number;
  amount_kobo: number;
  candidate: { name: string; slug: string };
  contest_id: string;
  confirmed_at: string | null;
}

export interface LeaderboardCandidate {
  rank: number | null;
  id: string;
  name: string;
  slug: string;
  photo_url: string | null;
  status: CandidateStatus;
  vote_count: number;
}

export interface LeaderboardCategory {
  id: string;
  name: string;
  total_votes: number;
  candidates: LeaderboardCandidate[];
}

/** GET /contests/:id/leaderboard (BE-11), and every WebSocket frame (BE-12). */
export interface Leaderboard {
  contest: Pick<Contest, "id" | "name" | "status" | "starts_at" | "ends_at">;
  total_votes: number;
  categories: LeaderboardCategory[];
  generated_at: string;
}

export interface Bank {
  name: string;
  code: string;
}

export type BankAccountStatus = "pending" | "verified";

/** BE-06 resolve, confirm and GET responses share this shape. */
export interface BankAccount {
  bank_code?: string;
  bank_name: string;
  account_number_masked: string;
  account_name: string;
  status: BankAccountStatus;
  subaccount_code?: string;
}

export type SettlementStatus = "held" | "released" | "reversed";

/** GET /candidates/:id/dashboard (BE-13). */
export interface CandidateDashboard {
  candidate: Pick<
    Candidate,
    | "id"
    | "name"
    | "slug"
    | "status"
    | "photo_url"
    | "poster_url"
    | "vote_url"
    | "disqualification_reason"
  >;
  category: { id: string; name: string };
  contest: Pick<Contest, "id" | "name" | "status" | "starts_at" | "ends_at">;
  votes: { total: number; rank: number | null; category_candidate_count: number };
  revenue: {
    gross_kobo: number;
    platform_fee_percent: string;
    platform_fee_kobo: number;
    net_kobo: number;
    successful_transactions: number;
  };
  bank_account: Omit<BankAccount, "bank_code" | "subaccount_code"> | null;
  settlement: { status: SettlementStatus; amount_kobo: number; actioned_at: string | null } | null;
}

/** GET /organizer/contests/:id/dashboard (BE-14). */
export interface OrganizerDashboard {
  contest: Contest;
  leaderboard: Leaderboard;
  revenue: {
    gross_kobo: number;
    platform_fee_kobo: number;
    successful_transactions: number;
    pending_transactions: number;
    failed_transactions: number;
  };
  candidates: Record<CandidateStatus, number>;
  approval_queue: Candidate[];
  settlement: {
    held_kobo: number;
    released_kobo: number;
    reversed_kobo: number;
    candidates_pending_release: number;
  };
}

export interface SettlementRow {
  id: string;
  candidate: { id: string; name: string; slug: string; status: CandidateStatus };
  amount_kobo: number;
  status: SettlementStatus;
  /** Exactly the rows a release would pay right now. */
  releasable: boolean;
  /** Why a held row is left out of the release, or null. */
  blocked_reason: "disqualified" | "no_verified_bank_account" | "nothing_to_pay" | null;
  actioned_by: string | null;
  actioned_at: string | null;
  provider_reference: string | null;
  failure_reason: string | null;
}

/** GET /organizer/contests/:id/settlements (BE-15). */
export interface Settlements {
  contest: {
    id: string;
    name: string;
    status: ContestStatus;
    closed_at: string | null;
    dispute_window_hours: number;
    release_available_at: string | null;
  };
  totals: {
    held_kobo: number;
    released_kobo: number;
    reversed_kobo: number;
    releasable_kobo: number;
    releasable_candidates: number;
  };
  settlements: SettlementRow[];
}

/** POST /organizer/contests/:id/settlements/release (BE-15). */
export interface ReleaseResult {
  released: number;
  reversed: number;
  skipped: Array<{ candidate_id: string; reason: string }>;
  failed: Array<{ candidate_id: string; reason: string }>;
  released_kobo: number;
}
