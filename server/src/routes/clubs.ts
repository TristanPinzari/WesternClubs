// WHAT: The API endpoints for clubs (everything under /api/clubs).
//   EXAMPLE ROUTER: copy this pattern for events.ts, profiles.ts, etc.
// WITHOUT IT: /api/clubs would return 404, and the Clubs page would show an error.
import {
  clubListQuerySchema,
  createClubSchema,
  createEventSchema,
  updateClubSchema,
  type ClubDetail,
  type ClubSummary,
  type Paginated,
} from "@orbit/shared";
import { count, eq, ilike, like, or } from "drizzle-orm";
import { Router } from "express";
import { db } from "../db";
import { club, clubMember, event } from "../db/schema";
import { requireAuth, requireClubRole } from "../middleware";
import { mediaUrl } from "../s3";
import { endsAfterStart, getEventDetail } from "./events";

export const clubsRouter = Router();

export function toClubSummary(row: typeof club.$inferSelect): ClubSummary {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    logoUrl: mediaUrl(row.logoKey),
  };
}

function toClubDetail(row: typeof club.$inferSelect): ClubDetail {
  return { ...toClubSummary(row), links: row.links };
}

// GET /api/clubs?q=ai&limit=20&offset=0
clubsRouter.get("/", async (req, res) => {
  // 1. Validate input. If invalid, Zod throws and errorHandler returns a 400.
  const query = clubListQuerySchema.parse(req.query);

  // 2. Query the database.
  const where = query.q ? ilike(club.name, `%${query.q}%`) : undefined;
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(club)
      .where(where)
      .orderBy(club.name)
      .limit(query.limit)
      .offset(query.offset),
    db.select({ total: count() }).from(club).where(where),
  ]);

  // 3. Respond with the shared type, so the frontend knows the exact shape.
  const body: Paginated<ClubSummary> = {
    items: rows.map(toClubSummary),
    total,
  };
  res.json(body);
});

// GET /api/clubs/:slug
clubsRouter.get("/:slug", async (req, res) => {
  const [row] = await db
    .select()
    .from(club)
    .where(eq(club.slug, req.params.slug));
  if (!row) {
    res.status(404).json({ error: "Club not found" });
    return;
  }
  res.json(toClubDetail(row));
});

// "Western AI Club!" -> "western-ai-club". Accents are stripped ("Café" -> "cafe").
// Returns "" if the name has no letters or numbers (e.g. "!!!").
export function slugify(name: string): string {
  return name
    .normalize("NFKD") // split "é" into "e" + an accent mark...
    .replace(/\p{M}/gu, "") // ...then drop the accent marks (\p{M} = any "mark" character)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // any run of other characters becomes one "-"
    .replace(/^-+|-+$/g, ""); // no "-" at the start or end
}

// The first free slug: "western-ai" if nobody has it, otherwise "western-ai-2",
// "western-ai-3", ... One query, however many clubs share the name.
async function findFreeSlug(base: string): Promise<string> {
  const rows = await db
    .select({ slug: club.slug })
    .from(club)
    .where(or(eq(club.slug, base), like(club.slug, `${base}-%`)));
  const taken = new Set(rows.map((r) => r.slug));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

// True if Postgres rejected the insert because the slug is already used (error code
// 23505 = unique violation, on the club.slug constraint). Drizzle wraps database
// errors, so the Postgres error is in `cause`.
function isSlugTaken(err: unknown): boolean {
  const cause =
    err instanceof Error
      ? (err.cause as { code?: string; constraint?: string } | undefined)
      : undefined;
  return cause?.code === "23505" && cause.constraint === "club_slug_unique";
}

const MAX_SLUG_ATTEMPTS = 5;

// POST /api/clubs  { name, description? }  -> 201 with the new club
// Any signed-in student can create a club, and they become its owner. Two clubs can
// share a name; the second one gets a numbered slug ("western-ai-2").
clubsRouter.post("/", requireAuth, async (req, res) => {
  const input = createClubSchema.parse(req.body);
  const base = slugify(input.name);
  if (!base) {
    res
      .status(400)
      .json({ error: "Club name must contain at least one letter or number" });
    return;
  }

  for (let attempt = 1; ; attempt++) {
    const slug = await findFreeSlug(base);
    try {
      // All or nothing: if either insert fails, Postgres undoes both, so a club can
      // never exist without an owner.
      const created = await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(club)
          .values({ name: input.name, slug, description: input.description })
          .returning();
        await tx
          .insert(clubMember)
          .values({ clubId: row.id, userId: req.user!.id, role: "owner" });
        return row;
      });
      res.status(201).json(toClubDetail(created));
      return;
    } catch (err) {
      // Another request grabbed this slug between findFreeSlug and our insert (two
      // people creating "Western AI" at the same moment). The database's unique
      // constraint caught it. Postgres has aborted this transaction, so we can't
      // retry inside it: loop round, pick a new slug, and start a fresh transaction.
      if (isSlugTaken(err) && attempt < MAX_SLUG_ATTEMPTS) continue;
      throw err; // a real bug, or still colliding after 5 tries: errorHandler -> 500
    }
  }
});

// POST /api/clubs/:clubId/events  { title, category, startsAt, ... }  -> 201 with the event
// Any exec of the club (owner, admin, editor). requireClubRole has already checked
// the user's role in the club from the URL, and that the club exists.
clubsRouter.post(
  "/:clubId/events",
  requireAuth,
  requireClubRole("owner", "admin", "editor"),
  async (req, res) => {
    const input = createEventSchema.parse(req.body);
    if (input.startsAt <= new Date()) {
      res.status(400).json({ error: "The event must start in the future" });
      return;
    }
    if (!endsAfterStart(input.startsAt, input.endsAt)) {
      res.status(400).json({ error: "The event must end after it starts" });
      return;
    }

    const [row] = await db
      .insert(event)
      .values({ ...input, clubId: req.clubId!, createdById: req.user!.id })
      .returning({ id: event.id });
    res.status(201).json(await getEventDetail(row.id));
  },
);

// PATCH /api/clubs/:clubId  { name?, description?, logoKey?, links? }  -> the club
// Owner and admin only (editors can post events, but not change the club itself).
// The slug never changes, so links people have shared keep working after a rename.
clubsRouter.patch(
  "/:clubId",
  requireAuth,
  requireClubRole("owner", "admin"),
  async (req, res) => {
    const changes = updateClubSchema.parse(req.body);
    const [row] = await db
      .update(club)
      .set({ ...changes, updatedAt: new Date() })
      .where(eq(club.id, req.clubId!))
      .returning();
    res.json(toClubDetail(row));
  },
);

// DELETE /api/clubs/:clubId  -> 204
// Owner only. Permanent: the database also deletes the club's memberships and events
// (onDelete: "cascade" in schema.ts).
clubsRouter.delete(
  "/:clubId",
  requireAuth,
  requireClubRole("owner"),
  async (req, res) => {
    await db.delete(club).where(eq(club.id, req.clubId!));
    res.status(204).end();
  },
);
