import Link from "next/link";

/**
 * Header for the candidate and organizer areas: the wordmark back to home
 * and a sign out that posts a form, so it works before JavaScript loads.
 */
export function AppHeader({ home }: { home: string }) {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
        <Link href={home} className="font-display text-xl font-semibold tracking-tight">
          Balotly
        </Link>
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="inline-flex min-h-tap items-center text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
