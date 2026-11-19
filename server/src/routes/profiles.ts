// WHAT: Viewing student profiles (GET /api/profiles/:userId).
// WITHOUT IT: Clicking a name on an attendee list would lead nowhere.
import type { Profile } from "@orbit/shared";
import { and, eq } from "drizzle-orm";
import { Router } from "express";
import { hasBlocked } from "../blocks";
import { db } from "../db";
import { profile, user, userFollow } from "../db/schema";
import { requireAuth } from "../middleware";

export const profilesRouter = Router();

// A user's profile as `viewerId` is allowed to see it, or null if they can't see it:
// the user doesn't exist, or their profile is private and it isn't the viewer's own.
// Both cases look the same (404), so nobody can tell a private profile from no account.
export async function getProfile(
  userId: string,
  viewerId: string,
): Promise<Profile | null> {
  const [row] = await db
    .select({
      id: user.id,
      name: user.name,
      image: user.image,
      profile, // the whole profile row, or null if they haven't made one yet
    })
    .from(user)
    .leftJoin(profile, eq(profile.userId, user.id))
    .where(eq(user.id, userId));
  if (!row) return null;

  const isMe = userId === viewerId;
  const isPublic = row.profile?.isPublic ?? true; // no profile row yet = public
  if (!isPublic && !isMe) return null;
  // Blocked by them: same 404 as a private profile, so the block stays silent.
  if (!isMe && (await hasBlocked(userId, viewerId))) return null;

  let isFollowing = false;
  if (!isMe) {
    const [follow] = await db
      .select({ id: userFollow.followeeId })
      .from(userFollow)
      .where(
        and(
          eq(userFollow.followerId, viewerId),
          eq(userFollow.followeeId, userId),
        ),
      );
    isFollowing = !!follow;
  }

  return {
    userId: row.id,
    name: row.name,
    image: row.image,
    program: row.profile?.program ?? null,
    yearOfStudy: row.profile?.yearOfStudy ?? null,
    bio: row.profile?.bio ?? null,
    interests: row.profile?.interests ?? [],
    links: row.profile?.links ?? {},
    isPublic,
    isFollowing,
  };
}

// GET /api/profiles/:userId  -> Profile
// Signed in only. 404 if the profile is private (unless it's your own).
profilesRouter.get("/:userId", requireAuth, async (req, res) => {
  const found = await getProfile(String(req.params.userId), req.user!.id);
  if (!found) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  res.json(found);
});
