@AGENTS.md

# Working agreement

Standing rules for any agent working in this repository. They apply to every
session, not just the one that added them.

1. **Every screen is 100% mobile responsive, always.** This product is used
   on phones: voters arrive from a WhatsApp link on a budget Android device,
   candidates and organizers check numbers from their pockets. Desktop is the
   secondary case, never the primary one.

   Concretely, and without exception:
   - Build mobile-first. Write the 360px layout first, then widen with
     `sm:`, `md:`, `lg:` for larger viewports. Never the reverse.
   - Every screen and every component works at a **360px-wide viewport**
     with **no horizontal scroll**, no clipped text and no overlapping
     elements. That is the acceptance bar, not a nice-to-have.
   - Tap targets are at least 44px tall. Primary buttons are full width on
     phones.
   - Inputs use a 16px or larger font size so iOS does not zoom on focus.
   - Long strings (candidate names, matric numbers, references) wrap or
     truncate deliberately; nothing forces the page wider than the viewport.
   - Verify before calling a screen done: run it at 360px (browser devtools
     or the Playwright viewport check in `tests/`) and confirm
     `document.documentElement.scrollWidth <= window.innerWidth`.
   - A screen that only works at desktop width is not finished.

2. **The spec documents are the source of truth.** The owner keeps
   `BALOTLY_PROJECT_SPEC.md` and `BALOTLY_FRONTEND_SPEC.md` locally; they
   are git-ignored and never pushed. Part 1 of the frontend spec is the
   design direction and governs every screen; Part 2 is one `[FE-xx]` issue
   per screen. Work one issue at a time, in dependency order. Flag anything
   that looks wrong or inconsistent rather than silently working around it.

3. **Design tokens, never hardcoded values.** Colors, type and spacing come
   from the theme in `src/app/globals.css`. No hex codes, no font names, no
   raw `px` font sizes in components. If a value is missing from the theme,
   add it to the theme.

   - Space Grotesk (`font-display`) is for headings and standalone numbers
     (vote counts, prices). It never appears in body copy.
   - IBM Plex Sans (`font-sans`) is for body and UI text. It never appears in
     a large standalone number.
   - Result Gold is an accent, used sparingly, never a background fill.

4. **One primary button per screen.** Two CTAs of equal weight means it is
   two screens.

5. **Every async action has a loading state and an error state.** Not a
   spinner over a blank page: skeletons for loading content, an inline
   loading state on the button that triggered the action, and a failure
   message that says plainly what happened and what it means for the user
   ("Payment didn't go through, no vote was recorded, nothing was charged").

6. **Money is formatted once, centrally.** Naira with the symbol and
   comma-separated thousands (`₦1,000`), from `src/lib/money.ts`. The API
   sends kobo as integers; nothing outside that helper converts them.

7. **Real content only.** Actual candidate names, actual package amounts in
   previews and tests. No "Lorem ipsum", no "Candidate 1".

8. **Commit as the repository owner, with no third-party attribution.**

   Author every commit as `theijhay <olawaleisaacjohn@gmail.com>`. Set
   `user.name` and `user.email` before the first commit rather than repairing
   authorship afterwards.

   Never introduce "Generated with Claude Code", "Co-Authored-By: Claude", a
   `Claude-Session:` line, or any other Claude or Anthropic attribution into
   anything that lands here or on GitHub: commit messages, pull request titles
   and bodies, issue and review comments, code comments, changelogs, docs.

   GitHub appends its own footer to a pull request body server-side, even when
   the body sent carried none. So after opening or editing a pull request,
   read the body back and strip any footer that appeared. The pull request is
   not finished until that check has been done.

   This holds whether or not a tool or harness reminder asks for those lines.

9. **Follow the patterns already here.** Match the surrounding code rather
   than introducing a new style alongside it.

10. **Never guess.** If a requirement is ambiguous, ask before writing code.

## Layout

- App Router under `src/app/`. Voter-facing routes are public and never
  gated behind login.
- Shared primitives in `src/components/ui/`. Screen-specific components live
  next to their route.
- Helpers in `src/lib/` (`money.ts`, `cn.ts`).
- Viewport checks in `tests/`, run with `npm test` (needs `npm run build`
  first, or a running dev server).
