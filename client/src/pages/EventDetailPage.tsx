// WHAT: The /events/:id page, using the same data source as the event feed.
// WITHOUT IT: Clicking an event could not show its description or registration information.
import type { EventDetail } from "@orbit/shared";
import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  MapPin,
  Pencil,
  ShieldCheck,
  Ticket,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useParams } from "react-router";
import {
  categoryLabels,
  formatEventDate,
  formatEventTime,
  formatPrice,
  registrationLink,
} from "../lib/eventDisplay";
import EventAttendance from "../components/EventAttendance";
import { btnSecondary } from "../lib/ui";
import { getEvent, useMockEvents } from "../lib/events";
import { useClubAccess } from "../hooks/useClubAccess";
import { canPostEvent } from "../lib/execTypes";

export default function EventDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  // Only carry a query string, never a caller-controlled destination URL.
  const feedSearch = location.state?.feedSearch;
  const backToEvents =
    typeof feedSearch === "string" && feedSearch.startsWith("?")
      ? `/${feedSearch}`
      : "/";
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
        to={backToEvents}
        className="-ml-1 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 text-sm font-medium text-gray-600 hover:text-violet-700"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Back to events
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
            className={`mt-3 ${btnSecondary}`}
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
          <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-violet-50 px-2.5 py-0.5 font-medium text-violet-700">
              {categoryLabels[event.category]}
            </span>
            <Link
              to={`/clubs/${event.club.slug}`}
              className="font-medium text-gray-700 hover:text-violet-700 hover:underline"
            >
              {event.club.name}
            </Link>
          </div>
          <h1 className="mt-2 wrap-break-word text-3xl font-bold">
            {event.title}
          </h1>
          {!access.loading &&
            canPostEvent(access.role) &&
            !event.cancelledAt && (
              <Link
                to={`/events/${event.id}/edit`}
                className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:border-violet-300 hover:text-violet-700"
              >
                <Pencil aria-hidden="true" className="h-4 w-4" />
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

          <dl className="mt-5 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white text-sm">
            <Detail icon={<CalendarDays />} label="When">
              <time dateTime={event.startsAt}>
                {formatEventDate(event.startsAt)} ·{" "}
                {formatEventTime(event.startsAt)}
              </time>
              {event.endsAt && (
                <span className="block text-gray-500">
                  Until{" "}
                  <time dateTime={event.endsAt}>
                    {formatEventDate(event.endsAt)} ·{" "}
                    {formatEventTime(event.endsAt)}
                  </time>
                </span>
              )}
            </Detail>
            <Detail icon={<MapPin />} label="Location">
              {event.location || "Location to be announced"}
            </Detail>
            <Detail icon={<Ticket />} label="Price">
              {formatPrice(event.priceCents)}
            </Detail>
            <Detail icon={<ShieldCheck />} label="Eligibility">
              {event.eligibility ||
                "Contact the organizer for eligibility details."}
            </Detail>
          </dl>

          <h2 className="mt-6 text-xl font-semibold">About this event</h2>
          <p className="mt-2 whitespace-pre-wrap wrap-break-word text-gray-700">
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
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-violet-700 px-5 py-3 font-semibold text-white transition hover:bg-violet-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700"
              >
                Register
                <ExternalLink aria-hidden="true" className="h-4 w-4" />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : (
              <p className="text-sm text-gray-600">
                {event.cancelledAt || hasEnded
                  ? "Registration is closed."
                  : "No registration link provided. Check with the organizer."}
              </p>
            )}
          </div>
          {/* RSVP + attendee list. key={event.id} gives each event a fresh component,
              so a half-filled RSVP form never carries over to the next event.
              Mock events aren't in the database, so they can't take RSVPs. */}
          {!useMockEvents && (
            <EventAttendance
              key={event.id}
              eventId={event.id}
              closed={Boolean(event.cancelledAt) || hasEnded}
            />
          )}
        </>
      )}
    </article>
  );
}

// One row of the event details box: an icon, a small label, and the value.
// A <dl> row may only contain <dt> and <dd>, so the icon lives inside the <dt>, and the
// <dd> is indented to line up under the label (icon width + gap = 2rem).
function Detail({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="p-4">
      <dt className="flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-gray-500">
        <span
          aria-hidden="true"
          className="shrink-0 text-violet-700 [&>svg]:h-5 [&>svg]:w-5"
        >
          {icon}
        </span>
        {label}
      </dt>
      <dd className="mt-0.5 wrap-break-word pl-8 text-gray-800">{children}</dd>
    </div>
  );
}
