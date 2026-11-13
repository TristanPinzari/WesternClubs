// WHAT: Configures Better Auth, the library that handles sign-up, sign-in, password
//   hashing, and session cookies for us. Docs: https://www.better-auth.com/docs
// WITHOUT IT: Nobody could create an account or sign in, and the server couldn't tell
//   who is making a request.
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
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

  // TODO: only allow @uwo.ca emails to sign up.
  //   Look up Better Auth "databaseHooks" -> user.create.before, and throw an
  //   APIError("BAD_REQUEST", ...) (from "better-auth/api") when the email doesn't match.
});
