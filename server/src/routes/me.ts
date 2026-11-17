// WHAT: Endpoints about the signed-in user (everything under /api/me).
// WITHOUT IT: The frontend couldn't ask "which clubs am I an exec of?", so it wouldn't
//   know when to show the "Post event" and "Settings" buttons.
import type { MyClub } from "@orbit/shared";
import { asc, eq } from "drizzle-orm";
import { Router } from "express";
import { db } from "../db";
import { club, clubMember } from "../db/schema";
import { requireAuth } from "../middleware";
import { toClubSummary } from "./clubs";

export const meRouter = Router();

// Everything here is about "me", so every route needs a signed-in user.
meRouter.use(requireAuth);

// GET /api/me/clubs  -> MyClub[] (clubs I'm an exec of, with my role), A to Z
meRouter.get("/clubs", async (req, res) => {
  const rows = await db
    .select({ club, role: clubMember.role })
    .from(clubMember)
    .innerJoin(club, eq(club.id, clubMember.clubId))
    .where(eq(clubMember.userId, req.user!.id))
    .orderBy(asc(club.name), asc(club.id));
  const body: MyClub[] = rows.map((r) => ({
    ...toClubSummary(r.club),
    role: r.role,
  }));
  res.json(body);
});
