// WHAT: The API endpoints for events (everything under /api/events).
//   Follows the same validate -> query -> respond pattern as clubs.ts.
// WITHOUT IT: /api/events would return 404, and the event feed and detail pages
//   would have no data.
import {
  eventListQuerySchema,
  type EventDetail,
  type EventSummary,
  type Paginated,
} from "@orbit/shared";
import { and, asc, count, eq, gte, ilike, isNull, or } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { club, event } from "../db/schema";
import { mediaUrl } from "../s3";

export const eventsRouter = Router();

// A joined query returns one object per row with a key per table: { event, club }.
type EventRow = {
  event: typeof event.$inferSelect;
  club: typeof club.$inferSelect;
};

function toEventSummary({ event: e, club: c }: EventRow): EventSummary {
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
  if (!id.success) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  const [row] = await db
    .select()
    .from(event)
    .innerJoin(club, eq(event.clubId, club.id))
    .where(eq(event.id, id.data));
  if (!row) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  res.json(toEventDetail(row));
});
