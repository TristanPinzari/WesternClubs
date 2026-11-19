// WHAT: Managing a club's execs: listing them, adding, changing roles, removing (or
//   leaving), and transferring ownership. Mounted at /api/clubs/:clubId.
// WITHOUT IT: Every club would be stuck with just its creator as the only exec.
//
// The rules (docs/API.md, "Club permissions"):
//   - Owner: can add, remove, promote, and demote anyone except themselves.
//   - Admin: can add and remove EDITORS only. Can demote themselves to editor.
//   - Editor: can only leave.
//   - Nobody can remove or demote the owner. The owner can't leave. Ownership only
//     changes through transfer-ownership.
import {
  addMemberSchema,
  transferOwnershipSchema,
  updateMemberSchema,
  type ClubMember,
} from "@orbit/shared";
import { and, asc, eq, sql } from "drizzle-orm";
import { Router, type Response } from "express";
import { z } from "zod";
import { db } from "../db";
import { club, clubMember, user } from "../db/schema";
import { requireAuth, requireClubRole } from "../middleware";

// mergeParams: lets these routes read :clubId from the mount path in index.ts.
export const membersRouter = Router({ mergeParams: true });

// A club's execs: owner first, then admins, then editors (Postgres sorts an enum in the
// order it was declared: owner, admin, editor), then by name.
async function getMembers(clubId: string): Promise<ClubMember[]> {
  return db
    .select({
      userId: user.id,
      name: user.name,
      image: user.image,
      role: clubMember.role,
    })
    .from(clubMember)
    .innerJoin(user, eq(user.id, clubMember.userId))
    .where(eq(clubMember.clubId, clubId))
    .orderBy(asc(clubMember.role), asc(user.name), asc(user.id));
}

// The target member's row, or null (and a 404 sent) if they're not in this club.
async function findMember(res: Response, clubId: string, userId: string) {
  const [member] = await db
    .select()
    .from(clubMember)
    .where(and(eq(clubMember.clubId, clubId), eq(clubMember.userId, userId)));
  if (!member) {
    res.status(404).json({ error: "That person isn't an exec of this club" });
    return null;
  }
  return member;
}

const forbidden = (res: Response, error: string) =>
  res.status(403).json({ error });

// GET /api/clubs/:clubId/members  -> ClubMember[]   (public)
membersRouter.get("/members", async (req, res) => {
  // :clubId comes from the mount path (mergeParams), which TypeScript can't see here.
  const params = req.params as { clubId?: string };
  const clubId = z.uuid().safeParse(params.clubId);
  const [found] = clubId.success
    ? await db
        .select({ id: club.id })
        .from(club)
        .where(eq(club.id, clubId.data))
    : [];
  if (!found) {
    res.status(404).json({ error: "Club not found" });
    return;
  }
  res.json(await getMembers(found.id));
});

// POST /api/clubs/:clubId/members  { email, role }  -> 201 with the new member
membersRouter.post(
  "/members",
  requireAuth,
  requireClubRole("owner", "admin"),
  async (req, res) => {
    const { email, role } = addMemberSchema.parse(req.body);
    if (role === "admin" && req.clubRole !== "owner") {
      forbidden(res, "Only the owner can add admins");
      return;
    }

    // Emails are stored lowercase by Better Auth; lower() makes sure either way.
    const [person] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(sql`lower(${user.email})`, email));
    if (!person) {
      res
        .status(404)
        .json({ error: "No WesternClubs account uses that email" });
      return;
    }

    // onConflictDoNothing + returning: if they're already a member, nothing is
    // inserted and we get an empty list back. No "check first" race.
    const inserted = await db
      .insert(clubMember)
      .values({ clubId: req.clubId!, userId: person.id, role })
      .onConflictDoNothing()
      .returning();
    if (inserted.length === 0) {
      res.status(409).json({
        error: "They're already an exec. Change their role instead",
      });
      return;
    }
    const members = await getMembers(req.clubId!);
    res.status(201).json(members.find((m) => m.userId === person.id));
  },
);

