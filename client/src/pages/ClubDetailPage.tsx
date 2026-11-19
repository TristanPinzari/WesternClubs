// WHAT: Public club page, upcoming events, following, and role-aware exec entry points.
// WITHOUT IT: Club links have no destination and execs cannot find their posting tools.
import { ArrowLeft, Pencil, Plus, Settings } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import EventCard from "../components/EventCard";
import FollowClubButton from "../components/FollowClubButton";
import RequestState from "../components/RequestState";
import SocialLinks from "../components/SocialLinks";
import { btnQuiet, btnSecondary, initialOf } from "../lib/ui";
import { useClubAccess } from "../hooks/useClubAccess";
import { useResource } from "../hooks/useResource";
import { getClub } from "../lib/clubs";
import { listEvents } from "../lib/events";
import { canManageClub, canPostEvent } from "../lib/execTypes";

export default function ClubDetailPage() {
  const { slug = "" } = useParams();
  return <ClubDetail key={slug} slug={slug} />;
}
function ClubDetail({ slug }: { slug: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  // The create-club page may pass a one-time warning in history state. Keep it in local
  // state, then clear it from history so it doesn't come back on reload or Back.
  const [warning] = useState<string | null>(() =>
    typeof location.state?.warning === "string" ? location.state.warning : null,
  );
  useEffect(() => {
    if (location.state?.warning)
      navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);
  const club = useResource(useCallback(() => getClub(slug), [slug]));
  const clubId = club.data?.id;
  const access = useClubAccess(clubId);
  const [page, setPage] = useState(0);
  const events = useResource(
    useCallback(
      () =>
        clubId
          ? listEvents({ clubId, limit: 12, offset: page * 12 })
          : Promise.resolve({ items: [], total: 0 }),
      [clubId, page],
    ),
  );
  return (
    <section>
      <Link
        to="/clubs"
        className="-ml-1 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 text-sm font-medium text-gray-600 hover:text-violet-700"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        All clubs
      </Link>
      <RequestState {...club} />
      {warning && (
        <p
          role="alert"
          className="my-3 rounded-lg bg-amber-50 p-3 text-amber-900"
        >
          {warning}
        </p>
      )}
      {club.data && (
        <>
          <div className="mt-3 flex items-center gap-4">
            {club.data.logoUrl ? (
              <img
                src={club.data.logoUrl}
                alt=""
                className="h-20 w-20 shrink-0 rounded-2xl border border-gray-200 object-cover"
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-3xl font-bold text-violet-700"
              >
                {initialOf(club.data.name)}
              </span>
            )}
            <h1 className="min-w-0 wrap-break-word text-2xl font-bold">
              {club.data.name}
            </h1>
          </div>
          {club.data.description && (
            <p className="mt-4 whitespace-pre-wrap wrap-break-word text-gray-700">
              {club.data.description}
            </p>
          )}
          <SocialLinks links={club.data.links ?? {}} className="mt-4" />
          <div className="mt-4 flex flex-wrap items-start gap-2">
            {access.viewer.user && (
              <FollowClubButton
                key={`${access.viewer.user.id}:${clubId}`}
                clubId={club.data.id}
                initialFollowing={club.data.isFollowing}
              />
            )}
            {!access.loading && canPostEvent(access.role) && (
              <Link
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-violet-700 px-4 py-2 font-semibold text-white transition hover:bg-violet-800"
                to={`/clubs/${slug}/events/new`}
              >
                <Plus aria-hidden="true" className="h-4 w-4" />
                Post event
              </Link>
            )}
            {!access.loading && canManageClub(access.role) && (
              <Link
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 transition hover:border-violet-300 hover:text-violet-700"
                to={`/clubs/${slug}/settings`}
              >
                <Settings aria-hidden="true" className="h-4 w-4" />
                Settings
              </Link>
            )}
          </div>
          {access.error && (
            <RequestState
              error={`Exec controls unavailable: ${access.error}`}
              retry={access.retry}
            />
          )}
          <h2 className="mt-6 text-xl font-semibold">Upcoming events</h2>
          <RequestState {...events} />
          {events.data && (
            <>
              {!events.data.items.length && (
                <p className="mt-3 text-gray-600">
                  No upcoming events from this club.
                </p>
              )}
              <ul className="mt-3 space-y-3">
                {events.data.items.map((event) => (
                  <li key={event.id}>
                    <EventCard event={event} />
                    {!access.loading && canPostEvent(access.role) && (
                      <Link
                        to={`/events/${event.id}/edit`}
                        aria-label={`Edit event: ${event.title}`}
                        className={`mt-2 ${btnQuiet}`}
                      >
                        <Pencil aria-hidden="true" />
                        Edit event
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
              {(events.data.total > 12 || page > 0) && (
                <nav
                  aria-label="Club event pages"
                  className="mt-4 flex items-center justify-between gap-3"
                >
                  <button
                    type="button"
                    disabled={!page}
                    onClick={() => setPage((value) => value - 1)}
                    className={btnSecondary}
                  >
                    Previous
                  </button>
                  <span>Page {page + 1}</span>
                  <button
                    type="button"
                    disabled={(page + 1) * 12 >= events.data.total}
                    onClick={() => setPage((value) => value + 1)}
                    className={btnSecondary}
                  >
                    Next
                  </button>
                </nav>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
