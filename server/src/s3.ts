// WHAT: Helpers for images stored in AWS S3 (club logos, event images).
// WITHOUT IT: The API couldn't turn a stored image key into a URL the browser can load,
//   and (once the TODO below is done) users couldn't upload images.
import { env } from "./env";

// We store S3 object *keys* in the DB (e.g. "clubs/abc.png") and build the URL when responding.
export function mediaUrl(key: string | null): string | null {
  return key
    ? `https://${env.S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`
    : null;
}

// TODO: presigned uploads (see POST /api/uploads in docs/API.md).
//   1. npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner -w server
//   2. Write presignUpload(folder, contentType) that returns { key, uploadUrl }
//      using PutObjectCommand + getSignedUrl (expires in ~5 minutes).
//   3. The browser PUTs the file straight to uploadUrl, then sends `key` to our API.
