// WHAT: Configures Better Auth, the library that handles sign-up, sign-in, password
//   hashing, and session cookies for us. Docs: https://www.better-auth.com/docs
// WITHOUT IT: Nobody could create an account or sign in, and the server couldn't tell
//   who is making a request.
import {
  EMAIL_DOMAIN_ERROR,
  isAllowedEmail,
  uploadKeySchema,
} from "@orbit/shared";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { db } from "./db";
import * as schema from "./db/schema";
import { env } from "./env";
import { MEDIA_BASE_URL } from "./s3";

// Profile pictures (user.image) must be images uploaded through POST /api/uploads to
// the users/ folder. Without this check, someone could call updateUser directly and set
// their picture to ANY web address: an offensive image, or a "tracking pixel" on their
// own server that records the IP address of everyone who views their profile.
// null/undefined (no picture) is fine.
function isAllowedProfileImage(image: unknown): boolean {
  if (image === null || image === undefined) return true;
  return (
    typeof image === "string" &&
    image.startsWith(MEDIA_BASE_URL) &&
    uploadKeySchema("users").safeParse(image.slice(MEDIA_BASE_URL.length))
      .success
  );
}
const PROFILE_IMAGE_ERROR = "Profile pictures must be uploaded through Orbit.";

// Minimal working setup: email + password sign-up and sign-in.
export const auth = betterAuth({
  baseURL: env.APP_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.APP_URL],
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: true },

  // Only @uwo.ca emails can have an account. These hooks run right before Better Auth
  // writes a user row, so they apply to EVERY way of creating a user (not just the
  // sign-up form), and nobody can skip them by calling the API directly.
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (!isAllowedEmail(user.email)) {
            throw new APIError("BAD_REQUEST", { message: EMAIL_DOMAIN_ERROR });
          }
          if (!isAllowedProfileImage(user.image)) {
            throw new APIError("BAD_REQUEST", { message: PROFILE_IMAGE_ERROR });
          }
        },
      },
      // Email changes are off today, but if someone turns them on later, this stops
      // a user from signing up with @uwo.ca and then switching to a gmail address.
      update: {
        before: async (data) => {
          if (typeof data.email === "string" && !isAllowedEmail(data.email)) {
            throw new APIError("BAD_REQUEST", { message: EMAIL_DOMAIN_ERROR });
          }
          if (!isAllowedProfileImage(data.image)) {
            throw new APIError("BAD_REQUEST", { message: PROFILE_IMAGE_ERROR });
          }
        },
      },
    },
  },
});
