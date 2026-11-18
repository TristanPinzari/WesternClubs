// WHAT: The signed-in executive's own clubs, not a public membership/follower list.
// WITHOUT IT: Execs would have to search for every club they manage.
import { useCallback } from "react";
import { Link } from "react-router";
import RequestState from "../components/RequestState";
import { useResource } from "../hooks/useResource";
import { useViewer } from "../hooks/useViewer";
import { getMyClubs } from "../lib/clubs";
import { canManageClub } from "../lib/execTypes";
export default function MyClubsPage() {
  const viewer = useViewer();
  const userId = viewer.user?.id;
  const state = useResource(
    useCallback(() => (userId ? getMyClubs() : Promise.resolve([])), [userId]),
  );
  return (
    <section>
      <h1 className="text-2xl font-bold">My clubs</h1>
      <RequestState
        loading={viewer.pending || state.loading}
        error={viewer.error || state.error}
        retry={state.retry}
      />
      {!viewer.pending && !userId && (
        <p className="mt-4">Sign in to see the clubs you manage.</p>
      )}
      {userId && state.data && (
        <>
          {!state.data.length && (
            <p className="mt-4">You are not an exec of any clubs yet.</p>
          )}
          <ul className="mt-4 space-y-4">
            {state.data.map((club) => (
              <li
                key={club.id}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <Link
                  to={`/clubs/${club.slug}`}
                  className="font-semibold text-violet-700 underline"
                >
                  {club.name}
                </Link>
                <p className="mt-1 text-sm">Your role: {club.role}</p>
                <div className="mt-2 flex flex-wrap gap-4">
                  <Link
                    to={`/clubs/${club.slug}/events/new`}
                    className="inline-flex min-h-11 items-center text-violet-700 underline"
                  >
                    Post event
                  </Link>
                  {canManageClub(club.role) && (
                    <Link
                      to={`/clubs/${club.slug}/settings`}
                      className="inline-flex min-h-11 items-center text-violet-700 underline"
                    >
                      Settings
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <Link
            to="/clubs/new"
            className="mt-4 inline-flex min-h-11 items-center text-violet-700 underline"
          >
            Create a club
          </Link>
        </>
      )}
    </section>
  );
}
