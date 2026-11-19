// WHAT: Execute production feed SQL against an isolated PostgreSQL engine and the
// actual Drizzle schema. No .env, network database, or persistent demo users needed.
// Run with PGLITE_MODULE_PATH pointing to an installed @electric-sql/pglite/dist/index.js:
// node --import tsx --test tests/feed-query.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { generateDrizzleJson, generateMigration } from "drizzle-kit/api";
import { PgDialect } from "drizzle-orm/pg-core";
import * as schema from "../server/src/db/schema";
import { feedQuery } from "../server/src/queries/feed";

test("production feed SQL: two-account privacy, ranking, and pagination", async (t) => {
  const modulePath = process.env.PGLITE_MODULE_PATH;
  const { PGlite } = await import(
    modulePath ? pathToFileURL(modulePath).href : "@electric-sql/pglite"
  );
  const db = new PGlite();
  try {
    const statements = await generateMigration(
      generateDrizzleJson({}),
      generateDrizzleJson(schema),
    );
    await db.exec(statements.join(";\n"));
    await db.exec(`
      INSERT INTO "user" (id, name, email) VALUES
        ('a', 'Account A', 'a@example.test'),
        ('b', 'Private test identity B', 'b@example.test'),
        ('c', 'Not followed', 'c@example.test');
      INSERT INTO club (id, name, slug) VALUES
        ('00000000-0000-4000-8000-000000000001', 'Followed club', 'followed'),
        ('00000000-0000-4000-8000-000000000002', 'Other club', 'other');
      INSERT INTO club_follow (user_id, club_id) VALUES
        ('a', '00000000-0000-4000-8000-000000000001');
      INSERT INTO user_follow (follower_id, followee_id) VALUES ('a', 'b');
      INSERT INTO profile (user_id, interests) VALUES ('a', '{technology}');
    `);
    const id = (n: number) =>
      `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
    for (const [n, club, category, days, cancelled] of [
      [10, 1, "technology", 20, false], // club beats both other signals
      [20, 2, "technology", 10, false], // public RSVP beats interests
      [21, 2, "academic", 10, false], // public RSVP, no interest fallback
      [30, 2, "technology", 2, false],
      [40, 2, "academic", 1, false],
      [50, 2, "academic", -1, false],
      [60, 1, "technology", 1, true],
    ] as const) {
      await db.query(
        `INSERT INTO event (id, club_id, title, category, starts_at, cancelled_at)
         VALUES ($1, $2, $3, $4, now() + $5 * interval '1 day',
                 CASE WHEN $6 THEN now() ELSE NULL END)`,
        [id(n), id(club), `Event ${n}`, category, days, cancelled],
      );
    }
    await db.query(
      `INSERT INTO event_rsvp (event_id, user_id, status) VALUES
       ($1, 'b', 'going'), ($2, 'b', 'going'), ($3, 'b', 'interested'),
       ($2, 'c', 'going'), ($4, 'c', 'going')`,
      [id(10), id(20), id(21), id(40)],
    );
    const feed = async (limit = 20, offset = 0, viewer = "a") => {
      const query = new PgDialect().sqlToQuery(
        feedQuery(viewer, limit, offset, "https://media.test/"),
      );
      return (await db.query(query.sql, query.params)).rows[0];
    };
    const ranked = (data: any) =>
      data.items.map((item: any) => [item.title, item.reason]);
    const promoted = [
      ["Event 10", "followed_club"],
      ["Event 20", "followed_user"],
      ["Event 21", "followed_user"],
      ["Event 30", "interest"],
      ["Event 40", null],
    ];
    const demoted = [
      ["Event 10", "followed_club"],
      ["Event 30", "interest"],
      ["Event 20", "interest"],
      ["Event 40", null],
      ["Event 21", null],
    ];
    await t.test(
      "A follows B: public going/interested RSVPs promote, missing profile is public",
      async () => {
        const result = await feed();
        assert.deepEqual(ranked(result), promoted);
        assert.equal(result.total, 5);
        assert.doesNotMatch(
          JSON.stringify(result),
          /Private test identity|b@example|userId|attendees|follower/,
        );
      },
    );
    await t.test(
      "anonymous RSVPs demote even when B has a public profile",
      async () => {
        await db.exec(
          "INSERT INTO profile (user_id, is_public) VALUES ('b', true); UPDATE event_rsvp SET show_on_attendee_list = false WHERE user_id = 'b'",
        );
        assert.deepEqual(ranked(await feed()), demoted);
        await db.exec(
          "UPDATE event_rsvp SET show_on_attendee_list = true WHERE user_id = 'b'",
        );
        assert.deepEqual(ranked(await feed()), promoted);
      },
    );
    await t.test(
      "private profiles demote even with a stale follow and visible RSVPs",
      async () => {
        await db.exec(
          "UPDATE profile SET is_public = false WHERE user_id = 'b'",
        );
        assert.deepEqual(ranked(await feed()), demoted);
        await db.exec(
          "UPDATE profile SET is_public = true WHERE user_id = 'b'",
        );
        assert.deepEqual(ranked(await feed()), promoted);
      },
    );
    await t.test(
      "B blocking A demotes without revealing the block",
      async () => {
        await db.exec(
          "INSERT INTO user_block (blocker_id, blocked_id) VALUES ('b', 'a')",
        );
        assert.deepEqual(ranked(await feed()), demoted);
        await db.exec(
          "DELETE FROM user_block WHERE blocker_id = 'b' AND blocked_id = 'a'",
        );
        // Match main's directional attendee privacy: only B blocking A hides B.
        await db.exec(
          "INSERT INTO user_block (blocker_id, blocked_id) VALUES ('a', 'b')",
        );
        assert.deepEqual(ranked(await feed()), promoted);
        await db.exec(
          "DELETE FROM user_block WHERE blocker_id = 'a' AND blocked_id = 'b'",
        );
      },
    );
    await t.test("reverse follows do not count", async () => {
      await db.exec(
        "DELETE FROM user_follow WHERE follower_id = 'a'; INSERT INTO user_follow (follower_id, followee_id) VALUES ('b', 'a')",
      );
      assert.deepEqual(ranked(await feed()), demoted);
      await db.exec(
        "INSERT INTO user_follow (follower_id, followee_id) VALUES ('a', 'b')",
      );
    });
    await t.test(
      "multiple followed RSVPs do not duplicate events or inflate totals",
      async () => {
        await db.exec(
          "INSERT INTO user_follow (follower_id, followee_id) VALUES ('a', 'c')",
        );
        const result = await feed();
        assert.equal(result.total, 5);
        assert.equal(
          result.items.filter((item: any) => item.id === id(20)).length,
          1,
        );
        await db.exec(
          "DELETE FROM user_follow WHERE follower_id = 'a' AND followee_id = 'c'",
        );
      },
    );
    await t.test(
      "stable time/id ordering, page totals, and empty pages",
      async () => {
        await db.query(
          "UPDATE event SET starts_at = (SELECT starts_at FROM event WHERE id = $1) WHERE id = $2",
          [id(20), id(21)],
        );
        assert.deepEqual(ranked(await feed(2, 0)), promoted.slice(0, 2));
        assert.deepEqual(ranked(await feed(2, 2)), promoted.slice(2, 4));
        assert.deepEqual(await feed(2, 99), { total: 5, items: [] });
        assert.equal((await feed(2, 2)).total, 5);
      },
    );
    await t.test(
      "identity input remains parameterized and viewers cannot borrow A's ranking",
      async () => {
        const result = await feed(20, 0, "a'; DROP TABLE event; --");
        assert.equal(result.total, 5);
        assert.ok(result.items.every((item: any) => item.reason === null));
        assert.equal((await feed()).total, 5);
      },
    );
  } finally {
    await db.close();
  }
});
