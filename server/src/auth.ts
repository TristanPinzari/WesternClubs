// WHAT: Configures Better Auth, the library that handles sign-up, sign-in, password
//   hashing, and session cookies for us. Docs: https://www.better-auth.com/docs
// WITHOUT IT: Nobody could create an account or sign in, and the server couldn't tell
//   who is making a request.
import { EMAIL_DOMAIN_ERROR, isAllowedEmail } from "@orbit/shared";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { db } from "./db";
import * as schema from "./db/schema";
import { env } from "./env";

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
        },
      },
      // Email changes are off today, but if someone turns them on later, this stops
      // a user from signing up with @uwo.ca and then switching to a gmail address.
      update: {
        before: async (data) => {
          if (typeof data.email === "string" && !isAllowedEmail(data.email)) {
            throw new APIError("BAD_REQUEST", { message: EMAIL_DOMAIN_ERROR });
          }
        },
      },
    },
  },
});
