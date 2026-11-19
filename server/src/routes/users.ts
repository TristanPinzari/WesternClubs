// WHAT: Endpoints about other students (everything under /api/users): finding them
//   (search and suggestions) and following them.
// WITHOUT IT: Students couldn't find their friends or follow each other, so the "For
//   you" feed couldn't show "People you follow are going".
import {
  peopleQuerySchema,
  type EventCategory,
  type Paginated,
  type PersonSummary,
} from "@orbit/shared";
import {
  and,
  arrayOverlaps,
  asc,
  count,
  eq,
  ilike,
  isNull,
  ne,
  or,
} from "drizzle-orm";
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

// Every query below must use this: private profiles never show up in lists. A missing
// profile row (null) counts as public, like everywhere else.
const isPublic = or(isNull(profile.isPublic), eq(profile.isPublic, true));

async function myInterests(userId: string): Promise<EventCategory[]> {
  const [row] = await db
    .select({ interests: profile.interests })
    .from(profile)
    .where(eq(profile.userId, userId));
  return row?.interests ?? [];
}

// The columns a PersonSummary needs. `followedBy` is my user id if I follow them (from
// the left join below), or null if I don't.
const personColumns = {
  id: user.id,
  name: user.name,
  image: user.image,
  program: profile.program,
  yearOfStudy: profile.yearOfStudy,
  interests: profile.interests,
  followedBy: userFollow.followerId,
};

function toPerson(
  row: {
    id: string;
    name: string;
    image: string | null;
    program: string | null;
    yearOfStudy: number | null;
    interests: EventCategory[] | null;
    followedBy: string | null;
  },
  mine: EventCategory[],
): PersonSummary {
  const theirs = row.interests ?? [];
  return {
    id: row.id,
    name: row.name,
    image: row.image,
    program: row.program,
    yearOfStudy: row.yearOfStudy,
    isFollowing: row.followedBy !== null,
    sharedInterests: mine.filter((interest) => theirs.includes(interest)),
  };
}

// LIKE treats % and _ as wildcards. Escape them so searching "100%" means "100%".
const likePattern = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

// GET /api/users?q=&limit=&offset=  -> Paginated<PersonSummary>
// Signed in only. Lists every PUBLIC profile except your own, A to Z, or searches them by
// name or program. Private profiles never appear. Never returns emails.
usersRouter.get("/", requireAuth, async (req, res) => {
  const query = peopleQuerySchema.parse(req.query);
  const me = req.user!.id;
  const pattern = query.q ? likePattern(query.q) : undefined;
  const where = and(
    ne(user.id, me),
    isPublic,
    pattern
      ? or(ilike(user.name, pattern), ilike(profile.program, pattern))
      : undefined,
  );

  const [rows, [{ total }], mine] = await Promise.all([
    db
      .select(personColumns)
      .from(user)
      .leftJoin(profile, eq(profile.userId, user.id))
      .leftJoin(
        userFollow,
        and(eq(userFollow.followeeId, user.id), eq(userFollow.followerId, me)),
      )
      .where(where)
      // Tie-break on id so pages never repeat or skip someone with the same name.
      .orderBy(asc(user.name), asc(user.id))
      .limit(query.limit)
      .offset(query.offset),
    db
      .select({ total: count() })
      .from(user)
      .leftJoin(profile, eq(profile.userId, user.id))
      .where(where),
    myInterests(me),
  ]);

  const body: Paginated<PersonSummary> = {
    items: rows.map((row) => toPerson(row, mine)),
    total,
  };
  res.json(body);
});

const MAX_SUGGESTIONS = 10;

// GET /api/users/suggestions  -> PersonSummary[]
// Up to 10 public profiles that share at least one interest with you, most shared
// interests first, excluding yourself and people you already follow. Empty if you
// haven't picked any interests yet.
usersRouter.get("/suggestions", requireAuth, async (req, res) => {
  const me = req.user!.id;
  const mine = await myInterests(me);
  if (mine.length === 0) {
    res.json([]);
    return;
  }

  const rows = await db
    .select(personColumns)
    .from(user)
    // INNER join: you need a profile with interests to be suggested.
    .innerJoin(profile, eq(profile.userId, user.id))
    .leftJoin(
      userFollow,
      and(eq(userFollow.followeeId, user.id), eq(userFollow.followerId, me)),
    )
    .where(
      and(
        ne(user.id, me),
        isPublic,
        arrayOverlaps(profile.interests, mine), // at least one interest in common
        isNull(userFollow.followerId), // not already followed
      ),
    )
    .orderBy(asc(user.name), asc(user.id))
    .limit(50); // a small pool, ranked below

  const suggestions = rows
    .map((row) => toPerson(row, mine))
    .sort((a, b) => b.sharedInterests.length - a.sharedInterests.length) // stable: keeps A to Z within ties
    .slice(0, MAX_SUGGESTIONS);
  res.json(suggestions);
});

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
