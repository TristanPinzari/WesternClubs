// WHAT: The /events/:id page, using the same data source as the event feed.
// WITHOUT IT: Clicking an event could not show its description or registration information.
import type { EventDetail } from "@orbit/shared";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import {
  categoryLabels,
  formatEventDate,
  formatEventTime,
  formatPrice,
  registrationLink,
} from "../lib/eventDisplay";
import { getEvent, useMockEvents } from "../lib/events";
import { useClubAccess } from "../hooks/useClubAccess";
import { canPostEvent } from "../lib/execTypes";

export default function EventDetailPage() {
  const { id } = useParams();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const access = useClubAccess(event?.club.id);

  useEffect(() => {
    let ignore = false;
    // Reset all request state when changing IDs, including after a failed request.
    setEvent(null);
    setError(null);
    setLoading(true);
    if (!id) {
      setError("Event not found");
      setLoading(false);
      return;
    }
    getEvent(id)
      .then((data) => {
        if (!ignore) setEvent(data);
      })
      .catch((err: unknown) => {
        if (!ignore)
          setError(
            err instanceof Error ? err.message : "Could not load event.",
          );
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [id, retry]);

  const href = event ? registrationLink(event.registrationUrl) : null;
  const hasEnded = event
    ? new Date(event.endsAt ?? event.startsAt).getTime() <= Date.now()
    : false;

  return (
    <article>
      <Link
        to="/"
        className="inline-flex min-h-11 items-center text-sm font-medium text-violet-700 underline"
      >
        ← Back to events
      </Link>
      {loading && (
        <p role="status" className="mt-4 text-gray-600">
          Loading event…
        </p>
      )}
      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4"
        >
          <h1 className="text-xl font-bold">Unable to show this event</h1>
          <p className="mt-2 text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => setRetry((value) => value + 1)}
            className="mt-2 min-h-11 font-semibold text-violet-700 underline"
          >
            Try again
          </button>
        </div>
      )}
      {!loading && !error && event && (
        <>
          {useMockEvents && (
            <p className="mt-2 text-sm text-violet-700">
              Demo event — registration links are examples only.
            </p>
          )}
          {event.cancelledAt && (
            <p
              role="status"
              className="mt-4 rounded-lg bg-red-50 p-4 font-semibold text-red-700"
            >
              This event has been cancelled. Registration is closed.
            </p>
          )}
          {!event.cancelledAt && hasEnded && (
            <p role="status" className="mt-4 rounded-lg bg-gray-100 p-4">
              This event has ended.
            </p>
          )}
          <p className="mt-5 text-sm font-semibold text-violet-700">
            {categoryLabels[event.category]} ·{" "}
            <Link to={`/clubs/${event.club.slug}`} className="underline">
              {event.club.name}
            </Link>
          </p>
          <h1 className="mt-2 break-words text-3xl font-bold">{event.title}</h1>
          {!access.loading &&
            canPostEvent(access.role) &&
            !event.cancelledAt && (
              <Link
                to={`/events/${event.id}/edit`}
                className="mt-2 inline-flex min-h-11 items-center text-violet-700 underline"
              >
                Edit event
              </Link>
            )}
          {event.imageUrl && (
            <img
              src={event.imageUrl}
              alt=""
              className="mt-5 max-h-80 w-full rounded-xl object-cover"
            />
          )}

          <dl className="mt-5 space-y-4 rounded-xl border border-gray-200 bg-white p-4 text-sm">
            <div>
              <dt className="font-semibold">When</dt>
              <dd className="mt-1 text-gray-700">
                <time dateTime={event.startsAt}>
                  {formatEventDate(event.startsAt)} ·{" "}
                  {formatEventTime(event.startsAt)}
                </time>
              </dd>
              {event.endsAt && (
                <dd className="mt-1 text-gray-700">
                  Until{" "}
                  <time dateTime={event.endsAt}>
                    {formatEventDate(event.endsAt)} ·{" "}
                    {formatEventTime(event.endsAt)}
                  </time>
                </dd>
              )}
            </div>
            <div>
              <dt className="font-semibold">Location</dt>
              <dd className="mt-1 break-words text-gray-700">
                {event.location || "Location to be announced"}
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Price</dt>
              <dd className="mt-1 text-gray-700">
                {formatPrice(event.priceCents)}
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Eligibility</dt>
              <dd className="mt-1 text-gray-700">
                {event.eligibility ||
                  "Contact the organizer for eligibility details."}
              </dd>
            </div>
          </dl>

          <h2 className="mt-6 text-xl font-semibold">About this event</h2>
          <p className="mt-2 whitespace-pre-wrap break-words text-gray-700">
            {event.description ||
              "The organizer has not added a description yet."}
          </p>
          <div className="mt-6">
            {/* Missing, unsafe, past, or cancelled registrations must not look clickable. */}
            {!event.cancelledAt && !hasEnded && href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-violet-700 px-5 py-3 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700"
              >
                Register<span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : (
              <p className="text-sm text-gray-600">
                {event.cancelledAt || hasEnded
                  ? "Registration is closed."
                  : "No registration link provided. Check with the organizer."}
              </p>
            )}
          </div>
          {/* TODO(Rokyo): mount the real RSVP controls here; no fake attendance counts. */}
          <section
            aria-label="Attendance"
            className="mt-6 min-h-20 rounded-xl border border-dashed border-gray-300 p-4"
          >
            <h2 className="font-semibold">Interested or going?</h2>
            <p className="mt-1 text-sm text-gray-600">
              Attendance options are coming soon.
            </p>
          </section>
        </>
      )}
    </article>
  );
}
