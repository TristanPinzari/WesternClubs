// WHAT: Creates the database connection (`db`) that every route imports to run queries.
// WITHOUT IT: The server would have no way to talk to the Neon database.
import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "../env";
import * as schema from "./schema";

export const db = drizzle(env.DATABASE_URL, { schema });
