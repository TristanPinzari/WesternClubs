// WHAT: Endpoints about the signed-in user (everything under /api/me).
// WITHOUT IT: The frontend couldn't ask "which clubs am I an exec of?", so it wouldn't
//   know when to show the "Post event" and "Settings" buttons.
import type { MyClub, MyFollowing } from "@orbit/shared";
import { and, asc, eq, isNull, or } from "drizzle-orm";
import { Router } from "express";
import { db } from "../db";
import {
  club,
  clubFollow,
  clubMember,
  profile,
  user,
  userFollow,
} from "../db/schema";
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

// GET /api/me/following  -> { clubs, users } I follow, A to Z
// Only about me: there's deliberately no way to see who follows YOU, or how many.
meRouter.get("/following", async (req, res) => {
  const me = req.user!.id;
  const [clubRows, users] = await Promise.all([
    db
      .select({ club })
      .from(clubFollow)
      .innerJoin(club, eq(club.id, clubFollow.clubId))
      .where(eq(clubFollow.userId, me))
      .orderBy(asc(club.name), asc(club.id)),
    db
      .select({ id: user.id, name: user.name, image: user.image })
      .from(userFollow)
      .innerJoin(user, eq(user.id, userFollow.followeeId))
      .leftJoin(profile, eq(profile.userId, user.id))
      .where(
        and(
          eq(userFollow.followerId, me),
          // Skip anyone whose profile is now private (no profile row = public)
          or(isNull(profile.isPublic), eq(profile.isPublic, true)),
        ),
      )
      .orderBy(asc(user.name), asc(user.id)),
  ]);
  const body: MyFollowing = {
    clubs: clubRows.map((r) => toClubSummary(r.club)),
    users,
  };
  res.json(body);
});
