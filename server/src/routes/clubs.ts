// WHAT: The API endpoints for clubs (everything under /api/clubs).
//   EXAMPLE ROUTER: copy this pattern for events.ts, profiles.ts, etc.
// WITHOUT IT: /api/clubs would return 404, and the Clubs page would show an error.
import {
  clubListQuerySchema,
  createClubSchema,
  type ClubSummary,
  type Paginated,
} from "@orbit/shared";
import { count, eq, ilike } from "drizzle-orm";
import { Router } from "express";
import { db } from "../db";
import { club, clubMember } from "../db/schema";
import { requireAuth } from "../middleware";
import { mediaUrl } from "../s3";

export const clubsRouter = Router();

function toClubSummary(row: typeof club.$inferSelect): ClubSummary {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    logoUrl: mediaUrl(row.logoKey),
  };
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
  res.json(toClubSummary(row));
});

// "Western AI Club!" -> "western-ai-club". Accents are stripped ("Café" -> "cafe").
// Returns "" if the name has no letters or numbers (e.g. "!!!").
export function slugify(name: string): string {
  return name
    .normalize("NFKD") // split "é" into "e" + an accent mark...
    .replace(/[̀-ͯ]/g, "") // ...then drop the accent marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // any run of other characters becomes one "-"
    .replace(/^-+|-+$/g, ""); // no "-" at the start or end
}

// Postgres error code 23505 = "unique violation" (a value that must be unique already
// exists). Drizzle wraps database errors, so the Postgres error is in `cause`.
function isUniqueViolation(err: unknown): boolean {
  const cause =
    err instanceof Error ? (err.cause as { code?: string }) : undefined;
  return cause?.code === "23505";
}

// POST /api/clubs  { name, description? }  -> 201 with the new club
// Any signed-in student can create a club, and they become its owner.
clubsRouter.post("/", requireAuth, async (req, res) => {
  const input = createClubSchema.parse(req.body);
  const slug = slugify(input.name);
  if (!slug) {
    res
      .status(400)
      .json({ error: "Club name must contain at least one letter or number" });
    return;
  }

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
    res.status(201).json(toClubSummary(created));
  } catch (err) {
    // The slug column is unique. We don't check "does it exist?" first, because two
    // requests at the same moment could both pass that check. The database is the
    // only place that can enforce uniqueness reliably.
    if (isUniqueViolation(err)) {
      res.status(409).json({ error: "A club with this name already exists" });
      return;
    }
    throw err; // anything else is a real bug: errorHandler turns it into a 500
  }
});
