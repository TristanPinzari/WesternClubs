// WHAT: A reusable, keyboard-accessible link to one event's detail page.
// WITHOUT IT: The feed would duplicate its title, club, date, location, and price layout.
import type { EventSummary } from "@orbit/shared";
import { Clock3, MapPin, Sparkles, UsersRound, Building2 } from "lucide-react";
import { Link, useLocation } from "react-router";
import type { FeedReason } from "../lib/execTypes";
import {
  categoryLabels,
  eventDateParts,
  formatEventDate,
  formatEventTime,
  formatPrice,
} from "../lib/eventDisplay";

const reasons = {
  followed_club: { text: "From a club you follow", Icon: Building2 },
  followed_user: { text: "People you follow are going", Icon: UsersRound },
  interest: { text: "Matches your interests", Icon: Sparkles },
};

export default function EventCard({
  event,
  reason,
}: {
  event: EventSummary;
  reason?: FeedReason;
}) {
  const location = useLocation();
  const { month, day, weekday, year } = eventDateParts(event.startsAt);
  // The tile has no year, so show it in the text when the event isn't this year.
  const showYear = year !== eventDateParts(new Date().toISOString()).year;
  const why = reason ? reasons[reason] : null;
  return (
    <Link
      to={`/events/${event.id}`}
      state={
        location.pathname === "/" ? { feedSearch: location.search } : undefined
      }
      className="group flex gap-4 rounded-xl border border-gray-200 bg-white p-4 transition hover:border-violet-300 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700"
    >
      {/* Calendar-style date tile. The full date is in the <time> below for screen readers. */}
      <div
        aria-hidden="true"
        className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-violet-50 text-violet-700"
      >
        <span className="text-[11px] font-semibold uppercase tracking-wider">
          {month}
        </span>
        <span className="text-xl font-bold leading-none">{day}</span>
      </div>

      {/* min-w-0 and break-words keep long titles inside narrow phone screens. */}
      <div className="min-w-0 flex-1 break-words">
        {/* Reasons never include names or follower counts; those are not feed data. */}
        {why && (
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-violet-700">
            <why.Icon aria-hidden="true" className="h-3.5 w-3.5" />
            {why.text}
          </p>
        )}
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold leading-snug group-hover:text-violet-800">
            {event.title}
          </h2>
          <span className="shrink-0 rounded-full border border-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
            {formatPrice(event.priceCents)}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-gray-600">
          {event.club.name}
          <span aria-hidden="true"> · </span>
          <span className="text-gray-500">
            {categoryLabels[event.category]}
          </span>
        </p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
          <span className="flex items-center gap-1.5">
            <Clock3 aria-hidden="true" className="h-4 w-4 text-gray-400" />
            <time dateTime={event.startsAt}>
              {/* Screen readers get the full date; sighted users see it as the tile
                  plus "Thu" (and the year, if it isn't this year) here. */}
              <span className="sr-only">
                {formatEventDate(event.startsAt)},{" "}
              </span>
              <span aria-hidden="true">
                {weekday}
                {showYear && ` ${year}`} ·{" "}
              </span>
              {formatEventTime(event.startsAt)}
            </time>
          </span>
          <span className="flex min-w-0 items-center gap-1.5">
            <MapPin
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-gray-400"
            />
            <span className="break-words">
              {event.location || "Location to be announced"}
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}
