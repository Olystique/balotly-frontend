import type { Metadata } from "next";
import { VoteScreen } from "./components/vote-screen";
import { Unavailable } from "./components/unavailable";
import { loadVotePage } from "./data";

type Props = { params: Promise<{ slug: string }> };

/**
 * The public vote page (FE-02). No sign in, ever. Rendered on the server so
 * the Open Graph tags carry the poster: that is what WhatsApp shows when the
 * link is shared, and it is most of why a candidate shares this link at all.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { page, error } = await loadVotePage(slug);
  if (!page) {
    const title = {
      VOTING_CLOSED: "Voting has closed",
      VOTING_NOT_OPEN: "Voting hasn't opened yet",
      CANDIDATE_DISQUALIFIED: "Candidate disqualified",
    }[error.code] ?? "Candidate not found";
    return { title: `${title} · Balotly` };
  }
  const { candidate, category, contest } = page;
  const title = `${candidate.name} · ${category.name}`;
  const description = `Vote for ${candidate.name.split(" ")[0]} in ${contest.name}. Confirmed instantly after payment.`;
  const image = candidate.poster_url
    ? { url: candidate.poster_url, width: 1080, height: 1350, alt: `${candidate.name} campaign poster` }
    : candidate.photo_url
      ? { url: candidate.photo_url, alt: candidate.name }
      : undefined;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `/vote/${candidate.slug}`,
      images: image ? [image] : undefined,
    },
    twitter: { card: "summary_large_image", title, description, images: image ? [image.url] : undefined },
  };
}

export default async function VotePageRoute({ params }: Props) {
  const { slug } = await params;
  const { page, error } = await loadVotePage(slug);

  return (
    <main className="mx-auto flex w-full max-w-voter flex-1 flex-col gap-6 px-4 pb-10 pt-5">
      <p className="truncate text-sm text-muted">
        <span className="font-display font-semibold text-ink">Balotly</span>
        {page && <> · {page.contest.name}</>}
      </p>
      {page ? (
        <VoteScreen page={page} />
      ) : error.code === "CANDIDATE_DISQUALIFIED" ? (
        <Unavailable code="CANDIDATE_DISQUALIFIED" name={error.field("name")} />
      ) : error.code === "VOTING_NOT_OPEN" ? (
        <Unavailable code="VOTING_NOT_OPEN" startsAt={error.field("starts_at")} />
      ) : error.code === "VOTING_CLOSED" ? (
        <Unavailable code="VOTING_CLOSED" contestId={error.field("contest_id")} />
      ) : error.status === 404 ? (
        <Unavailable code="CANDIDATE_NOT_FOUND" />
      ) : (
        <Unavailable code="NETWORK_ERROR" />
      )}
    </main>
  );
}
