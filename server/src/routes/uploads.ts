// WHAT: POST /api/uploads, which hands the browser a short-lived URL to upload an image
//   straight to S3.
// WITHOUT IT: There'd be no way to add club logos, event images, or profile pictures.
import { uploadRequestSchema } from "@orbit/shared";
import { Router } from "express";
import { requireAuth } from "../middleware";
import { presignUpload } from "../s3";

export const uploadsRouter = Router();

// POST /api/uploads  { folder, contentType, size }  -> { key, uploadUrl, publicUrl }
//
// Any signed-in user can get an upload URL for any folder. That's safe because the
// key is brand new and random: uploading a file changes nothing on its own. It only
// shows up once someone saves the key, and saving goes through endpoints that check
// permissions (PATCH /api/clubs/:clubId, PATCH /api/events/:id, updating your profile).
uploadsRouter.post("/", requireAuth, async (req, res) => {
  const { folder, contentType, size } = uploadRequestSchema.parse(req.body);
  res.json(await presignUpload(folder, contentType, size));
});
