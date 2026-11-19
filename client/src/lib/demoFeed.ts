// WHAT: A pure ranking model for frontend fixtures, matching docs/API.md.
// WITHOUT IT: The mock feed could teach the wrong ordering or expose anonymous RSVPs.
// Production ranking lives in server/src/queries/feed.ts.
import type { EventCategory, EventDetail } from "@orbit/shared";
import type { FeedEvent, FeedReason } from "./execTypes";

export interface DemoRsvp {
  eventId: string;
  userId: string;
  status: "going" | "interested";
  showOnAttendeeList: boolean;
  isPublic: boolean | null;
  blockedViewer?: boolean;
}
const scores = { followed_club: 3, followed_user: 2, interest: 1 };
export function rankDemoFeed(
  events: EventDetail[],
  clubs: Set<string>,
  users: Set<string>,
  interests: EventCategory[],
  rsvps: DemoRsvp[],
  now = Date.now(),
): FeedEvent[] {
  return events
    .filter((event) => !event.cancelledAt && Date.parse(event.startsAt) >= now)
    .map((event) => {
      const reason: FeedReason = clubs.has(event.club.id)
        ? "followed_club"
        : rsvps.some(
              (rsvp) =>
                rsvp.eventId === event.id &&
                users.has(rsvp.userId) &&
                rsvp.showOnAttendeeList &&
                rsvp.isPublic !== false &&
                !rsvp.blockedViewer,
            )
          ? "followed_user"
          : interests.includes(event.category)
            ? "interest"
            : null;
      return { ...event, reason };
    })
    .sort(
      (a, b) =>
        (b.reason ? scores[b.reason] : 0) - (a.reason ? scores[a.reason] : 0) ||
        a.startsAt.localeCompare(b.startsAt) ||
        a.id.localeCompare(b.id),
    );
}
