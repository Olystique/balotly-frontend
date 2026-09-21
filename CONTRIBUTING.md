# Contributing

How work lands in this repository. Read this and `CLAUDE.md` before picking
up an issue. `CLAUDE.md` has the design rules; this file has the mechanics.

## Issues and branches

Every piece of work is a GitHub issue named `[FE-xx] Title`. Take the issue
you are assigned, branch from `development` as `feature/fe-xx-short-name`,
and open a pull request back to `development` when it is done. `main` is
promoted from `development` by the owner; never target it directly. One
issue per pull request. Put `Closes #N` in the PR body so the issue closes
when it merges.

Do not start an issue whose "Depends on" issues are not merged yet. Backend
dependencies are listed too; if the backend endpoint is not merged, build
against the response shape in the backend issue and say so in your PR.

## Layout

* `src/app/` is the App Router. Public voter routes live under `src/app/vote/`
  and `src/app/contests/`. Candidate routes under `src/app/candidate/`,
  organizer routes under `src/app/organizer/`.
* `src/components/ui/` holds the shared primitives (`Button`, `Input`,
  `Skeleton`). Add a primitive there only when a second screen needs it.
* Screen specific components live next to their route in a `components/`
  folder, or as a sibling file when there is only one.
* `src/lib/api.ts` is the only place that knows the API base URL and the
  response envelope. Every request goes through it.
* `src/lib/money.ts` is the only place kobo becomes naira.
* `tests/` has the unit tests (`npm test`). Layout is verified by hand at
  360px and by the screenshot in every PR.

## Talking to the API

The backend base URL is `NEXT_PUBLIC_API_BASE_URL` (default
`http://localhost:8001/api/v1`). Successful responses are wrapped:

```json
{ "status_code": 200, "success": true, "message": "...", "data": { } }
```

Errors are:

```json
{ "detail": { "code": "VOTING_CLOSED", "message": "Voting has closed." } }
```

`src/lib/api.ts` unwraps `data` on success and throws an `ApiError` with
`code`, `message` and `status` on failure. Screens branch on `code`, never
on the message text. Every backend issue lists the codes its endpoints
return; those are the strings you switch on.

Pydantic validation failures come back as FastAPI's default `422` body; treat
any `422` as "the input needs fixing" and show the field errors.

## States every screen designs for

Loading (skeleton in the shape of the content), empty, error (plain
language, what happened and what it means for the user), and success. A
button that triggers an async action shows its own loading state and blocks
double taps. See `src/app/preview/design-system` for the primitives in every
state.

## Before you open a pull request

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

CI runs the same. A red CI is not ready for review.

## Pull request body

Say what changed and why, in terms of what the user sees. List the
acceptance criteria from the issue and tick the ones you verified, and say
how (which device width, which states you exercised). Attach a 360px
screenshot of each new screen. If you made a call the issue did not cover,
say so.