// PATCH /api/clubs/:clubId/members/:userId  { role }  -> the updated member
membersRouter.patch(
  "/members/:userId",
  requireAuth,
  requireClubRole("owner", "admin"),
  async (req, res) => {
    const { role } = updateMemberSchema.parse(req.body);
    const targetId = String(req.params.userId);
    const target = await findMember(res, req.clubId!, targetId);
    if (!target) return;

    if (target.role === "owner") {
      forbidden(
        res,
        "The owner's role can't be changed. Transfer ownership first",
      );
      return;
    }
    // Admins can't promote or demote anyone, except demoting themselves to editor.
    const isSelfDemotion = targetId === req.user!.id && role === "editor";
    if (req.clubRole === "admin" && !isSelfDemotion) {
      forbidden(res, "Only the owner can promote or demote admins");
      return;
    }

    await db
      .update(clubMember)
      .set({ role })
      .where(
        and(
          eq(clubMember.clubId, req.clubId!),
          eq(clubMember.userId, targetId),
        ),
      );
    const members = await getMembers(req.clubId!);
    res.json(members.find((m) => m.userId === targetId));
  },
);

// DELETE /api/clubs/:clubId/members/:userId  -> 204
// Remove an exec, or leave the club yourself (any exec can call this on themselves).
membersRouter.delete(
  "/members/:userId",
  requireAuth,
  requireClubRole("owner", "admin", "editor"),
  async (req, res) => {
    const targetId = String(req.params.userId);
    const target = await findMember(res, req.clubId!, targetId);
    if (!target) return;

    const isSelf = targetId === req.user!.id;
    if (target.role === "owner") {
      forbidden(
        res,
        isSelf
          ? "The owner can't leave. Transfer ownership first"
          : "The owner can't be removed",
      );
      return;
    }
    const allowed =
      isSelf || // anyone can leave
      req.clubRole === "owner" || // the owner can remove anyone (except themselves)
      (req.clubRole === "admin" && target.role === "editor"); // admins: editors only
    if (!allowed) {
      forbidden(res, "Only the owner can remove admins");
      return;
    }

    await db
      .delete(clubMember)
      .where(
        and(
          eq(clubMember.clubId, req.clubId!),
          eq(clubMember.userId, targetId),
        ),
      );
    res.status(204).end();
  },
);

// Thrown inside the transfer transaction to roll it back.
class TargetGoneError extends Error {}

// POST /api/clubs/:clubId/transfer-ownership  { userId }  -> ClubMember[]
// Owner only. The new owner must already be an exec; the old owner becomes an admin.
membersRouter.post(
  "/transfer-ownership",
  requireAuth,
  requireClubRole("owner"),
  async (req, res) => {
    const { userId: newOwnerId } = transferOwnershipSchema.parse(req.body);
    const me = req.user!.id;
    if (newOwnerId === me) {
      res.status(400).json({ error: "You're already the owner" });
      return;
    }
    if (!(await findMember(res, req.clubId!, newOwnerId))) return;

    // Both changes or neither: a club must never end up with no owner (or two).
    const transferred = await db
      .transaction(async (tx) => {
        // Step 1: demote me. The `role = 'owner'` condition matters if I send two
        // transfers at once: the second finds I'm no longer owner and changes nothing.
        const demoted = await tx
          .update(clubMember)
          .set({ role: "admin" })
          .where(
            and(
              eq(clubMember.clubId, req.clubId!),
              eq(clubMember.userId, me),
              eq(clubMember.role, "owner"),
            ),
          )
          .returning();
        if (demoted.length === 0) return false;

        // Step 2: promote them. This must come AFTER step 1, or the one-owner index
        // would briefly see two owners and refuse.
        const promoted = await tx
          .update(clubMember)
          .set({ role: "owner" })
          .where(
            and(
              eq(clubMember.clubId, req.clubId!),
              eq(clubMember.userId, newOwnerId),
            ),
          )
          .returning();
        // They left (or were removed) after our findMember check above. Throwing undoes
        // step 1 too, so the club never ends up with no owner.
        if (promoted.length === 0) throw new TargetGoneError();
        return true;
      })
      .catch((err) => {
        if (err instanceof TargetGoneError) return "target-gone" as const;
        throw err;
      });
    if (transferred === "target-gone") {
      res.status(404).json({ error: "That person isn't an exec of this club" });
      return;
    }
    if (!transferred) {
      res
        .status(409)
        .json({ error: "You're no longer the owner of this club" });
      return;
    }
    res.json(await getMembers(req.clubId!));
  },
);
