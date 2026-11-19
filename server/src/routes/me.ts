// WHAT: Endpoints about the signed-in user (everything under /api/me).
// WITHOUT IT: The frontend couldn't ask "which clubs am I an exec of?", so it wouldn't
//   know when to show the "Post event" and "Settings" buttons.
import {
  updateProfileSchema,
  type MyClub,
  type MyFollowing,
  type UserSummary,
} from "@orbit/shared";
import { and, asc, eq, isNull, or } from "drizzle-orm";
import { Router } from "express";
import { notBlockedBy } from "../blocks";
import { db } from "../db";
import {
  club,
  clubFollow,
  clubMember,
  profile,
  user,
  userBlock,
  userFollow,
} from "../db/schema";
import { requireAuth } from "../middleware";
import { toClubSummary } from "./clubs";
import { getProfile } from "./profiles";

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

// GET /api/me/following  -> { clubs, users } I follow, A to Z. Only I can see it.
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
          notBlockedBy(user.id, me),
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

// GET /api/me/followers  -> UserSummary[] (people who follow me), A to Z
// ONLY I can see my own followers. There's no count or list on anyone's profile, so
// nobody can compare popularity. Block someone to remove them (PUT /api/users/:id/block).
meRouter.get("/followers", async (req, res) => {
  const body: UserSummary[] = await db
    .select({ id: user.id, name: user.name, image: user.image })
    .from(userFollow)
    .innerJoin(user, eq(user.id, userFollow.followerId))
    .where(eq(userFollow.followeeId, req.user!.id))
    .orderBy(asc(user.name), asc(user.id));
  res.json(body);
});

// GET /api/me/blocked  -> UserSummary[] (people I've blocked), A to Z, so I can unblock
meRouter.get("/blocked", async (req, res) => {
  const body: UserSummary[] = await db
    .select({ id: user.id, name: user.name, image: user.image })
    .from(userBlock)
    .innerJoin(user, eq(user.id, userBlock.blockedId))
    .where(eq(userBlock.blockerId, req.user!.id))
    .orderBy(asc(user.name), asc(user.id));
  res.json(body);
});

// PUT /api/me/profile  { program?, yearOfStudy?, bio?, interests?, links?, isPublic? }
//   -> my Profile
// Creates my profile the first time, then updates only the fields I send.
meRouter.put("/profile", async (req, res) => {
  const me = req.user!.id;
  const changes = updateProfileSchema.parse(req.body);

  // Both steps or neither: if making the profile private, also remove my followers.
  await db.transaction(async (tx) => {
    // "Upsert": insert my profile row, or if it already exists, update it instead.
    await tx
      .insert(profile)
      .values({ userId: me, ...changes })
      .onConflictDoUpdate({
        target: profile.userId,
        set: { ...changes, updatedAt: new Date() },
      });
    // A private profile can't be followed (docs/API.md), so existing follows go too.
    if (changes.isPublic === false) {
      await tx.delete(userFollow).where(eq(userFollow.followeeId, me));
    }
  });

  res.json(await getProfile(me, me));
});
