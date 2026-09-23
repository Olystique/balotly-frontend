/**
 * Contract mock of the Balotly backend, for building and checking screens
 * before the real endpoints exist.
 *
 * Every route here returns the shape written in the backend issue it names
 * (BE-02 to BE-15), with the same envelope, the same error codes and the
 * same rules. When a real endpoint lands, the frontend stops talking to this
 * and nothing else changes. If the two disagree, the backend issue is the
 * contract and this file is wrong.
 *
 *   npm run mock            API on http://localhost:8001/api/v1
 *   MOCK_LIVE=1 npm run mock   also casts a random vote every 5 seconds
 *
 * No dependencies: node:http, Request.formData() for multipart, and a
 * WebSocket that only ever sends text frames. State is in memory and resets
 * on restart.
 *
 * Sign in as organizer@balotly.test or candidate@balotly.test, password
 * "password123". Test hooks, all mock only:
 *   account number starting 000   bank resolve says not found
 *   account number starting 999   bank provider unavailable
 *   account number starting 888   subaccount creation rejected
 *   matric number DOWN            payment provider unavailable at checkout
 */

import crypto from "node:crypto";
import http from "node:http";

const PORT = Number(process.env.MOCK_PORT ?? 8001);
const API = "/api/v1";
const SELF = `http://localhost:${PORT}`;
const WEB = process.env.MOCK_WEB_BASE_URL ?? "http://localhost:3000";
const ACCESS_TTL_SECONDS = Number(process.env.MOCK_ACCESS_TTL ?? 1800);
const FEE_PERCENT = "10.00";
const HOUR = 3600_000;
const DAY = 24 * HOUR;

// ---------------------------------------------------------------- helpers

const now = () => new Date().toISOString();
const iso = (ms) => new Date(ms).toISOString();
const uuid = () => crypto.randomUUID();
const sid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

class ApiError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.status = status;
    this.body = { detail: { code, message, ...extra } };
  }
}

/** FastAPI's default 422 shape, which the frontend treats as "fix the input". */
class ValidationError extends Error {
  constructor(field, msg) {
    super(msg);
    this.status = 422;
    this.body = { detail: [{ loc: ["body", field], msg, type: "value_error" }] };
  }
}

const ok = (data, message = "OK", status = 200) => ({
  status,
  body: { status_code: status, success: true, message, data },
});

