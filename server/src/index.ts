// WHAT: The backend's entry point. It creates the Express app, plugs in auth, middleware,
//   and every router, then starts listening for requests. `npm run dev` runs this file.
// WITHOUT IT: There is no backend server; every /api request would fail.
import { toNodeHandler } from "better-auth/node";
import express from "express";
import { auth } from "./auth";
import { env } from "./env";
import { errorHandler, loadSession } from "./middleware";
import { clubsRouter } from "./routes/clubs";
import { eventsRouter } from "./routes/events";
import { meRouter } from "./routes/me";
import { membersRouter } from "./routes/members";
import { profilesRouter } from "./routes/profiles";
import { uploadsRouter } from "./routes/uploads";
import { usersRouter } from "./routes/users";

const app = express();

// Better Auth must be mounted BEFORE express.json(), because it reads the raw body itself.
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());
app.use(loadSession);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/clubs", clubsRouter);
app.use("/api/clubs/:clubId", membersRouter); // members + transfer-ownership
app.use("/api/events", eventsRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/me", meRouter);
app.use("/api/users", usersRouter);
app.use("/api/profiles", profilesRouter);
// TODO: rsvps, feed... (see docs/API.md)

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});
