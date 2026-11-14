// WHAT: Fills the database with demo data: `npm run db:seed`. Safe to run more than once.
// WITHOUT IT: Everyone's local database (and the demo) would start empty, and you'd
//   have to create test clubs and events by hand.
import { and, eq, inArray } from "drizzle-orm";
import { db } from "./index";
import { club, event } from "./schema";

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

// ---- Events ----
// Look up the club ids by slug (they're random uuids, different on every database).
const clubRows = await db
  .select({ id: club.id, slug: club.slug })
  .from(club)
  .where(
    inArray(
      club.slug,
      clubs.map((c) => c.slug),
    ),
  );
const clubId = (slug: string) => clubRows.find((c) => c.slug === slug)!.id;

// Dates relative to "now", so the upcoming events stay upcoming whenever you seed.
const daysFromNow = (days: number, hour = 18) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
};

// A small set that covers the cases GET /api/events must handle: upcoming events in
// different categories, free and paid, plus one PAST and one CANCELLED event that
// the list must hide.
// TODO: replace/extend with 20-40 realistic events across all categories (see docs/tasks/aryan.md).
const events: (typeof event.$inferInsert)[] = [
  {
    clubId: clubId("western-ai"),
    title: "Intro to Machine Learning Workshop",
    description:
      "Hands-on workshop: train your first model in Python. No experience needed.",
    category: "technology",
    startsAt: daysFromNow(3),
    endsAt: daysFromNow(3, 20),
    location: "Middlesex College 105",
  },
  {
    clubId: clubId("western-finance-association"),
    title: "Finance Networking Night",
    description: "Meet analysts from Bay Street firms over food and drinks.",
    category: "networking",
    startsAt: daysFromNow(7),
    location: "Ivey Business School Atrium",
    priceCents: 1500,
    eligibility: "Open to all years",
  },
  {
    clubId: clubId("western-outdoors-club"),
    title: "Fall Hike at Komoka Provincial Park",
    description: "A relaxed 8 km hike. Carpools leave from the UCC.",
    category: "sports_recreation",
    startsAt: daysFromNow(10, 9),
    location: "Meet at UCC front doors",
    priceCents: 500,
  },
  {
    // PAST: must NOT appear in GET /api/events
    clubId: clubId("western-ai"),
    title: "AI Speaker Night (past)",
    category: "academic",
    startsAt: daysFromNow(-5),
    location: "Natural Sciences Centre 145",
  },
  {
    // CANCELLED: must NOT appear in GET /api/events
    clubId: clubId("western-outdoors-club"),
    title: "Climbing Social (cancelled)",
    category: "social",
    startsAt: daysFromNow(5),
    location: "Western Student Recreation Centre",
    cancelledAt: new Date(),
  },
];

// "Upsert" each seed event (update it if it exists, insert it if not), matched on
// (club, title). Updating matters: if we just skipped existing events, re-seeding in two
// weeks would leave their old dates in place and the feed would be empty.
//
// We match in code rather than with a unique index on (club_id, title) +
// onConflictDoUpdate, because that index would also apply to real clubs, and a club
// should be able to post two events with the same title (e.g. a weekly "General Meeting").
let inserted = 0;
let refreshed = 0;
for (const e of events) {
  // Explicit nulls so re-seeding also clears fields, e.g. un-cancels an event that was
  // cancelled while testing. (Drizzle skips `undefined` in .set(), but writes null.)
  const values = {
    endsAt: null,
    cancelledAt: null,
    ...e,
    updatedAt: new Date(),
  };
  const updated = await db
    .update(event)
    .set(values)
    .where(and(eq(event.clubId, e.clubId), eq(event.title, e.title)))
    .returning({ id: event.id });
  if (updated.length > 0) {
    refreshed++;
  } else {
    await db.insert(event).values(values);
    inserted++;
  }
}

console.log(
  `Seeded ${clubs.length} clubs; events: ${inserted} inserted, ${refreshed} refreshed`,
);
process.exit(0);
