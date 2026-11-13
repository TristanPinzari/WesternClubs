// WHAT: Settings for drizzle-kit, the command-line tool behind `npm run db:push` and
//   `npm run db:studio`: where the schema file is and which database to connect to.
// WITHOUT IT: Those commands would fail, so schema changes couldn't reach the database.
import { defineConfig } from "drizzle-kit";
import { existsSync } from "node:fs";

if (existsSync(".env")) process.loadEnvFile(".env");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "\nDATABASE_URL is missing. Put your Neon branch's connection string in server/.env " +
      "(README -> Getting Started, steps 2-3).\n",
  );
  process.exit(1);
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
});
