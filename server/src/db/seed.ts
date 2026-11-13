// WHAT: Fills the database with demo data: `npm run db:seed`. Safe to run more than once.
// WITHOUT IT: Everyone's local database (and the demo) would start empty, and you'd
//   have to create test clubs and events by hand.
import { db } from "./index";
import { club } from "./schema";

const clubs: (typeof club.$inferInsert)[] = [
  {
    name: "Western AI",
    slug: "western-ai",
    description:
      "Workshops, speaker nights, and projects for students interested in AI.",
  },
  {
    name: "Western Finance Association",
    slug: "western-finance-association",
    description:
      "Networking events and case competitions for aspiring finance professionals.",
  },
  {
    name: "Western Outdoors Club",
    slug: "western-outdoors-club",
    description: "Hiking, climbing, and camping trips around Ontario.",
  },
];

await db.insert(club).values(clubs).onConflictDoNothing({ target: club.slug });

// TODO: seed realistic events for each club once the event table exists
//   (a mix of categories, dates over the next few weeks, some free, some paid).

console.log(`Seeded ${clubs.length} clubs`);
process.exit(0);
