// WHAT: The RSVP endpoints: "Interested" / "Going" on an event, the counts, and the
//   attendee list. Mounted at /api/events next to eventsRouter (see index.ts), so the
//   URLs read /api/events/:id/rsvp and /api/events/:id/attendees.
// WITHOUT IT: Students couldn't say they're going, and nobody could see who else is,
//   which is the "find your people" half of Orbit.
import {
  rsvpBodySchema,
  type Attendee,
  type MyRsvp,
  type RsvpSummary,
} from "@orbit/shared";
import { and, asc, count, desc, eq, isNull, or } from "drizzle-orm";
import { Router, type Response } from "express";
import { z } from "zod";
import { db } from "../db";
import { event, eventRsvp, profile, user } from "../db/schema";
import { requireAuth } from "../middleware";

export const rsvpsRouter = Router();

// Returns the event id if it's a valid uuid of an existing event, otherwise sends a 404
// and returns null. Checking the uuid first avoids a Postgres error (a 500) on bad ids.
// `unknown` because Express types req.params loosely once middleware is involved; Zod
// does the real checking anyway.
async function findEvent(rawId: unknown, res: Response) {
  const id = z.uuid().safeParse(rawId);
  if (id.success) {
    const [row] = await db
      .select({
        id: event.id,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        cancelledAt: event.cancelledAt,
      })
      .from(event)
      .where(eq(event.id, id.data));
    if (row) return row;
  }
  res.status(404).json({ error: "Event not found" });
  return null;
}

// GET /api/events/:id/rsvp
// Public: anyone sees the counts. `mine` is only filled in when you're signed in.
rsvpsRouter.get("/:id/rsvp", async (req, res) => {
  const found = await findEvent(req.params.id, res);
  if (!found) return;

  // One row per status, e.g. [{ status: "going", n: 12 }, { status: "interested", n: 30 }]
  const counts = await db
    .select({ status: eventRsvp.status, n: count() })
    .from(eventRsvp)
    .where(eq(eventRsvp.eventId, found.id))
    .groupBy(eventRsvp.status);

  let mine: MyRsvp | null = null;
  if (req.user) {
    const [row] = await db
      .select({
        status: eventRsvp.status,
        showOnAttendeeList: eventRsvp.showOnAttendeeList,
        purpose: eventRsvp.purpose,
        lookingForBuddy: eventRsvp.lookingForBuddy,
      })
      .from(eventRsvp)
      .where(
        and(eq(eventRsvp.eventId, found.id), eq(eventRsvp.userId, req.user.id)),
      );
    mine = row ?? null;
  }

  const body: RsvpSummary = {
    goingCount: counts.find((c) => c.status === "going")?.n ?? 0,
    interestedCount: counts.find((c) => c.status === "interested")?.n ?? 0,
    mine,
  };
  res.json(body);
});

// PUT /api/events/:id/rsvp  { status, showOnAttendeeList?, purpose?, lookingForBuddy? }
// PUT (not POST) because doing it twice has the same result as once: it creates your
// RSVP, or replaces it. That's how "Interested" becomes "Going" without a 2nd row.
rsvpsRouter.put("/:id/rsvp", requireAuth, async (req, res) => {
  const found = await findEvent(req.params.id, res);
  if (!found) return;

  // The UI hides the buttons for these, but the API must check too: anyone can
  // call it directly.
  if (found.cancelledAt) {
    res.status(400).json({ error: "This event has been cancelled" });
    return;
  }
  if ((found.endsAt ?? found.startsAt) <= new Date()) {
    res.status(400).json({ error: "This event has already ended" });
    return;
  }

  const rsvp = rsvpBodySchema.parse(req.body); // fills in defaults (e.g. visible = true)

  // userId comes from the session, NEVER from the body, so you can only RSVP as yourself.
  await db
    .insert(eventRsvp)
    .values({ eventId: found.id, userId: req.user!.id, ...rsvp })
    // "Upsert": if this (eventId, userId) already exists (the primary key), update
    // that row instead of failing.
    .onConflictDoUpdate({
      target: [eventRsvp.eventId, eventRsvp.userId],
      set: { ...rsvp, updatedAt: new Date() },
    });

  res.json(rsvp satisfies MyRsvp);
});

// DELETE /api/events/:id/rsvp
// Deleting an RSVP you don't have is fine (still 204): the end state is the same.
rsvpsRouter.delete("/:id/rsvp", requireAuth, async (req, res) => {
  const found = await findEvent(req.params.id, res);
  if (!found) return;

  await db
    .delete(eventRsvp)
    .where(
      and(eq(eventRsvp.eventId, found.id), eq(eventRsvp.userId, req.user!.id)),
    );
  res.status(204).end();
});

// GET /api/events/:id/attendees
// Signed in only, so the list isn't visible to anyone on the internet.
// PRIVACY: only people who left "Show me on the attendee list" on AND whose profile is
// public. Both are filtered out HERE, in the query, so they never leave the server.
rsvpsRouter.get("/:id/attendees", requireAuth, async (req, res) => {
  const found = await findEvent(req.params.id, res);
  if (!found) return;

  const rows = await db
    .select({
      userId: user.id,
      name: user.name,
      image: user.image,
      status: eventRsvp.status,
      purpose: eventRsvp.purpose,
      lookingForBuddy: eventRsvp.lookingForBuddy,
    })
    .from(eventRsvp)
    .innerJoin(user, eq(eventRsvp.userId, user.id))
    // LEFT join: someone who never saved a profile has no row, and counts as public.
    .leftJoin(profile, eq(profile.userId, user.id))
    .where(
      and(
        eq(eventRsvp.eventId, found.id),
        eq(eventRsvp.showOnAttendeeList, true),
        or(isNull(profile.isPublic), eq(profile.isPublic, true)),
      ),
    )
    // "going" sorts before "interested" (enum order), then earliest RSVP first.
    .orderBy(desc(eventRsvp.status), asc(eventRsvp.createdAt))
    .limit(200);

  const body: Attendee[] = rows;
  res.json(body);
});
