// WHAT: Endpoints about other students (everything under /api/users): following them.
// WITHOUT IT: Students couldn't follow each other, so the "For you" feed couldn't show
//   "People you follow are going".
import { and, eq } from "drizzle-orm";
import { Router } from "express";
import { db } from "../db";
import { profile, user, userFollow } from "../db/schema";
import { requireAuth } from "../middleware";

export const usersRouter = Router();

// True if this user exists and their profile is public. No profile row yet counts as
// public (isPublic defaults to true). Used everywhere a profile could be exposed.
export async function isPublicProfile(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ isPublic: profile.isPublic })
    .from(user)
    .leftJoin(profile, eq(profile.userId, user.id))
    .where(eq(user.id, userId));
  return !!row && row.isPublic !== false; // isPublic is null when there's no profile row
}

// PUT /api/users/:userId/follow  -> 204    (follow a student)
// One-way, no approval. You can't follow yourself (400), and a private profile acts
// like it doesn't exist (404), so this can't be used to discover who has an account.
usersRouter.put("/:userId/follow", requireAuth, async (req, res) => {
  const targetId = String(req.params.userId);
  if (targetId === req.user!.id) {
    res.status(400).json({ error: "You can't follow yourself" });
    return;
  }
  if (!(await isPublicProfile(targetId))) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  await db
    .insert(userFollow)
    .values({ followerId: req.user!.id, followeeId: targetId })
    .onConflictDoNothing(); // already following: fine
  res.status(204).end();
});

// DELETE /api/users/:userId/follow  -> 204  (unfollow)
// Always allowed, even if their profile has since gone private.
usersRouter.delete("/:userId/follow", requireAuth, async (req, res) => {
  await db
    .delete(userFollow)
    .where(
      and(
        eq(userFollow.followerId, req.user!.id),
        eq(userFollow.followeeId, String(req.params.userId)),
      ),
    );
  res.status(204).end();
});
