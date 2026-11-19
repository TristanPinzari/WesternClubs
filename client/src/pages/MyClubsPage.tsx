// WHAT: The signed-in executive's own clubs, not a public membership/follower list.
// WITHOUT IT: Execs would have to search for every club they manage.
import { Plus, Settings } from "lucide-react";
import { useCallback } from "react";
import { Link } from "react-router";
import RequestState from "../components/RequestState";
import { useResource } from "../hooks/useResource";
import { useViewer } from "../hooks/useViewer";
import { getMyClubs } from "../lib/clubs";
import { canManageClub } from "../lib/execTypes";
import { btnPrimary, btnSecondary, textLink } from "../lib/ui";

const roleLabels = { owner: "Owner", admin: "Admin", editor: "Editor" };

export default function MyClubsPage() {
  const viewer = useViewer();
  const userId = viewer.user?.id;
  const state = useResource(
    useCallback(() => (userId ? getMyClubs() : Promise.resolve([])), [userId]),
  );
  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">My clubs</h1>
        {userId && (
          <Link to="/clubs/new" className={btnPrimary}>
            <Plus aria-hidden="true" />
            Create a club
          </Link>
        )}
      </div>
      <RequestState
        loading={viewer.pending || state.loading}
        error={viewer.error || state.error}
        retry={state.retry}
      />
      {!viewer.pending && !userId && (
        <p className="mt-4 text-gray-700">
          <Link to="/sign-in" className={textLink}>
            Sign in
          </Link>{" "}
          to see the clubs you manage.
        </p>
      )}
      {userId && state.data && (
        <>
          {!state.data.length && (
            <p className="mt-4 text-gray-600">
              You're not an exec of any clubs yet. Create one, or ask a club's
              owner to add you.
            </p>
          )}
          <ul className="mt-4 space-y-3">
            {state.data.map((club) => (
              <li
                key={club.id}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <Link
                    to={`/clubs/${club.slug}`}
                    className="min-w-0 font-semibold hover:text-violet-700"
                  >
                    {club.name}
                  </Link>
                  <span className="shrink-0 rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                    {roleLabels[club.role]}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    to={`/clubs/${club.slug}/events/new`}
                    className={btnPrimary}
                  >
                    <Plus aria-hidden="true" />
                    Post event
                  </Link>
                  {canManageClub(club.role) && (
                    <Link
                      to={`/clubs/${club.slug}/settings`}
                      className={btnSecondary}
                    >
                      <Settings aria-hidden="true" />
                      Settings
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
