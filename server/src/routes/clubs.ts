// WHAT: The API endpoints for clubs (everything under /api/clubs).
//   EXAMPLE ROUTER: copy this pattern for events.ts, profiles.ts, etc.
// WITHOUT IT: /api/clubs would return 404, and the Clubs page would show an error.
import {
  clubListQuerySchema,
  type ClubSummary,
  type Paginated,
} from "@orbit/shared";
import { count, eq, ilike } from "drizzle-orm";
import { Router } from "express";
import { db } from "../db";
import { club } from "../db/schema";
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

// TODO: POST /api/clubs (requireAuth). Insert the club AND a club_member row with
//   role "owner" for req.user. Do both inside db.transaction(...) so you never end
//   up with a club that has no owner.
