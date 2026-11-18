// WHAT: Aryan's signed-in feed, built incrementally from already-merged tables.
// WITHOUT IT: For you would work only with mocks. Public discovery stays at /events.
import {
  feedListQuerySchema,
  type FeedEvent,
  type Paginated,
} from "@orbit/shared";
import { Router } from "express";
import { db } from "../db";
import { requireAuth } from "../middleware";
import { feedQuery } from "../queries/feed";
import { MEDIA_BASE_URL } from "../s3";

export const feedRouter = Router();
feedRouter.get("/", requireAuth, async (req, res) => {
  const { limit, offset } = feedListQuerySchema.parse(req.query);
  const result = await db.execute<{ items: FeedEvent[]; total: number }>(
    feedQuery(req.user!.id, limit, offset, MEDIA_BASE_URL),
  );
  // Page and count share a snapshot; an out-of-range page still returns its total.
  const body: Paginated<FeedEvent> = result.rows[0];
  res.json(body);
});
