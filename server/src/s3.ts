// WHAT: Helpers for images stored in AWS S3 (club logos, event images, profile pictures).
// WITHOUT IT: The API couldn't turn a stored image key into a URL the browser can load,
//   and users couldn't upload images.
import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type {
  ImageContentType,
  UploadFolder,
  UploadResponse,
} from "@orbit/shared";
import { env } from "./env";

// Every uploaded image's URL starts with this.
export const MEDIA_BASE_URL = `https://${env.S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/`;

// We store S3 object *keys* in the DB (e.g. "clubs/abc.png") and build the URL when responding.
export function mediaUrl(key: string | null): string | null {
  return key ? MEDIA_BASE_URL + key : null;
}

const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials:
    env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: env.AWS_ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined, // no keys in .env: the SDK looks elsewhere (and fails if none)
});

const EXTENSIONS: Record<ImageContentType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const UPLOAD_URL_EXPIRES_SECONDS = 5 * 60;

// Makes a one-time, 5-minute "permission slip" that lets the browser upload ONE file
// straight to S3, without the file passing through our server.
//
// The slip is signed for this exact key, content type, AND size. If the browser sends
// a different type or a bigger file, S3 rejects it ("SignatureDoesNotMatch"). That's
// how we enforce the 5 MB limit even though our server never sees the file.
export async function presignUpload(
  folder: UploadFolder,
  contentType: ImageContentType,
  size: number,
  userId: string,
): Promise<UploadResponse> {
  // A random name, so uploads can never overwrite each other (or someone else's).
  // Profile pictures go in a folder named after the uploader, so nobody can save
  // someone else's picture as their own (checked in auth.ts).
  const prefix = folder === "users" ? `users/${userId}` : folder;
  const key = `${prefix}/${randomUUID()}.${EXTENSIONS[contentType]}`;
  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      ContentType: contentType,
      ContentLength: size,
    }),
    {
      expiresIn: UPLOAD_URL_EXPIRES_SECONDS,
      // The SDK doesn't sign Content-Type by default, which would let someone upload
      // with a different type, e.g. text/html, making S3 serve their file as a web
      // page. Signing it locks the type in. (Content-Length is signed already.)
      signableHeaders: new Set(["content-type"]),
    },
  );
  return { key, uploadUrl, publicUrl: mediaUrl(key)! };
}
