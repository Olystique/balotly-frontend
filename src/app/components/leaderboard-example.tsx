/**
 * A still of the live leaderboard, made of the same shapes FE-04 will use.
 *
 * Not interactive and not a screenshot: the numbers are display type in
 * gold, the names are body type, and the rank leads, which is exactly the
 * hierarchy the real screen has. FE-04 should swap this for its row
 * component once that exists.
 */
const rows = [
  { rank: 1, votes: "4,812", name: "Adeoye Toheeb" },
  { rank: 2, votes: "3,101", name: "Chika Obi" },
  { rank: 3, votes: "1,240", name: "Musa Bello" },
];

export function LeaderboardExample() {
  return (
    <figure className="flex flex-col gap-3">
      <ol className="divide-y divide-line rounded-lg border border-line bg-surface" aria-label="Example leaderboard">
        {rows.map((row) => (
          <li key={row.rank} className="flex items-center gap-4 px-4 py-3">
            <span className="w-6 shrink-0 font-display text-xl font-semibold text-muted">
              {row.rank}
            </span>
            <span
              className={`w-20 shrink-0 font-display text-2xl font-semibold tabular-nums ${
                row.rank === 1 ? "text-gold" : "text-ink"
              }`}
            >
              {row.votes}
            </span>
            <span className="truncate text-base">{row.name}</span>
          </li>
        ))}
      </ol>
      <figcaption className="text-sm text-muted">What a live leaderboard looks like.</figcaption>
    </figure>
  );
}
