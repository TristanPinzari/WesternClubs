// WHAT: GET /api/me/events, the data for the personal dashboard (/me): every event I've
//   RSVP'd to, split into upcoming and past. Mounted at /api/me in index.ts.
//   Kept in its own file so other /api/me routes (clubs, following, profile) can live in
//   their own routers without merge conflicts.
// WITHOUT IT: Students would have to remember which events they said they'd go to.
import type { MyEvent, MyEvents } from "@orbit/shared";
import { asc, eq } from "drizzle-orm";
import { Router } from "express";
import { db } from "../db";
import { club, event, eventRsvp } from "../db/schema";
import { requireAuth } from "../middleware";
import { toEventSummary } from "./events";

export const meEventsRouter = Router();

// GET /api/me/events
meEventsRouter.get("/events", requireAuth, async (req, res) => {
  // Every RSVP of mine, joined to its event and that event's club.
  // Only MY rows: the userId comes from the session, never from the request.
  const rows = await db
    .select()
    .from(eventRsvp)
    .innerJoin(event, eq(eventRsvp.eventId, event.id))
    .innerJoin(club, eq(event.clubId, club.id))
    .where(eq(eventRsvp.userId, req.user!.id))
    .orderBy(asc(event.startsAt), asc(event.id));

  const now = new Date();
  const body: MyEvents = { upcoming: [], past: [] };

  for (const row of rows) {
    const item: MyEvent = {
      event: {
        ...toEventSummary(row),
        cancelledAt: row.event.cancelledAt?.toISOString() ?? null,
      },
      rsvp: {
        status: row.event_rsvp.status,
        showOnAttendeeList: row.event_rsvp.showOnAttendeeList,
        purpose: row.event_rsvp.purpose,
        lookingForBuddy: row.event_rsvp.lookingForBuddy,
      },
    };
    // Still "upcoming" while it's happening: it only moves to past once it ends.
    const over = (row.event.endsAt ?? row.event.startsAt) <= now;
    (over ? body.past : body.upcoming).push(item);
  }

  // Rows came back soonest first. For past events, most recent first reads better.
  body.past.reverse();
  res.json(body);
});