function slugify(name) {
  const base = name
    .normalize("NFKD")
    .replace(/[^\x00-\x7f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  let slug = base || "candidate";
  let n = 2;
  while (db.candidates.some((c) => c.slug === slug)) slug = `${base}-${n++}`;
  return slug;
}

function feeOf(grossKobo, percent = FEE_PERCENT) {
  // Integer kobo, rounded half up, as BE-13 specifies.
  return Math.floor((grossKobo * Math.round(Number(percent) * 100)) / 10000 + 0.5);
}

// ------------------------------------------------------------------- seed

const db = {
  users: [],
  organizations: [],
  contests: [],
  categories: [],
  packages: [],
  candidates: [],
  subaccounts: new Map(), // candidate_id -> subaccount
  transactions: [],
  settlements: [],
  files: new Map(), // id -> { type, body }
  regenerateAt: new Map(),
  releaseFailuresLeft: new Set(),
};

function seed() {
  const t = Date.now();
  const org = {
    id: sid(1),
    name: "XYZ College SUG",
    contact_email: "sug@xyz.edu.ng",
    contact_phone: "+2348031234567",
    platform_fee_percent: null,
    created_at: iso(t - 30 * DAY),
  };
  db.organizations.push(org);

  db.users.push(
    { id: sid(11), email: "organizer@balotly.test", password: "password123", role: "organizer", organization_id: org.id },
    { id: sid(12), email: "candidate@balotly.test", password: "password123", role: "candidate", organization_id: null },
    { id: sid(13), email: "admin@balotly.test", password: "password123", role: "admin", organization_id: null },
  );

  const contest = (n, name, status, starts, ends, flags = {}) => {
    const c = {
      id: sid(n),
      organization_id: org.id,
      name,
      status,
      requires_matric_number: false,
      caps_votes_per_identity: false,
      starts_at: iso(starts),
      ends_at: iso(ends),
      platform_fee_percent: null,
      closed_at: null,
      dispute_window_hours: 48,
      created_at: iso(t - 20 * DAY),
      updated_at: iso(t - 1 * DAY),
      ...flags,
    };
    db.contests.push(c);
    return c;
  };

  const election = contest(21, "SUG Elections 2026", "active", t - DAY, t + 3 * DAY, {
    requires_matric_number: true,
    caps_votes_per_identity: true,
  });
  const awards = contest(22, "Award Night 2026", "closed", t - 10 * DAY, t - 3 * DAY, {
    closed_at: iso(t - 3 * DAY),
  });
  const pageant = contest(23, "Freshers Pageant 2026", "draft", t + 5 * DAY, t + 7 * DAY);

  const category = (n, contestId, name) => {
    const c = { id: sid(n), contest_id: contestId, name, created_at: iso(t - 19 * DAY) };
    db.categories.push(c);
    return c;
  };
  const president = category(31, election.id, "SUG President");
  const social = category(32, election.id, "Social Director");
  const sports = category(33, election.id, "Sports Director");
  const dressed = category(34, awards.id, "Best Dressed");
  const queen = category(35, pageant.id, "Miss Fresher");

  for (const c of [election, awards, pageant]) {
    [
      [10000, 1, "1 vote", false],
      [50000, 5, "5 votes", true],
      [100000, 10, "10 votes", false],
    ].forEach(([amount_kobo, vote_count, label, is_featured], i) =>
      db.packages.push({
        id: uuid(),
        contest_id: c.id,
        amount_kobo,
        vote_count,
        label,
        is_featured,
        created_at: iso(t - 19 * DAY + i),
      }),
    );
  }

  const candidate = (n, cat, name, status, votes, opts = {}) => {
    const cont = db.contests.find((c) => c.id === cat.contest_id);
    const slug = slugify(name);
    const c = {
      id: sid(n),
      category_id: cat.id,
      contest_id: cont.id,
      user_id: opts.user_id ?? null,
      name,
      slug,
      bio: opts.bio ?? null,
      matric_number: opts.matric_number ?? null,
      photo_url: `${SELF}/mock-files/avatar/${sid(n)}.svg`,
      poster_url: status === "approved" ? `${SELF}/mock-files/poster/${sid(n)}.svg` : null,
      status,
      disqualification_reason: opts.reason ?? null,
      created_at: iso(t - 15 * DAY + n * 60_000),
      updated_at: iso(t - 2 * DAY),
    };
    db.candidates.push(c);
    if (opts.bank !== false && status !== "pending_approval") {
      db.subaccounts.set(c.id, {
        bank_code: "058",
        bank_name: "Guaranty Trust Bank",
        account_number: "0123456789",
        account_name: name.toUpperCase(),
        status: "verified",
        subaccount_code: `ACCT_${c.id.slice(-8)}`,
        percentage_charge: FEE_PERCENT,
      });
    }
    if (votes > 0) {
      // One seed payment per ₦100 vote pack of 10, so revenue is plausible.
      const pack = db.packages.find((p) => p.contest_id === cont.id && p.vote_count === 10);
      let left = votes;
      while (left > 0) {
        const count = Math.min(10, left);
        db.transactions.push({
          id: uuid(),
          reference: `blt_seed${crypto.randomBytes(10).toString("hex")}`,
          candidate_id: c.id,
          contest_id: cont.id,
          vote_package_id: pack.id,
          amount_kobo: count * 10000,
          vote_count: count,
          status: "success",
          voter_matric_number: null,
          confirmed_at: iso(t - 2 * DAY),
          created_at: iso(t - 2 * DAY),
          slug,
        });
        left -= count;
      }
    }
    return c;
  };

  const bio = "Final year Agricultural Economics. Running to bring back the inter faculty games and a proper end of session party.";
  candidate(41, president, "Funmilayo Adebayo", "approved", 2100);
  candidate(42, president, "Emeka Nwosu", "approved", 2100);
  candidate(43, president, "Ibrahim Sani", "approved", 540);
  candidate(44, social, "Adeoye Toheeb", "approved", 1204, { user_id: sid(12), bio, matric_number: "AEC/2022/044" });
  candidate(45, social, "Chika Obi", "approved", 726);
  candidate(46, social, "Musa Bello", "approved", 310);
  candidate(47, social, "Tunde Ade", "disqualified", 88, { reason: "Campaign material posted outside the allowed window." });
  candidate(48, social, "Zainab Yusuf", "pending_approval", 0, { bio: "Second year Mass Communication. I organised the 2025 cultural day." });
  candidate(49, sports, "Kelechi Uzor", "approved", 0, { bank: false });
  candidate(50, sports, "Halima Garba", "pending_approval", 0);

  candidate(51, dressed, "Ada Eze", "approved", 400);
  candidate(52, dressed, "Bola Ahmed", "approved", 120, { bank: false });
  candidate(53, dressed, "Segun Ola", "disqualified", 60, { reason: "Entered under a borrowed matric number." });
  candidate(54, dressed, "Ngozi Eke", "approved", 250);
  db.releaseFailuresLeft.add(sid(54));

  candidate(55, queen, "Amara Okafor", "approved", 0);

  createSettlements(awards);
}

// ------------------------------------------------------------ derived data

const contestOf = (id) => db.contests.find((c) => c.id === id);
const categoryOf = (id) => db.categories.find((c) => c.id === id);
const candidateOf = (id) => db.candidates.find((c) => c.id === id);
const orgOf = (id) => db.organizations.find((o) => o.id === id);

const votesFor = (candidateId) =>
  db.transactions
    .filter((t) => t.candidate_id === candidateId && t.status === "success")
    .reduce((sum, t) => sum + t.vote_count, 0);

const grossFor = (candidateId) =>
  db.transactions
    .filter((t) => t.candidate_id === candidateId && t.status === "success")
    .reduce((sum, t) => sum + t.amount_kobo, 0);

const netFor = (candidateId) => {
  const gross = grossFor(candidateId);
  const pct = db.subaccounts.get(candidateId)?.percentage_charge ?? FEE_PERCENT;
  return gross - feeOf(gross, pct);
};

function contestView(c) {
  return {
    id: c.id,
    organization_id: c.organization_id,
    name: c.name,
    status: c.status,
    requires_matric_number: c.requires_matric_number,
    caps_votes_per_identity: c.caps_votes_per_identity,
    starts_at: c.starts_at,
    ends_at: c.ends_at,
    platform_fee_percent: c.platform_fee_percent,
    category_count: db.categories.filter((x) => x.contest_id === c.id).length,
    vote_package_count: db.packages.filter((x) => x.contest_id === c.id).length,
    created_at: c.created_at,
    updated_at: c.updated_at,
  };
}

const candidateView = (c) => ({
  ...c,
  vote_url: `${WEB}/vote/${c.slug}`,
  category_name: categoryOf(c.category_id)?.name,
});

const packagesOf = (contestId) =>
  db.packages
    .filter((p) => p.contest_id === contestId)
    .sort((a, b) => a.amount_kobo - b.amount_kobo);

function bankView(sub) {
  if (!sub) return null;
  return {
    bank_code: sub.bank_code,
    bank_name: sub.bank_name,
    account_number_masked: `******${sub.account_number.slice(-4)}`,
    account_name: sub.account_name,
    status: sub.status,
    ...(sub.subaccount_code ? { subaccount_code: sub.subaccount_code } : {}),
  };
}

function buildLeaderboard(contest) {
  let total = 0;
  const categories = db.categories
    .filter((cat) => cat.contest_id === contest.id)
    .map((cat) => {
      const rows = db.candidates
        .filter((c) => c.category_id === cat.id && c.status !== "pending_approval")
        .map((c) => ({
          rank: null,
          id: c.id,
          name: c.name,
          slug: c.slug,
          photo_url: c.photo_url,
          status: c.status,
          vote_count: votesFor(c.id),
        }));
      const approved = rows
        .filter((r) => r.status === "approved")
        .sort((a, b) => b.vote_count - a.vote_count || a.name.localeCompare(b.name));
      approved.forEach((r, i) => {
        // Competition ranking: equal counts share a rank, the next one skips.
        r.rank = i > 0 && approved[i - 1].vote_count === r.vote_count ? approved[i - 1].rank : i + 1;
      });
      const disqualified = rows.filter((r) => r.status === "disqualified");
      const catTotal = rows.reduce((s, r) => s + r.vote_count, 0);
      total += catTotal;
      return { id: cat.id, name: cat.name, total_votes: catTotal, candidates: [...approved, ...disqualified] };
    });
  return {
    contest: {
      id: contest.id,
      name: contest.name,
      status: contest.status,
      starts_at: contest.starts_at,
      ends_at: contest.ends_at,
    },
    total_votes: total,
    categories,
    generated_at: now(),
  };
}

function createSettlements(contest) {
  for (const c of db.candidates) {
    if (c.contest_id !== contest.id || c.status === "pending_approval") continue;
    if (db.settlements.some((s) => s.candidate_id === c.id)) continue;
    db.settlements.push({
      id: uuid(),
      contest_id: contest.id,
      candidate_id: c.id,
      amount_kobo: netFor(c.id),
      status: "held",
      actioned_by: null,
      actioned_at: null,
      provider_reference: null,
      failure_reason: null,
    });
  }
}

// ------------------------------------------------------------------- auth

function issue(user) {
  return {
    access_token: `acc.${user.id}.${Date.now()}`,
    refresh_token: `ref.${user.id}.${Date.now()}`,
    token_type: "bearer",
  };
}

const userView = (u) => ({ id: u.id, email: u.email, role: u.role, organization_id: u.organization_id });

function authenticate(req, { optional = false } = {}) {
  const header = req.headers.authorization ?? "";
  const [, token] = header.match(/^Bearer (.+)$/) ?? [];
  const [kind, id, issued] = (token ?? "").split(".");
  const user = db.users.find((u) => u.id === id);
  const fresh = Date.now() - Number(issued) < ACCESS_TTL_SECONDS * 1000;
  if (kind === "acc" && user && fresh) return user;
  if (optional) return null;
  throw new ApiError(401, "UNAUTHENTICATED", "Please sign in again.");
}

function requireRole(user, ...roles) {
  if (!roles.includes(user.role)) throw new ApiError(403, "FORBIDDEN", "You do not have access to this.");
}

/** Organizer scoping: another organization's contest is a 404, never a 403. */
function scopedContest(user, id) {
  const c = contestOf(id);
  const visible = c && (user.role === "admin" || (user.role === "organizer" && c.organization_id === user.organization_id));
  if (!visible) throw new ApiError(404, "CONTEST_NOT_FOUND", "That contest does not exist.");
  return c;
}

function canSeeCandidate(user, c) {
  if (!c) return false;
  if (user.role === "admin") return true;
  if (user.role === "candidate") return c.user_id === user.id;
  return contestOf(c.contest_id)?.organization_id === user.organization_id;
}

function scopedCandidate(user, id) {
  const c = candidateOf(id);
  if (!canSeeCandidate(user, c)) throw new ApiError(404, "CANDIDATE_NOT_FOUND", "We couldn't find that candidate.");
  return c;
}

// ------------------------------------------------------------ vote checks

function votePageFor(slug) {
  const c = db.candidates.find((x) => x.slug === slug);
  if (!c || c.status === "pending_approval") {
    throw new ApiError(404, "CANDIDATE_NOT_FOUND", "We couldn't find that candidate.");
  }
  if (c.status === "disqualified") {
    throw new ApiError(404, "CANDIDATE_DISQUALIFIED", "This candidate has been disqualified from the contest.", { name: c.name });
  }
  const contest = contestOf(c.contest_id);
  const t = Date.now();
  if (contest.status === "draft" || (contest.status === "active" && Date.parse(contest.starts_at) > t)) {
    throw new ApiError(404, "VOTING_NOT_OPEN", "Voting hasn't opened yet.", { starts_at: contest.starts_at });
  }
  if (contest.status === "closed" || Date.parse(contest.ends_at) <= t) {
    throw new ApiError(404, "VOTING_CLOSED", "Voting has closed.", { contest_id: contest.id });
  }
  return { c, contest };
}

// ----------------------------------------------------------- live sockets

const sockets = new Map(); // contest_id -> Set<socket>

function wsFrame(text) {
  const payload = Buffer.from(text);
  const len = payload.length;
  let header;
  if (len < 126) header = Buffer.from([0x81, len]);
  else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, payload]);
}

