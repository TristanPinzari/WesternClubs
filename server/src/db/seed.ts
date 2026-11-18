// WHAT: Seeds nine clubs, 24 upcoming demo events, and two API test fixtures.
// WITHOUT IT: The demo would be sparse, with no examples for search and category filters.
// Run only against your personal Neon branch; Git branches do not isolate databases.
import { inArray } from "drizzle-orm";
import { demoClubs, demoEvents, demoEventId, demoStartsAt } from "./demoData";
import { db } from "./index";
import { club, event } from "./schema";

try {
  // A transaction makes the seed all-or-nothing if a club or event insert fails.
  await db.transaction(async (tx) => {
    await tx
      .insert(club)
      .values([...demoClubs])
      .onConflictDoNothing({ target: club.slug });
    const clubRows = await tx
      .select({ id: club.id, slug: club.slug })
      .from(club)
      .where(
        inArray(
          club.slug,
          demoClubs.map((item) => item.slug),
        ),
      );
    const clubIds = new Map(clubRows.map((row) => [row.slug, row.id]));
    function clubId(slug: string) {
      const id = clubIds.get(slug);
      if (!id) throw new Error(`Demo club was not found: ${slug}`);
      return id;
    }

    const now = new Date();
    const rows: (typeof event.$inferInsert)[] = demoEvents.map((item) => {
      const startsAt = demoStartsAt(item.daysFromNow, now);
      return {
        id: demoEventId(item.key),
        clubId: clubId(item.clubSlug),
        title: item.title,
        description: `Demo listing — this is a fictional event for testing, not an official announcement.\n\n${item.description}`,
        category: item.category,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 2 * 60 * 60 * 1000),
        location: item.location,
        priceCents: item.priceCents,
        eligibility:
          "Open to Western students of all years. This is sample demo information.",
        // Reserved example domain: exercise registration links without impersonating an organizer.
        // Every third listing has no link so the UI's missing-registration state is testable.
        registrationUrl:
          item.key % 3 === 0
            ? null
            : `https://example.org/orbit-demo/events/${item.key}`,
        cancelledAt: null,
      };
    });

    // Keep the past/cancelled cases from Naksh's seed. Neither belongs in the feed.
    // Explicit endsAt: null preserves main's refresh behavior: Drizzle skips
    // undefined fields, which would otherwise leave an old test end time in place.
    rows.push(
      {
        id: demoEventId(101),
        clubId: clubId("western-ai"),
        title: "AI Speaker Night (past)",
        description:
          "Demo fixture: an old link must still open, but this event must not appear in the upcoming feed.",
        category: "academic",
        startsAt: demoStartsAt(-5, now),
        endsAt: null,
        location: "Natural Sciences Centre 145",
        eligibility: "Demo fixture.",
        priceCents: 0,
        registrationUrl: null,
        cancelledAt: null,
      },
      {
        id: demoEventId(102),
        clubId: clubId("western-outdoors-club"),
        title: "Climbing Social (cancelled)",
        description:
          "Demo fixture: show the cancellation banner and disable registration.",
        category: "social",
        startsAt: demoStartsAt(5, now),
        endsAt: null,
        location: "Western Student Recreation Centre",
        eligibility: "Demo fixture.",
        priceCents: 0,
        registrationUrl: "https://example.org/orbit-demo/cancelled",
        cancelledAt: now,
      },
    );

    // Stable IDs keep re-running safe and refresh future dates for the demo.
    // No blanket DELETE or title-based overwrite: unrelated/older rows are left untouched.
    for (const row of rows) {
      const { id, ...values } = row;
      await tx
        .insert(event)
        .values(row)
        .onConflictDoUpdate({
          target: event.id,
          set: { ...values, updatedAt: now },
        });
    }
    console.log(
      `Seeded ${demoClubs.length} clubs, ${demoEvents.length} upcoming demo events, and 2 test fixtures.`,
    );
  });
} catch (err: unknown) {
  // Show the cause (missing column, invalid value, etc.) before the setup hint.
  console.error(err instanceof Error ? err.message : err);
  console.error(
    "Seed failed. Check your personal Neon connection and apply Naksh's schema first.",
  );
  process.exitCode = 1;
} finally {
  // Close the pool instead of forcing process.exit before work has fully settled.
  await db.$client.end();
}
