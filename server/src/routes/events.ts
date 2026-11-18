// WHAT: The API endpoints for events (everything under /api/events).
//   Follows the same validate -> query -> respond pattern as clubs.ts.
// WITHOUT IT: /api/events would return 404, and the event feed and detail pages
//   would have no data.
import {
  eventListQuerySchema,
  updateEventSchema,
  type EventDetail,
  type EventSummary,
  type Paginated,
} from "@orbit/shared";
import { and, asc, count, eq, gte, ilike, isNull, or } from "drizzle-orm";
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { db } from "../db";
import { club, event } from "../db/schema";
import { getClubRole, requireAuth } from "../middleware";
import { mediaUrl } from "../s3";

export const eventsRouter = Router();

// A joined query returns one object per row with a key per table: { event, club }.
export type EventRow = {
  event: typeof event.$inferSelect;
  club: typeof club.$inferSelect;
};

export function toEventSummary({ event: e, club: c }: EventRow): EventSummary {
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    category: e.category,
    startsAt: e.startsAt.toISOString(),
    endsAt: e.endsAt?.toISOString() ?? null,
    location: e.location,
    priceCents: e.priceCents,
    imageUrl: mediaUrl(e.imageKey),
    club: { id: c.id, name: c.name, slug: c.slug },
  };
}

function toEventDetail(row: EventRow): EventDetail {
  return {
    ...toEventSummary(row),
    eligibility: row.event.eligibility,
    registrationUrl: row.event.registrationUrl,
    cancelledAt: row.event.cancelledAt?.toISOString() ?? null,
  };
}

// GET /api/events?q=ai&category=technology&clubId=...&from=...&limit=20&offset=0
eventsRouter.get("/", async (req, res) => {
  // 1. Validate input. If invalid, Zod throws and errorHandler returns a 400.
  const query = eventListQuerySchema.parse(req.query);

  // 2. Build the WHERE clause. and() skips any `undefined`, so optional filters
  //    only apply when they were given.
  const search = query.q ? `%${query.q}%` : undefined;
  const where = and(
    // Always upcoming-only. `from` can only narrow this further (e.g. "from next
    // Monday"), never widen it: ?from=2000-01-01 must not return past events.
    gte(event.startsAt, new Date()),
    query.from ? gte(event.startsAt, query.from) : undefined,
    isNull(event.cancelledAt), // not cancelled
    query.category ? eq(event.category, query.category) : undefined,
    query.clubId ? eq(event.clubId, query.clubId) : undefined,
    search
      ? or(
          ilike(event.title, search),
          ilike(event.description, search),
          ilike(club.name, search), // possible because of the join below
        )
      : undefined,
  );

  // Both queries need the join, since `where` can reference club.name.
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(event)
      .innerJoin(club, eq(event.clubId, club.id))
      .where(where)
      // Soonest first. Tie-break on id so events at the same time keep a stable
      // order, otherwise pagination could show one event twice and skip another.
      .orderBy(asc(event.startsAt), asc(event.id))
      .limit(query.limit)
      .offset(query.offset),
    db
      .select({ total: count() })
      .from(event)
      .innerJoin(club, eq(event.clubId, club.id))
      .where(where),
  ]);

  // 3. Respond with the shared type.
  const body: Paginated<EventSummary> = {
    items: rows.map(toEventSummary),
    total,
  };
  res.json(body);
});

// GET /api/events/:id
// Unlike the list, this DOES return past and cancelled events: someone might open an
// old link, and the page should say "Cancelled" rather than "Not found".
eventsRouter.get("/:id", async (req, res) => {
  // Check the id is a uuid BEFORE querying. Otherwise Postgres throws
  // "invalid input syntax for type uuid" and the user gets a 500.
  const id = z.uuid().safeParse(req.params.id);
  const detail = id.success ? await getEventDetail(id.data) : null;
  if (!detail) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  res.json(detail);
});

// One event with its club, shaped for the API. null if it doesn't exist.
export async function getEventDetail(id: string): Promise<EventDetail | null> {
  const [row] = await db
    .select()
    .from(event)
    .innerJoin(club, eq(event.clubId, club.id))
    .where(eq(event.id, id));
  return row ? toEventDetail(row) : null;
}

// An event can have no end time, but if it has one, it must be after the start.
export function endsAfterStart(
  startsAt: Date,
  endsAt: Date | null | undefined,
) {
  return !endsAt || endsAt > startsAt;
}

// For PATCH and cancel: loads the event and checks the signed-in user is an exec
// (any role) of the club that OWNS the event. If not, sends the error and returns null.
//
// Security: the club comes from the event's own row in the database, never from the
// request. Otherwise an exec of club A could edit club B's event by sending club A's id.
async function loadEventForEdit(req: Request, res: Response) {
  const id = z.uuid().safeParse(req.params.id);
  const [existing] = id.success
    ? await db.select().from(event).where(eq(event.id, id.data))
    : [];
  if (!existing) {
    res.status(404).json({ error: "Event not found" });
    return null;
  }
  const { role } = await getClubRole(existing.clubId, req.user!.id);
  if (!role) {
    res.status(403).json({ error: "You don't have permission to do that" });
    return null;
  }
  return existing;
}

// PATCH /api/events/:id  { any event fields }  -> the updated event
// Send only the fields that changed. Past events can still be edited (to fix typos,
// add photos); cancelled events can't.
eventsRouter.patch("/:id", requireAuth, async (req, res) => {
  const existing = await loadEventForEdit(req, res);
  if (!existing) return;

  const changes = updateEventSchema.parse(req.body);
  // Check the times as they'll be AFTER the update: a new end time against the old
  // start time, or the other way round. (undefined = "not changing", null = "clear it")
  const startsAt = changes.startsAt ?? existing.startsAt;
  const endsAt =
    changes.endsAt === undefined ? existing.endsAt : changes.endsAt;
  if (!endsAfterStart(startsAt, endsAt)) {
    res.status(400).json({ error: "The event must end after it starts" });
    return;
  }

  // isNull(cancelledAt) in the WHERE means a cancelled event is never updated, even
  // if it was cancelled a split second after we loaded it.
  const updated = await db
    .update(event)
    .set({ ...changes, updatedAt: new Date() })
    .where(and(eq(event.id, existing.id), isNull(event.cancelledAt)))
    .returning({ id: event.id });
  if (updated.length === 0) {
    res
      .status(409)
      .json({ error: "This event is cancelled and can't be edited" });
    return;
  }
  res.json(await getEventDetail(existing.id));
});

// POST /api/events/:id/cancel  -> the cancelled event
// Cancelling is permanent (there's no un-cancel). Cancelling twice is harmless: the
// second call changes nothing, and the original cancellation time is kept.
eventsRouter.post("/:id/cancel", requireAuth, async (req, res) => {
  const existing = await loadEventForEdit(req, res);
  if (!existing) return;

  const now = new Date();
  await db
    .update(event)
    .set({ cancelledAt: now, updatedAt: now })
    .where(and(eq(event.id, existing.id), isNull(event.cancelledAt)));
  res.json(await getEventDetail(existing.id));
});
