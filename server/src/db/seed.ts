// WHAT: Fills the database with demo data: `npm run db:seed`. Safe to run more than once.
// WITHOUT IT: Everyone's local database (and the demo) would start empty, and you'd
//   have to create test clubs and events by hand.
import { inArray } from "drizzle-orm";
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

// Events have no natural unique key (like club.slug), so skip any whose
// (club, title) already exists. That keeps this script safe to run more than once.
const existing = await db
  .select({ clubId: event.clubId, title: event.title })
  .from(event);
const newEvents = events.filter(
  (e) => !existing.some((x) => x.clubId === e.clubId && x.title === e.title),
);
if (newEvents.length > 0) await db.insert(event).values(newEvents);

console.log(
  `Seeded ${clubs.length} clubs, ${newEvents.length} new events (${events.length - newEvents.length} already existed)`,
);
process.exit(0);
