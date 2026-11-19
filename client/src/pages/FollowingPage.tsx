// WHAT: "/me/following": the clubs and people I follow, each linking to its page,
//   with an Unfollow button. Data from GET /api/me/following.
// WITHOUT IT: You could follow things but never see or tidy up the whole list.
//   (Only YOU see this list. Orbit never shows who follows you, or how many.)
import type { ClubSummary, MyFollowing, UserSummary } from "@orbit/shared";
import { Building2, UsersRound } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import Avatar from "../components/Avatar";
import FollowTabs from "../components/FollowTabs";
import { btnPrimary, btnSecondary, initialOf, textLink } from "../lib/ui";
import { apiGet } from "../lib/api";
import { authClient } from "../lib/auth-client";
import { followClub } from "../lib/clubs";
import { setFollowing } from "../lib/profiles";

export default function FollowingPage() {
  const { data: session, isPending } = authClient.useSession();
  const [data, setData] = useState<MyFollowing | null>(null);
  const [error, setError] = useState<string | null>(null);

  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    let ignore = false;
    apiGet<MyFollowing>("/me/following")
      .then((body) => !ignore && setData(body))
      .catch((err: Error) => !ignore && setError(err.message));
    return () => {
      ignore = true;
    };
  }, [userId]);

  if (isPending) return null;
  if (!session) {
    return (
      <p className="text-gray-700">
        <Link to="/sign-in" className={textLink}>
          Sign in
        </Link>{" "}
        to see who you follow.
      </p>
    );
  }

  return (
    <div>
      <FollowTabs />
      <h1 className="mt-5 text-2xl font-bold">Following</h1>
      <p className="mt-1 text-gray-600">
        Events from these clubs and people show up first in your feed.
      </p>
      {error && <p className="mt-4 text-red-600">{error}</p>}
      {!data && !error && <p className="mt-4 text-gray-600">Loading…</p>}

      {data && (
        <>
          <section className="mt-6">
            <h2 className="text-lg font-semibold">Clubs</h2>
            {data.clubs.length === 0 ? (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <p className="text-sm text-gray-600">
                  You don't follow any clubs yet.
                </p>
                <Link to="/clubs" className={btnSecondary}>
                  <Building2 aria-hidden="true" />
                  Browse clubs
                </Link>
              </div>
            ) : (
              <ul className="mt-3 space-y-3">
                {data.clubs.map((club) => (
                  <ClubRow key={club.id} club={club} />
                ))}
              </ul>
            )}
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold">People</h2>
            {data.users.length === 0 ? (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <p className="text-sm text-gray-600">
                  You don't follow anyone yet.
                </p>
                <Link to="/people" className={btnSecondary}>
                  <UsersRound aria-hidden="true" />
                  Find people
                </Link>
              </div>
            ) : (
              <ul className="mt-3 space-y-3">
                {data.users.map((person) => (
                  <PersonRow key={person.id} person={person} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

// One row: a link to the page, plus Unfollow. After unfollowing, the row stays (dimmed)
// with a "Follow again" button, so a mis-tap is easy to undo.
function Row({
  to,
  name,
  picture,
  onToggle,
}: {
  to: string;
  name: string;
  picture: ReactNode;
  onToggle: (follow: boolean) => Promise<unknown>;
}) {
  const [following, setFollowingState] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      await onToggle(!following);
      setFollowingState(!following);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
      <Link
        to={to}
        className={`flex min-w-0 flex-1 items-center gap-3 ${following ? "" : "opacity-50"}`}
      >
        {picture}
        <span className="truncate font-medium">{name}</span>
      </Link>
      <div className="shrink-0 text-right">
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          aria-label={`${following ? "Unfollow" : "Follow"} ${name}`}
          className={following ? btnSecondary : btnPrimary}
        >
          {following ? "Unfollow" : "Follow again"}
        </button>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    </li>
  );
}

function ClubRow({ club }: { club: ClubSummary }) {
  return (
    <Row
      to={`/clubs/${club.slug}`}
      name={club.name}
      onToggle={(follow) => followClub(club.id, follow)}
      picture={
        club.logoUrl ? (
          <img
            src={club.logoUrl}
            alt=""
            className="h-10 w-10 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 font-semibold text-violet-800"
          >
            {initialOf(club.name)}
          </span>
        )
      }
    />
  );
}

function PersonRow({ person }: { person: UserSummary }) {
  return (
    <Row
      to={`/profile/${person.id}`}
      name={person.name}
      onToggle={(follow) => setFollowing(person.id, follow)}
      picture={<Avatar name={person.name} image={person.image} />}
    />
  );
}
