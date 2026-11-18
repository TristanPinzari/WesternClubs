// WHAT: Public club page, upcoming events, following, and role-aware exec entry points.
// WITHOUT IT: Club links have no destination and execs cannot find their posting tools.
import { useCallback, useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import EventCard from "../components/EventCard";
import FollowClubButton from "../components/FollowClubButton";
import RequestState from "../components/RequestState";
import { useClubAccess } from "../hooks/useClubAccess";
import { useResource } from "../hooks/useResource";
import { getClub } from "../lib/clubs";
import { listEvents } from "../lib/events";
import { canManageClub, canPostEvent } from "../lib/execTypes";
import { registrationLink } from "../lib/eventDisplay";

export default function ClubDetailPage() {
  const { slug = "" } = useParams();
  return <ClubDetail key={slug} slug={slug} />;
}
function ClubDetail({ slug }: { slug: string }) {
  const location = useLocation();
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
        className="inline-flex min-h-11 items-center text-violet-700 underline"
      >
        ← All clubs
      </Link>
      <RequestState {...club} />
      {typeof location.state?.warning === "string" && (
        <p
          role="alert"
          className="my-3 rounded-lg bg-amber-50 p-3 text-amber-900"
        >
          {location.state.warning}
        </p>
      )}
      {club.data && (
        <>
          <div className="mt-3 flex items-center gap-4">
            {club.data.logoUrl && (
              <img
                src={club.data.logoUrl}
                alt=""
                className="h-20 w-20 shrink-0 rounded-full object-cover"
              />
            )}
            <h1 className="min-w-0 break-words text-2xl font-bold">
              {club.data.name}
            </h1>
          </div>
          <p className="mt-4 whitespace-pre-wrap break-words text-gray-700">
            {club.data.description}
          </p>
          <ul className="mt-3 flex flex-wrap gap-4">
            {Object.entries(club.data.links ?? {}).map(
              ([label, url]) =>
                registrationLink(url) && (
                  <li key={label}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-violet-700 underline"
                    >
                      {label}
                    </a>
                  </li>
                ),
            )}
          </ul>
          <div className="mt-4 flex flex-wrap items-start gap-3">
            {access.viewer.user && (
              <FollowClubButton
                key={`${access.viewer.user.id}:${clubId}`}
                clubId={club.data.id}
              />
            )}
            {!access.loading && canPostEvent(access.role) && (
              <Link
                className="inline-flex min-h-11 items-center rounded-lg bg-violet-700 px-4 py-2 text-white"
                to={`/clubs/${slug}/events/new`}
              >
                Post event
              </Link>
            )}
            {!access.loading && canManageClub(access.role) && (
              <Link
                className="inline-flex min-h-11 items-center text-violet-700 underline"
                to={`/clubs/${slug}/settings`}
              >
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
                        className="inline-flex min-h-11 items-center text-violet-700 underline"
                      >
                        Edit {event.title}
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
                    className="min-h-11 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span>Page {page + 1}</span>
                  <button
                    type="button"
                    disabled={(page + 1) * 12 >= events.data.total}
                    onClick={() => setPage((value) => value + 1)}
                    className="min-h-11 disabled:opacity-40"
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
