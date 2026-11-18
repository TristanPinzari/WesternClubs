// WHAT: Middleware: functions that run before (or after) route handlers. Here: figuring
//   out who is signed in, blocking signed-out users, and turning errors into JSON responses.
// WITHOUT IT: Routes wouldn't know who the user is, anyone could call protected
//   endpoints, and crashes would return ugly HTML error pages instead of JSON.
import type { ClubRole } from "@orbit/shared";
import { fromNodeHeaders } from "better-auth/node";
import { and, eq } from "drizzle-orm";
import type { ErrorRequestHandler, RequestHandler } from "express";
import { z, ZodError } from "zod";
import { auth } from "./auth";
import { db } from "./db";
import { club, clubMember } from "./db/schema";

type SessionUser = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>["user"];

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
      clubRole?: ClubRole; // set by requireClubRole, so handlers know your role
      clubId?: string; // set by requireClubRole: the club id from the URL, already validated
    }
  }
}

// Runs on every request: attaches the signed-in user (if any) to req.user.
export const loadSession: RequestHandler = async (req, _res, next) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  req.user = session?.user;
  next();
};

// Put this on any route that requires being signed in.
export const requireAuth: RequestHandler = (req, res, next) => {
  if (!req.user) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }
  next();
};

// Looks up a user's role in a club, in ONE query.
export async function getClubRole(
  clubId: string,
  userId: string,
): Promise<{ clubExists: boolean; role: ClubRole | null }> {
  const [row] = await db
    .select({ role: clubMember.role })
    .from(club)
    .leftJoin(
      clubMember,
      and(eq(clubMember.clubId, club.id), eq(clubMember.userId, userId)),
    )
    .where(eq(club.id, clubId));

  if (!row) return { clubExists: false, role: null }; // no such club
  return { clubExists: true, role: row.role }; // role is null if not a member
}

// Door check for club routes. Usage:
//   router.post("/:clubId/events", requireAuth, requireClubRole("owner", "admin", "editor"), ...)
export function requireClubRole(...roles: ClubRole[]): RequestHandler {
  return async (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ error: "Not signed in" });
      return;
    }

    const clubId = z.uuid().safeParse(req.params.clubId);
    if (!clubId.success) {
      res.status(404).json({ error: "Club not found" });
      return;
    }

    const { clubExists, role } = await getClubRole(clubId.data, req.user.id);
    if (!clubExists) {
      res.status(404).json({ error: "Club not found" });
      return;
    }
    if (!role || !roles.includes(role)) {
      res.status(403).json({ error: "You don't have permission to do that" });
      return;
    }

    req.clubRole = role; // so the route can apply finer rules (e.g. admins can't touch admins)
    req.clubId = clubId.data;
    next(); // all checks passed: continue to the route
  };
}

// Express 5 forwards errors thrown in async handlers here automatically.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Invalid request", issues: err.issues });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
};