function send(socket, message) {
  try {
    socket.write(wsFrame(JSON.stringify(message)));
  } catch {
    // A dead socket is dropped by its own close handler.
  }
}

function broadcast(contestId) {
  const set = sockets.get(contestId);
  if (!set?.size) return;
  const frame = { type: "leaderboard", data: buildLeaderboard(contestOf(contestId)) };
  for (const s of set) send(s, frame);
}

function onUpgrade(req, socket) {
  const match = req.url.match(/^\/ws\/contests\/([^/?]+)/);
  const contest = match && contestOf(match[1]);
  const key = req.headers["sec-websocket-key"];
  if (!key) return socket.destroy();
  const accept = crypto.createHash("sha1").update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest("base64");
  socket.write(
    "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n" +
      `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
  );
  if (!contest || contest.status === "draft") {
    // Close frame with code 4404 (BE-12).
    socket.end(Buffer.from([0x88, 0x02, 0x0f, 0xa4]));
    return;
  }
  if (!sockets.has(contest.id)) sockets.set(contest.id, new Set());
  sockets.get(contest.id).add(socket);
  send(socket, { type: "leaderboard", data: buildLeaderboard(contest) });
  const ping = setInterval(() => send(socket, { type: "ping" }), 25_000);
  const drop = () => {
    clearInterval(ping);
    sockets.get(contest.id)?.delete(socket);
  };
  socket.on("close", drop);
  socket.on("error", drop);
  socket.on("data", (buf) => {
    // Opcode 0x8 is the client closing; everything else (pong) is ignored.
    if ((buf[0] & 0x0f) === 0x8) socket.end();
  });
}

function credit(tx) {
  if (tx.status === "success") return; // idempotent, as the real webhook is
  tx.status = "success";
  tx.confirmed_at = now();
  broadcast(tx.contest_id);
}

// ------------------------------------------------------------------- files

function initials(name) {
  return name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function avatarSvg(c) {
  const hue = parseInt(crypto.createHash("md5").update(c.id).digest("hex").slice(0, 2), 16) * 1.4;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="400" height="400" fill="hsl(${hue},35%,78%)"/><text x="200" y="228" font-family="sans-serif" font-size="140" font-weight="600" fill="#14171F" text-anchor="middle">${initials(c.name)}</text></svg>`;
}

function posterSvg(c) {
  const cat = categoryOf(c.category_id);
  const contest = contestOf(c.contest_id);
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
<rect width="1080" height="1350" fill="#F7F6F2"/>
<text x="540" y="110" font-family="sans-serif" font-size="40" fill="#5F6470" text-anchor="middle">${esc(contest.name)}</text>
<rect x="260" y="170" width="560" height="560" rx="40" fill="#E9E7E0"/>
<text x="540" y="505" font-family="sans-serif" font-size="200" font-weight="700" fill="#14171F" text-anchor="middle">${initials(c.name)}</text>
<text x="540" y="830" font-family="sans-serif" font-size="80" font-weight="700" fill="#14171F" text-anchor="middle">${esc(c.name)}</text>
<text x="540" y="900" font-family="sans-serif" font-size="44" fill="#14171F" text-anchor="middle">${esc(cat.name)}</text>
<rect x="0" y="960" width="1080" height="130" fill="#0F8A5F"/>
<text x="540" y="1040" font-family="sans-serif" font-size="52" font-weight="600" fill="#FFFFFF" text-anchor="middle">Vote for ${esc(c.name.split(" ")[0])}</text>
<rect x="415" y="1120" width="250" height="200" fill="#14171F" opacity="0.08"/>
<text x="540" y="1230" font-family="sans-serif" font-size="30" fill="#5F6470" text-anchor="middle">QR code</text>
</svg>`;
}

function paystackPage(tx) {
  const naira = `₦${(tx.amount_kobo / 100).toLocaleString("en-NG")}`;
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mock Paystack</title>
<style>body{font-family:sans-serif;max-width:420px;margin:40px auto;padding:0 16px;color:#14171F}a{display:block;text-align:center;padding:14px;border-radius:8px;margin:12px 0;text-decoration:none;font-weight:600}.pay{background:#0BA4DB;color:#fff}.fail{border:1px solid #ccc;color:#14171F}.slow{color:#5F6470;font-size:14px}</style></head>
<body><p style="color:#5F6470">Mock Paystack checkout</p><h1>Pay ${naira}</h1><p>${tx.vote_count} vote(s) for ${tx.candidate_name}</p>
<a class="pay" href="/mock-paystack/complete?reference=${tx.reference}&outcome=success">Pay ${naira}</a>
<a class="fail" href="/mock-paystack/complete?reference=${tx.reference}&outcome=failed">Decline payment</a>
<a class="slow" href="/mock-paystack/complete?reference=${tx.reference}&outcome=slow">Pay, but the webhook never arrives</a>
</body></html>`;
}

// ------------------------------------------------------------------ routes

const routes = [];
const route = (method, pattern, handler) => {
  const keys = [];
  const re = new RegExp(
    "^" + API + pattern.replace(/:(\w+)/g, (_, k) => (keys.push(k), "([^/]+)")) + "$",
  );
  routes.push({ method, re, keys, handler });
};

const required = (body, field) => {
  const v = body?.[field];
  if (v === undefined || v === null || (typeof v === "string" && !v.trim())) {
    throw new ValidationError(field, "Field required");
  }
  return v;
};

// BE-02
route("POST", "/auth/signup", ({ body }) => {
  const email = String(required(body, "email")).trim().toLowerCase();
  const password = String(required(body, "password"));
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new ValidationError("email", "value is not a valid email address");
  if (password.length < 8) throw new ValidationError("password", "String should have at least 8 characters");
  if (!["organizer", "candidate"].includes(body.role)) throw new ValidationError("role", "Input should be 'organizer' or 'candidate'");
  if (db.users.some((u) => u.email === email)) throw new ApiError(409, "EMAIL_TAKEN", "There's already an account with this email.");
  const user = { id: uuid(), email, password, role: body.role, organization_id: null };
  db.users.push(user);
  return ok({ user: userView(user), ...issue(user) }, "Account created.", 201);
});

route("POST", "/auth/login", ({ body }) => {
  const email = String(body?.email ?? "").trim().toLowerCase();
  const user = db.users.find((u) => u.email === email && u.password === body?.password);
  if (!user) throw new ApiError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
  return ok({ user: userView(user), ...issue(user) }, "Signed in.");
});

route("POST", "/auth/refresh", ({ body }) => {
  const [kind, id] = String(body?.refresh_token ?? "").split(".");
  const user = db.users.find((u) => u.id === id);
  if (kind !== "ref" || !user) throw new ApiError(401, "INVALID_REFRESH_TOKEN", "Please sign in again.");
  const { access_token, token_type } = issue(user);
  return ok({ access_token, token_type }, "Token refreshed.");
});

route("GET", "/auth/me", ({ req }) => ok({ user: userView(authenticate(req)) }));

// BE-03
route("POST", "/organizations", ({ req, body }) => {
  const user = authenticate(req);
  requireRole(user, "organizer");
  const name = String(required(body, "name")).trim();
  if (name.length < 2) throw new ValidationError("name", "String should have at least 2 characters");
  if (user.organization_id) throw new ApiError(409, "ORGANIZATION_EXISTS", "You already have an organization.");
  const org = {
    id: uuid(),
    name,
    contact_email: body.contact_email || null,
    contact_phone: body.contact_phone || null,
    platform_fee_percent: null,
    created_at: now(),
  };
  db.organizations.push(org);
  user.organization_id = org.id;
  return ok({ organization: org, access_token: issue(user).access_token }, "Organization created.", 201);
});

route("GET", "/organizations/:id", ({ req, params }) => {
  const user = authenticate(req);
  const org = orgOf(params.id);
  if (!org || (user.role !== "admin" && user.organization_id !== org.id)) {
    throw new ApiError(404, "ORGANIZATION_NOT_FOUND", "That organization does not exist.");
  }
  return ok({ organization: org });
});

route("POST", "/contests", ({ req, body }) => {
  const user = authenticate(req);
  requireRole(user, "organizer", "admin");
  if (user.role === "organizer" && !user.organization_id) throw new ApiError(409, "NO_ORGANIZATION", "Create your organization first.");
  const name = String(required(body, "name")).trim();
  const starts = Date.parse(required(body, "starts_at"));
  const ends = Date.parse(required(body, "ends_at"));
  if (Number.isNaN(starts)) throw new ValidationError("starts_at", "Input should be a valid datetime");
  if (Number.isNaN(ends) || ends <= starts) throw new ValidationError("ends_at", "ends_at must be after starts_at");
  if (body.caps_votes_per_identity && !body.requires_matric_number) {
    throw new ValidationError("caps_votes_per_identity", "Capping votes per identity needs requires_matric_number");
  }
  const c = {
    id: uuid(),
    organization_id: user.organization_id ?? body.organization_id,
    name,
    status: "draft",
    requires_matric_number: Boolean(body.requires_matric_number),
    caps_votes_per_identity: Boolean(body.caps_votes_per_identity),
    starts_at: iso(starts),
    ends_at: iso(ends),
    platform_fee_percent: null,
    closed_at: null,
    dispute_window_hours: 48,
    created_at: now(),
    updated_at: now(),
  };
  db.contests.push(c);
  return ok({ contest: contestView(c) }, "Contest created.", 201);
});

route("GET", "/contests", ({ req }) => {
  const user = authenticate(req);
  requireRole(user, "organizer", "admin");
  const list = db.contests
    .filter((c) => user.role === "admin" || c.organization_id === user.organization_id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(contestView);
  return ok({ contests: list });
});

route("GET", "/contests/:id", ({ req, params }) => ok({ contest: contestView(scopedContest(authenticate(req), params.id)) }));

route("PATCH", "/contests/:id", ({ req, params, body }) => {
  const c = scopedContest(authenticate(req), params.id);
  if (c.status === "closed") throw new ApiError(409, "CONTEST_LOCKED", "This contest is closed and can no longer be changed.");
  if (c.status === "active") {
    for (const f of ["requires_matric_number", "caps_votes_per_identity", "starts_at"]) {
      if (f in body && body[f] !== c[f]) throw new ApiError(409, "CONTEST_LOCKED", "Voting has started, so the voter rules and start time are locked.");
    }
  }
  if (body.status && body.status !== c.status) {
    const next = { draft: "active", active: "closed" }[c.status];
    if (body.status !== next) {
      throw new ApiError(409, "INVALID_STATUS_TRANSITION", `This contest is ${c.status} and cannot move to ${body.status}.`);
    }
    if (next === "active") {
      const cats = db.categories.filter((x) => x.contest_id === c.id).length;
      const packs = db.packages.filter((x) => x.contest_id === c.id).length;
      if (!cats || !packs) {
        const missing = [!cats && "one category", !packs && "one vote package"].filter(Boolean).join(" and ");
        throw new ApiError(409, "CONTEST_NOT_READY", `Add at least ${missing} before opening voting.`);
      }
    }
    c.status = body.status;
    if (c.status === "closed") {
      c.closed_at = now();
      createSettlements(c);
    }
  }
  if (body.name) c.name = String(body.name).trim();
  if (body.ends_at) {
    const ends = Date.parse(body.ends_at);
    if (Number.isNaN(ends) || ends <= Date.parse(c.starts_at)) throw new ValidationError("ends_at", "ends_at must be after starts_at");
    c.ends_at = iso(ends);
  }
  if (c.status === "draft") {
    for (const f of ["requires_matric_number", "caps_votes_per_identity"]) if (f in body) c[f] = Boolean(body[f]);
    if (body.starts_at) c.starts_at = iso(Date.parse(body.starts_at));
  }
  c.updated_at = now();
  broadcast(c.id);
  return ok({ contest: contestView(c) }, "Contest updated.");
});

// BE-04
route("POST", "/contests/:id/categories", ({ req, params, body }) => {
  const c = scopedContest(authenticate(req), params.id);
  if (c.status === "closed") throw new ApiError(409, "CONTEST_CLOSED", "This contest is closed.");
  const name = String(required(body, "name")).trim();
  if (db.categories.some((x) => x.contest_id === c.id && x.name.toLowerCase() === name.toLowerCase())) {
    throw new ApiError(409, "CATEGORY_EXISTS", "This contest already has a category with that name.");
  }
  const cat = { id: uuid(), contest_id: c.id, name, created_at: now() };
  db.categories.push(cat);
  return ok({ category: { ...cat, candidate_count: 0 } }, "Category added.", 201);
});

route("GET", "/contests/:id/categories", ({ req, params }) => {
  const c = scopedContest(authenticate(req), params.id);
  const cats = db.categories
    .filter((x) => x.contest_id === c.id)
    .map((x) => ({ ...x, candidate_count: db.candidates.filter((k) => k.category_id === x.id).length }));
  return ok({ categories: cats });
});

route("DELETE", "/contests/:id/categories/:cid", ({ req, params }) => {
  const c = scopedContest(authenticate(req), params.id);
  if (c.status !== "draft") throw new ApiError(409, "CONTEST_LOCKED", "Categories can only be removed while the contest is a draft.");
  if (db.candidates.some((k) => k.category_id === params.cid)) throw new ApiError(409, "CATEGORY_HAS_CANDIDATES", "This category already has candidates.");
  db.categories = db.categories.filter((x) => x.id !== params.cid);
  return { status: 204, body: null };
});

function featureOnly(contestId, packageId) {
  for (const p of db.packages) if (p.contest_id === contestId) p.is_featured = p.id === packageId;
}

route("POST", "/contests/:id/vote-packages", ({ req, params, body }) => {
  const c = scopedContest(authenticate(req), params.id);
  if (c.status === "closed") throw new ApiError(409, "CONTEST_CLOSED", "This contest is closed.");
  const amount = required(body, "amount_kobo");
  const votes = required(body, "vote_count");
  if (!Number.isInteger(amount) || amount <= 0) throw new ValidationError("amount_kobo", "Input should be a positive integer");
  if (!Number.isInteger(votes) || votes <= 0) throw new ValidationError("vote_count", "Input should be a positive integer");
  const label = String(required(body, "label")).trim().slice(0, 64);
  if (db.packages.some((p) => p.contest_id === c.id && p.amount_kobo === amount)) {
    throw new ApiError(409, "VOTE_PACKAGE_EXISTS", "There is already a package at that price.");
  }
  const pack = { id: uuid(), contest_id: c.id, amount_kobo: amount, vote_count: votes, label, is_featured: false, created_at: now() };
  db.packages.push(pack);
  if (body.is_featured) featureOnly(c.id, pack.id);
  return ok({ vote_package: pack }, "Vote package added.", 201);
});

route("GET", "/contests/:id/vote-packages", ({ req, params }) => {
  const c = scopedContest(authenticate(req), params.id);
  return ok({ vote_packages: packagesOf(c.id) });
});

route("PATCH", "/contests/:id/vote-packages/:pid", ({ req, params, body }) => {
  const c = scopedContest(authenticate(req), params.id);
  const pack = db.packages.find((p) => p.id === params.pid && p.contest_id === c.id);
  if (!pack) throw new ApiError(404, "VOTE_PACKAGE_NOT_FOUND", "That vote package does not exist.");
  if (body.label) pack.label = String(body.label).slice(0, 64);
  if (body.is_featured === true) featureOnly(c.id, pack.id);
  if (body.is_featured === false) pack.is_featured = false;
  return ok({ vote_package: pack }, "Vote package updated.");
});

route("DELETE", "/contests/:id/vote-packages/:pid", ({ req, params }) => {
  const c = scopedContest(authenticate(req), params.id);
  if (c.status !== "draft") throw new ApiError(409, "CONTEST_LOCKED", "Packages can only be removed while the contest is a draft.");
  db.packages = db.packages.filter((p) => p.id !== params.pid);
  return { status: 204, body: null };
});

// BE-05
route("GET", "/contests/:id/application", ({ req, params }) => {
  authenticate(req);
  const c = contestOf(params.id);
  if (!c) throw new ApiError(404, "CONTEST_NOT_FOUND", "That contest does not exist.");
  return ok({
    contest: { id: c.id, name: c.name, status: c.status, requires_matric_number: c.requires_matric_number },
    organization: { name: orgOf(c.organization_id).name },
    categories: db.categories.filter((x) => x.contest_id === c.id).map(({ id, name }) => ({ id, name })),
  });
});

route("POST", "/candidates", async ({ req, form }) => {
  const user = authenticate(req);
  requireRole(user, "candidate");
  const cat = categoryOf(form.get("category_id"));
  if (!cat) throw new ApiError(404, "CATEGORY_NOT_FOUND", "That category does not exist.");
  const contest = contestOf(cat.contest_id);
  if (contest.status === "closed") throw new ApiError(409, "CONTEST_CLOSED", "Applications for this contest have closed.");
  if (db.candidates.some((c) => c.user_id === user.id && c.contest_id === contest.id)) {
    throw new ApiError(409, "ALREADY_APPLIED", "You've already applied to this contest.");
  }
  const name = String(form.get("name") ?? "").trim();
  if (!name) throw new ValidationError("name", "Field required");
  const photo = form.get("photo");
  if (!photo || typeof photo === "string") throw new ValidationError("photo", "Field required");
  if (!["image/jpeg", "image/png"].includes(photo.type)) throw new ApiError(422, "PHOTO_INVALID", "Photos must be JPEG or PNG.");
  if (photo.size > 5 * 1024 * 1024) throw new ApiError(422, "PHOTO_INVALID", "Photos must be 5 MB or smaller.");
  const id = uuid();
  db.files.set(id, { type: photo.type, body: Buffer.from(await photo.arrayBuffer()) });
  const c = {
    id: uuid(),
    category_id: cat.id,
    contest_id: contest.id,
    user_id: user.id,
    name,
    slug: slugify(name),
    bio: String(form.get("bio") ?? "").trim().slice(0, 500) || null,
    matric_number: String(form.get("matric_number") ?? "").trim().toUpperCase() || null,
    photo_url: `${SELF}/mock-files/${id}`,
    poster_url: null,
    status: "pending_approval",
    disqualification_reason: null,
    created_at: now(),
    updated_at: now(),
  };
  db.candidates.push(c);
  return ok({ candidate: candidateView(c) }, "Application sent.", 201);
});

route("GET", "/candidates/me", ({ req }) => {
  const user = authenticate(req);
  requireRole(user, "candidate");
  const list = db.candidates
    .filter((c) => c.user_id === user.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((c) => ({ ...candidateView(c), contest_name: contestOf(c.contest_id).name }));
  return ok({ candidates: list });
});

route("GET", "/candidates/:id", ({ req, params }) => ok({ candidate: candidateView(scopedCandidate(authenticate(req), params.id)) }));

route("GET", "/contests/:id/candidates", ({ req, params, query }) => {
  const c = scopedContest(authenticate(req), params.id);
  const list = db.candidates
    .filter((k) => k.contest_id === c.id)
    .filter((k) => !query.get("status") || k.status === query.get("status"))
    .filter((k) => !query.get("category_id") || k.category_id === query.get("category_id"))
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map(candidateView);
  return ok({ candidates: list });
});

function renderPosterSoon(c, ms = 4000) {
  setTimeout(() => {
    c.poster_url = `${SELF}/mock-files/poster/${c.id}.svg?v=${Date.now()}`;
    c.updated_at = now();
  }, ms);
}

route("PATCH", "/candidates/:id/approve", ({ req, params }) => {
  const user = authenticate(req);
  requireRole(user, "organizer", "admin");
  const c = scopedCandidate(user, params.id);
  if (c.status !== "pending_approval") {
    throw new ApiError(409, "INVALID_STATUS_TRANSITION", `This candidate is already ${c.status.replace("_", " ")}.`);
  }
  c.status = "approved";
  c.updated_at = now();
  renderPosterSoon(c);
  broadcast(c.contest_id);
  return ok({ candidate: candidateView(c) }, "Candidate approved.");
});

route("PATCH", "/candidates/:id/disqualify", ({ req, params, body }) => {
  const user = authenticate(req);
  requireRole(user, "organizer", "admin");
  const c = scopedCandidate(user, params.id);
  const reason = String(body?.reason ?? "").trim();
  if (reason.length < 5) throw new ValidationError("reason", "String should have at least 5 characters");
  if (c.status === "disqualified") throw new ApiError(409, "INVALID_STATUS_TRANSITION", "This candidate is already disqualified.");
  c.status = "disqualified";
  c.disqualification_reason = reason;
  c.updated_at = now();
  broadcast(c.contest_id);
  return ok({ candidate: candidateView(c) }, "Candidate disqualified.");
});

// BE-07
route("POST", "/candidates/:id/poster/regenerate", ({ req, params }) => {
  const c = scopedCandidate(authenticate(req), params.id);
  if (c.status !== "approved") throw new ApiError(409, "CANDIDATE_NOT_APPROVED", "Only approved candidates have a poster.");
  const last = db.regenerateAt.get(c.id) ?? 0;
  if (Date.now() - last < 60_000) throw new ApiError(429, "RATE_LIMITED", "Please wait a minute before regenerating again.");
  db.regenerateAt.set(c.id, Date.now());
  renderPosterSoon(c, 8000);
  return ok({ queued: true }, "Poster queued.", 202);
});

// BE-06
const BANKS = [
  ["Access Bank", "044"], ["Ecobank Nigeria", "050"], ["Fidelity Bank", "070"], ["First Bank of Nigeria", "011"],
  ["First City Monument Bank", "214"], ["Guaranty Trust Bank", "058"], ["Kuda Bank", "50211"], ["Moniepoint MFB", "50515"],
  ["OPay", "999992"], ["PalmPay", "999991"], ["Polaris Bank", "076"], ["Stanbic IBTC Bank", "221"], ["Sterling Bank", "232"],
  ["Union Bank of Nigeria", "032"], ["United Bank For Africa", "033"], ["Wema Bank", "035"], ["Zenith Bank", "057"],
].map(([name, code]) => ({ name, code }));

route("GET", "/banks", ({ req }) => {
  authenticate(req);
  return ok({ banks: [...BANKS].sort((a, b) => a.name.localeCompare(b.name)) });
});

function ownCandidate(req, id) {
  const user = authenticate(req);
  const c = candidateOf(id);
  if (!c || c.user_id !== user.id) throw new ApiError(404, "CANDIDATE_NOT_FOUND", "We couldn't find that candidate.");
  return c;
}

route("POST", "/candidates/:id/bank-account/resolve", ({ req, params, body }) => {
  const c = ownCandidate(req, params.id);
  const bank = BANKS.find((b) => b.code === body?.bank_code);
  if (!bank) throw new ValidationError("bank_code", "Unknown bank code");
  const number = String(body?.account_number ?? "");
  if (!/^\d{10}$/.test(number)) throw new ValidationError("account_number", "Account number must be exactly 10 digits");
  if (number.startsWith("999")) {
    throw new ApiError(503, "PAYMENT_PROVIDER_UNAVAILABLE", "Bank verification is temporarily unavailable. Please try again in a minute.");
  }
  if (number.startsWith("000")) {
    throw new ApiError(422, "ACCOUNT_NOT_RESOLVED", "We could not find an account with that number at that bank. Check both and try again.");
  }
  const sub = {
    bank_code: bank.code,
    bank_name: bank.name,
    account_number: number,
    account_name: `${c.name.toUpperCase()} OLUWASEUN`,
    status: "pending",
    subaccount_code: null,
    percentage_charge: null,
  };
  db.subaccounts.set(c.id, sub);
  const view = bankView(sub);
  delete view.subaccount_code;
  return ok(view, "Account resolved.");
});

route("POST", "/candidates/:id/bank-account/confirm", ({ req, params }) => {
  const c = ownCandidate(req, params.id);
  const sub = db.subaccounts.get(c.id);
  if (!sub?.account_name) throw new ApiError(409, "BANK_ACCOUNT_NOT_RESOLVED", "Verify the account number first.");
  if (sub.status === "verified") return ok(bankView(sub), "Bank account linked.");
  if (sub.account_number.startsWith("888")) {
    throw new ApiError(422, "SUBACCOUNT_REJECTED", "Paystack could not set up payouts to this account. Try a different account.");
  }
  sub.status = "verified";
  sub.subaccount_code = `ACCT_${crypto.randomBytes(5).toString("hex")}`;
  sub.percentage_charge = FEE_PERCENT;
  return ok(bankView(sub), "Bank account linked.");
});

route("GET", "/candidates/:id/bank-account", ({ req, params }) => {
  const c = scopedCandidate(authenticate(req), params.id);
  const sub = db.subaccounts.get(c.id);
  if (!sub) throw new ApiError(404, "BANK_ACCOUNT_NOT_LINKED", "No bank account linked yet.");
  return ok(bankView(sub));
});

// BE-08
route("GET", "/vote/:slug", ({ params }) => {
  const { c, contest } = votePageFor(params.slug);
  return ok({
    candidate: { id: c.id, name: c.name, slug: c.slug, photo_url: c.photo_url, poster_url: c.poster_url, bio: c.bio },
    category: { id: c.category_id, name: categoryOf(c.category_id).name },
    contest: {
      id: contest.id,
      name: contest.name,
      requires_matric_number: contest.requires_matric_number,
      caps_votes_per_identity: contest.caps_votes_per_identity,
      ends_at: contest.ends_at,
    },
    organization: { name: orgOf(contest.organization_id).name },
    vote_packages: packagesOf(contest.id).map(({ id, amount_kobo, vote_count, label, is_featured }) => ({
      id, amount_kobo, vote_count, label, is_featured,
    })),
    can_vote: db.subaccounts.get(c.id)?.status === "verified",
  });
});

// BE-09
route("POST", "/vote/:slug/checkout", ({ params, body }) => {
  const { c, contest } = votePageFor(params.slug);
  if (db.subaccounts.get(c.id)?.status !== "verified") {
    throw new ApiError(409, "CANDIDATE_CANNOT_RECEIVE_VOTES", "This candidate can't receive votes yet.");
  }
  const pack = db.packages.find((p) => p.id === body?.vote_package_id && p.contest_id === contest.id);
  if (!pack) throw new ApiError(404, "VOTE_PACKAGE_NOT_FOUND", "That vote package does not exist.");
  let matric = null;
  if (contest.requires_matric_number) {
    matric = String(body?.voter_matric_number ?? "").trim().toUpperCase();
    if (!matric) throw new ApiError(422, "MATRIC_NUMBER_REQUIRED", "Enter your matric number to vote.");
    if (contest.caps_votes_per_identity) {
      const used = db.transactions.some(
        (t) => t.contest_id === contest.id && t.voter_matric_number === matric && t.status !== "failed",
      );
      if (used) throw new ApiError(409, "MATRIC_NUMBER_ALREADY_VOTED", "This matric number has already voted in this contest.");
    }
  }
  const tx = {
    id: uuid(),
    reference: `blt_${crypto.randomBytes(12).toString("hex")}`,
    candidate_id: c.id,
    contest_id: contest.id,
    vote_package_id: pack.id,
    amount_kobo: pack.amount_kobo,
    vote_count: pack.vote_count,
    status: "pending",
    voter_matric_number: matric,
    confirmed_at: null,
    created_at: now(),
    slug: c.slug,
  };
  db.transactions.push(tx);
  if (matric === "DOWN") {
    tx.status = "failed";
    throw new ApiError(503, "PAYMENT_PROVIDER_UNAVAILABLE", "Payment is temporarily unavailable. Nothing was charged. Please try again.");
  }
  return ok({
    authorization_url: `${SELF}/mock-paystack?reference=${tx.reference}`,
    reference: tx.reference,
    amount_kobo: tx.amount_kobo,
    vote_count: tx.vote_count,
  }, "Checkout started.");
});

// BE-10
route("GET", "/vote/transactions/:reference", ({ params }) => {
  const tx = db.transactions.find((t) => t.reference === params.reference);
  if (!tx) throw new ApiError(404, "TRANSACTION_NOT_FOUND", "We couldn't find that payment.");
  const c = candidateOf(tx.candidate_id);
  return ok({
    reference: tx.reference,
    status: tx.status,
    vote_count: tx.status === "success" ? tx.vote_count : 0,
    amount_kobo: tx.amount_kobo,
    candidate: { name: c.name, slug: c.slug },
    contest_id: tx.contest_id,
    confirmed_at: tx.confirmed_at,
  });
});

// BE-11
route("GET", "/contests/:id/leaderboard", ({ params }) => {
  const c = contestOf(params.id);
  if (!c || c.status === "draft") throw new ApiError(404, "CONTEST_NOT_FOUND", "That contest does not exist.");
  return ok(buildLeaderboard(c));
});

// BE-13
route("GET", "/candidates/:id/dashboard", ({ req, params }) => {
  const c = scopedCandidate(authenticate(req), params.id);
  const contest = contestOf(c.contest_id);
  const board = buildLeaderboard(contest);
  const cat = board.categories.find((x) => x.id === c.category_id);
  const row = cat?.candidates.find((x) => x.id === c.id);
  const sub = db.subaccounts.get(c.id);
  const pct = sub?.percentage_charge ?? FEE_PERCENT;
  const gross = grossFor(c.id);
  const fee = feeOf(gross, pct);
  const settlement = db.settlements.find((s) => s.candidate_id === c.id);
  const bank = bankView(sub);
  if (bank) {
    delete bank.bank_code;
    delete bank.subaccount_code;
  }
  return ok({
    candidate: {
      id: c.id, name: c.name, slug: c.slug, status: c.status, photo_url: c.photo_url, poster_url: c.poster_url,
      vote_url: `${WEB}/vote/${c.slug}`, disqualification_reason: c.disqualification_reason,
    },
    category: { id: c.category_id, name: categoryOf(c.category_id).name },
    contest: { id: contest.id, name: contest.name, status: contest.status, starts_at: contest.starts_at, ends_at: contest.ends_at },
    votes: {
      total: votesFor(c.id),
      rank: row?.rank ?? null,
      category_candidate_count: cat?.candidates.filter((x) => x.status === "approved").length ?? 0,
    },
    revenue: {
      gross_kobo: gross,
      platform_fee_percent: pct,
      platform_fee_kobo: fee,
      net_kobo: gross - fee,
      successful_transactions: db.transactions.filter((t) => t.candidate_id === c.id && t.status === "success").length,
    },
    bank_account: bank,
    settlement: settlement
      ? { status: settlement.status, amount_kobo: settlement.amount_kobo, actioned_at: settlement.actioned_at }
      : null,
  });
});

// BE-14
route("GET", "/organizer/contests/:id/dashboard", ({ req, params }) => {
  const c = scopedContest(authenticate(req), params.id);
  const txs = db.transactions.filter((t) => t.contest_id === c.id);
  const cands = db.candidates.filter((k) => k.contest_id === c.id);
  const count = (s) => cands.filter((k) => k.status === s).length;
  const sumSettled = (s) => db.settlements.filter((x) => x.contest_id === c.id && x.status === s).reduce((a, x) => a + x.amount_kobo, 0);
  return ok({
    contest: contestView(c),
    leaderboard: buildLeaderboard(c),
    revenue: {
      gross_kobo: txs.filter((t) => t.status === "success").reduce((a, t) => a + t.amount_kobo, 0),
      platform_fee_kobo: cands.reduce((a, k) => a + feeOf(grossFor(k.id), db.subaccounts.get(k.id)?.percentage_charge ?? FEE_PERCENT), 0),
      successful_transactions: txs.filter((t) => t.status === "success").length,
      pending_transactions: txs.filter((t) => t.status === "pending").length,
      failed_transactions: txs.filter((t) => t.status === "failed").length,
    },
    candidates: { pending_approval: count("pending_approval"), approved: count("approved"), disqualified: count("disqualified") },
    approval_queue: cands.filter((k) => k.status === "pending_approval").slice(0, 50).map(candidateView),
    settlement: {
      held_kobo: sumSettled("held"),
      released_kobo: sumSettled("released"),
      reversed_kobo: sumSettled("reversed"),
      candidates_pending_release: db.settlements.filter((x) => x.contest_id === c.id && x.status === "held").length,
    },
  });
});

// BE-15
function releasable(s) {
  const c = candidateOf(s.candidate_id);
  return s.status === "held" && c.status === "approved" && db.subaccounts.get(c.id)?.status === "verified" && s.amount_kobo > 0;
}

route("GET", "/organizer/contests/:id/settlements", ({ req, params }) => {
  const c = scopedContest(authenticate(req), params.id);
  const rows = db.settlements.filter((s) => s.contest_id === c.id);
  const sum = (f) => rows.filter(f).reduce((a, s) => a + s.amount_kobo, 0);
  return ok({
    contest: {
      id: c.id,
      name: c.name,
      status: c.status,
      closed_at: c.closed_at,
      dispute_window_hours: c.dispute_window_hours,
      release_available_at: c.closed_at ? iso(Date.parse(c.closed_at) + c.dispute_window_hours * HOUR) : null,
    },
    totals: {
      held_kobo: sum((s) => s.status === "held"),
      released_kobo: sum((s) => s.status === "released"),
      reversed_kobo: sum((s) => s.status === "reversed"),
      releasable_kobo: sum(releasable),
      releasable_candidates: rows.filter(releasable).length,
    },
    settlements: rows.map((s) => {
      const k = candidateOf(s.candidate_id);
      return {
        id: s.id,
        amount_kobo: s.amount_kobo,
        status: s.status,
        actioned_by: s.actioned_by,
        actioned_at: s.actioned_at,
        provider_reference: s.provider_reference,
        failure_reason: s.failure_reason,
        candidate: { id: k.id, name: k.name, slug: k.slug, status: k.status },
      };
    }),
  });
});

route("POST", "/organizer/contests/:id/settlements/release", ({ req, params }) => {
  const user = authenticate(req);
  const c = scopedContest(user, params.id);
  if (c.status !== "closed") throw new ApiError(409, "CONTEST_NOT_CLOSED", "Voting is still open. Close the contest first.");
  const available = Date.parse(c.closed_at) + c.dispute_window_hours * HOUR;
  if (Date.now() < available) {
    throw new ApiError(409, "DISPUTE_WINDOW_OPEN", "The dispute window is still open.", { release_available_at: iso(available) });
  }
  const held = db.settlements.filter((s) => s.contest_id === c.id && s.status === "held");
  if (!held.length) throw new ApiError(409, "NOTHING_TO_RELEASE", "There is nothing left to release.");
  const result = { released: 0, reversed: 0, skipped: [], failed: [], released_kobo: 0 };
  for (const s of held) {
    const k = candidateOf(s.candidate_id);
    if (k.status === "disqualified") {
      Object.assign(s, { status: "reversed", actioned_by: user.id, actioned_at: now() });
      result.reversed++;
    } else if (db.subaccounts.get(k.id)?.status !== "verified") {
      result.skipped.push({ candidate_id: k.id, reason: "no_verified_bank_account" });
    } else if (s.amount_kobo === 0) {
      result.skipped.push({ candidate_id: k.id, reason: "nothing_to_pay" });
    } else if (db.releaseFailuresLeft.delete(k.id)) {
      s.failure_reason = "Paystack: insufficient balance";
      result.failed.push({ candidate_id: k.id, reason: s.failure_reason });
    } else {
      Object.assign(s, {
        status: "released",
        actioned_by: user.id,
        actioned_at: now(),
        provider_reference: `TRF_${crypto.randomBytes(6).toString("hex")}`,
        failure_reason: null,
      });
      result.released++;
      result.released_kobo += s.amount_kobo;
    }
  }
  return ok(result, "Settlement processed.");
});

// ------------------------------------------------------------------ server

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function write(res, status, body, origin) {
  res.writeHead(status, {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Credentials": "true",
    "Content-Type": "application/json",
  });
  res.end(body === null ? undefined : JSON.stringify(body));
}

async function handle(req, res) {
  const url = new URL(req.url, SELF);
  const origin = req.headers.origin;

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": origin ?? "*",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Authorization,Content-Type",
    });
    return res.end();
  }

  // Mock only: files and the fake Paystack checkout.
  if (url.pathname.startsWith("/mock-files/")) {
    const [, , kind, name = ""] = url.pathname.split("/");
    const id = name.replace(/\.svg$/, "");
    let file;
    if (kind === "avatar" && candidateOf(id)) file = { type: "image/svg+xml", body: avatarSvg(candidateOf(id)) };
    else if (kind === "poster" && candidateOf(id)) file = { type: "image/svg+xml", body: posterSvg(candidateOf(id)) };
    else file = db.files.get(kind);
    if (!file) return write(res, 404, { detail: "not found" }, origin);
    res.writeHead(200, { "Content-Type": file.type, "Access-Control-Allow-Origin": "*" });
    return res.end(file.body);
  }
  if (url.pathname === "/mock-paystack") {
    const tx = db.transactions.find((t) => t.reference === url.searchParams.get("reference"));
    if (!tx) return write(res, 404, { detail: "unknown reference" }, origin);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(paystackPage({ ...tx, candidate_name: candidateOf(tx.candidate_id).name }));
  }
  if (url.pathname === "/mock-paystack/complete") {
    const tx = db.transactions.find((t) => t.reference === url.searchParams.get("reference"));
    if (!tx) return write(res, 404, { detail: "unknown reference" }, origin);
    const outcome = url.searchParams.get("outcome");
    // The webhook lands a few seconds after the redirect, as it does for real.
    if (outcome === "success") setTimeout(() => credit(tx), 3000);
    if (outcome === "failed") tx.status = "failed";
    res.writeHead(302, { Location: `${WEB}/vote/${tx.slug}/confirm?reference=${tx.reference}` });
    return res.end();
  }

  for (const r of routes) {
    if (r.method !== req.method) continue;
    const m = url.pathname.match(r.re);
    if (!m) continue;
    const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
    try {
      const raw = await readBody(req);
      const type = req.headers["content-type"] ?? "";
      let body = {};
      let form = null;
      if (type.startsWith("multipart/form-data")) {
        form = await new Request(url, { method: req.method, headers: { "content-type": type }, body: raw }).formData();
      } else if (raw.length) {
        try {
          body = JSON.parse(raw.toString());
        } catch {
          throw new ValidationError("body", "JSON decode error");
        }
      }
      const out = await r.handler({ req, params, body, form, query: url.searchParams });
      return write(res, out.status, out.body, origin);
    } catch (err) {
      if (err.body) return write(res, err.status, err.body, origin);
      console.error(err);
      return write(res, 500, { detail: { code: "INTERNAL", message: "Mock server error." } }, origin);
    }
  }
  write(res, 404, { detail: "Not Found" }, origin);
}

seed();
const server = http.createServer((req, res) => void handle(req, res));
server.on("upgrade", onUpgrade);
server.listen(PORT, () => {
  console.log(`Balotly mock API on ${SELF}${API}`);
  console.log("Sign in: organizer@balotly.test / candidate@balotly.test, password password123");
  console.log(`Vote page: ${WEB}/vote/adeoye-toheeb   Leaderboard: ${WEB}/contests/${sid(21)}/leaderboard`);
});

if (process.env.MOCK_LIVE === "1") {
  setInterval(() => {
    const pool = db.candidates.filter((c) => c.contest_id === sid(21) && c.status === "approved");
    const c = pool[Math.floor(Math.random() * pool.length)];
    const pack = packagesOf(sid(21))[Math.floor(Math.random() * 3)];
    const tx = {
      id: uuid(), reference: `blt_live${crypto.randomBytes(8).toString("hex")}`, candidate_id: c.id, contest_id: sid(21),
      vote_package_id: pack.id, amount_kobo: pack.amount_kobo, vote_count: pack.vote_count, status: "pending",
      voter_matric_number: null, confirmed_at: null, created_at: now(), slug: c.slug,
    };
    db.transactions.push(tx);
    credit(tx);
  }, 5000);
}
