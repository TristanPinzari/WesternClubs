// WHAT: A reusable, keyboard-accessible link to one event's detail page.
// WITHOUT IT: The feed would duplicate its title, club, date, location, and price layout.
import type { EventSummary } from "@orbit/shared";
import { Link } from "react-router";
import {
  categoryLabels,
  formatEventDate,
  formatEventTime,
  formatPrice,
} from "../lib/eventDisplay";

export default function EventCard({ event }: { event: EventSummary }) {
  return (
    <Link
      to={`/events/${event.id}`}
      className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-violet-300 hover:shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700"
    >
      {/* min-w-0 and break-words keep long titles inside narrow phone screens. */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 break-words">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
            {categoryLabels[event.category]}
          </p>
          <h2 className="mt-1 text-lg font-semibold">{event.title}</h2>
          <p className="mt-1 text-sm text-gray-600">{event.club.name}</p>
        </div>
        <span className="shrink-0 rounded-full bg-violet-50 px-2 py-1 text-xs font-medium text-violet-800">
          {formatPrice(event.priceCents)}
        </span>
      </div>
      <div className="mt-4 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
        <time dateTime={event.startsAt}>
          {formatEventDate(event.startsAt)} · {formatEventTime(event.startsAt)}
        </time>
        <span className="break-words">
          {event.location || "Location to be announced"}
        </span>
      </div>
    </Link>
  );
}
