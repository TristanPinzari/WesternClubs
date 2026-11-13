// WHAT: Reads and validates the settings in server/.env (database URL, secrets, AWS keys)
//   so the rest of the code can use them as `env.X` with proper types.
// WITHOUT IT: A missing or mistyped setting would cause confusing errors later (e.g. a
//   database error on the first request) instead of a clear message at startup.
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.url(),
  PORT: z.coerce.number().default(3000),
  APP_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(1),
  AWS_REGION: z.string().default("us-east-1"),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET: z.string().default("orbit-media-1"),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error(
    "\nThe server can't start because server/.env is missing or incomplete:\n",
  );
  for (const issue of result.error.issues) {
    const value = process.env[String(issue.path[0])];
    const problem = value === undefined ? "missing" : issue.message;
    console.error(`  - ${issue.path.join(".")}: ${problem}`);
  }
  console.error(
    "\nFix: copy the team's .env into server/.env (README -> Getting Started, step 3).\n",
  );
  process.exit(1);
}

export const env = result.data;
