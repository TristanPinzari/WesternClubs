// WHAT: Middleware: functions that run before (or after) route handlers. Here: figuring
//   out who is signed in, blocking signed-out users, and turning errors into JSON responses.
// WITHOUT IT: Routes wouldn't know who the user is, anyone could call protected
//   endpoints, and crashes would return ugly HTML error pages instead of JSON.
import { fromNodeHeaders } from "better-auth/node";
import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { auth } from "./auth";

type SessionUser = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>["user"];

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
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

// TODO: requireClubRole(...roles) middleware.
//   Look up the club_member row for (req.params.clubId, req.user.id) and return 403
//   unless their role is one of `roles`. Usage:
//     router.post("/:clubId/events", requireAuth, requireClubRole("owner", "admin", "editor"), ...)
//   See the permissions table in docs/API.md.

// Express 5 forwards errors thrown in async handlers here automatically.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Invalid request", issues: err.issues });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
};
