// WHAT: The personal dashboard ("/me"): every event I've RSVP'd to, grouped into
//   Going, Interested, and Past. Data comes from GET /api/me/events.
// WITHOUT IT: Students would have no single place to see what they've signed up for.
import type { MyEvent, MyEvents } from "@orbit/shared";
import { Compass, UserCheck, UserRound, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { apiGet } from "../lib/api";
import { authClient } from "../lib/auth-client";
import { formatEventTime } from "../lib/eventDisplay";
import { btnPrimary, btnSecondary, textLink } from "../lib/ui";

// The small calendar block ("FRI / Nov 20") needs a shorter date than
// formatEventDate gives, so it has its own formatter, using the same time zone rule
// as lib/eventDisplay.ts (Western events are in London, Ontario time).
const dayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Toronto",
  weekday: "short",
  month: "short",
  day: "numeric",
});

export default function MyEventsPage() {
  const { data: session, isPending } = authClient.useSession();
  const [data, setData] = useState<MyEvents | null>(null);
  const [error, setError] = useState<string | null>(null);

  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return; // signed out: nothing to load (the page says so below)
    let ignore = false;
    apiGet<MyEvents>("/me/events")
      .then((body) => !ignore && setData(body))
      .catch((err: Error) => !ignore && setError(err.message));
    return () => {
      ignore = true;
    };
  }, [userId]);

  if (isPending) return null;
  if (!session) {
    return (
      <div>
        <h1 className="text-2xl font-bold">My events</h1>
        <p className="mt-2 text-gray-700">
          <Link to="/sign-in" className={textLink}>
            Sign in
          </Link>{" "}
          to see the events you're going to.
        </p>
      </div>
    );
  }

  const going = data?.upcoming.filter((e) => e.rsvp.status === "going") ?? [];
  const interested =
    data?.upcoming.filter((e) => e.rsvp.status === "interested") ?? [];
  const past = data?.past ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold">My events</h1>
      {/* Your account hub: the header avatar opens this page. */}
      <div className="mt-3 flex flex-wrap gap-2">
        <Link to={`/profile/${session.user.id}`} className={btnSecondary}>
          <UserRound aria-hidden="true" />
          My profile
        </Link>
        <Link to="/me/following" className={btnSecondary}>
          <UserCheck aria-hidden="true" />
          Following
        </Link>
        <Link to="/me/followers" className={btnSecondary}>
          <UsersRound aria-hidden="true" />
          Followers
        </Link>
      </div>

      {error && <p className="mt-4 text-red-600">{error}</p>}
      {!data && !error && <p className="mt-4 text-gray-600">Loading…</p>}

      {data && data.upcoming.length === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-gray-300 p-5 text-center">
          <p className="text-gray-700">You have no upcoming events yet.</p>
          <Link to="/" className={`mt-3 ${btnPrimary}`}>
            <Compass aria-hidden="true" />
            Browse events
          </Link>
        </div>
      )}

      <EventGroup title="Going" items={going} />
      <EventGroup title="Interested" items={interested} />
      <EventGroup title="Past" items={past} muted />
    </div>
  );
}

function EventGroup({
  title,
  items,
  muted = false,
}: {
  title: string;
  items: MyEvent[];
  muted?: boolean;
}) {
  if (items.length === 0) return null; // hide empty groups instead of showing "none"
  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold">
        {title}{" "}
        <span className="font-normal text-gray-500">{items.length}</span>
      </h2>
      <ul className={`mt-3 space-y-3 ${muted ? "opacity-70" : ""}`}>
        {items.map((item) => (
          <MyEventRow key={item.event.id} item={item} />
        ))}
      </ul>
    </section>
  );
}

function MyEventRow({ item }: { item: MyEvent }) {
  const { event, rsvp } = item;
  const startsAt = new Date(event.startsAt);
  return (
    <li>
      <Link
        to={`/events/${event.id}`}
        className="flex gap-4 rounded-xl border border-gray-200 bg-white p-4 hover:border-violet-300"
      >
        {/* A small calendar-style date block, e.g. "Thu / Nov 20". */}
        <div className="w-14 shrink-0 text-center">
          <p className="text-xs font-semibold uppercase text-violet-700">
            {
              dayFormat
                .formatToParts(startsAt)
                .find((p) => p.type === "weekday")?.value
            }
          </p>
          <p className="text-sm font-bold">
            {dayFormat
              .formatToParts(startsAt)
              .filter((p) => p.type === "month" || p.type === "day")
              .map((p) => p.value)
              .join(" ")}
          </p>
        </div>
        <div className="min-w-0">
          <p className="line-clamp-2 font-semibold">{event.title}</p>
          <p className="truncate text-sm text-gray-600">
            {event.club.name} · {formatEventTime(event.startsAt)}
            {event.location && ` · ${event.location}`}
          </p>
          {(event.cancelledAt || !rsvp.showOnAttendeeList) && (
            <p className="mt-1 flex flex-wrap gap-2 text-xs">
              {event.cancelledAt && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700">
                  Cancelled
                </span>
              )}
              {!rsvp.showOnAttendeeList && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">
                  RSVP'd anonymously
                </span>
              )}
            </p>
          )}
        </div>
      </Link>
    </li>
  );
}
