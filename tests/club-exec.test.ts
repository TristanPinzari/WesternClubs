// WHAT: Database-free checks for Aryan's forms, permission presentation, and demo ranking.
// WITHOUT IT: Money, links, privacy, and ordering could regress without a real backend.
import assert from "node:assert/strict";
import test from "node:test";
import {
  priceToCents,
  optionalHttpUrl,
  eventDates,
  localDateInput,
} from "../client/src/lib/formUtils";
import {
  canManageClub,
  canManageMember,
  canPostEvent,
} from "../client/src/lib/execTypes";
import { rankDemoFeed } from "../client/src/lib/demoFeed";
import { validateImage } from "../client/src/lib/uploads";
import { mockEvents } from "../client/src/data/mockEvents";
import {
  createClubSchema,
  createEventSchema,
  linksSchema,
  uploadRequestSchema,
  feedListQuerySchema,
} from "@orbit/shared";
import { feedQuery } from "../server/src/queries/feed";
import { PgDialect } from "drizzle-orm/pg-core";

test("form prices match main's integer cents and $10,000 limit", () => {
  assert.equal(priceToCents("0"), 0);
  assert.equal(priceToCents("12.99"), 1299);
  assert.equal(priceToCents("10000.00"), 1_000_000);
  for (const value of [
    "",
    "-1",
    "1.001",
    "NaN",
    "1e8",
    "10000.01",
    "21474836.48",
  ])
    assert.throws(() => priceToCents(value));
});

test("merged shared contracts require upload size and accept only supported club fields", () => {
  assert.equal(
    uploadRequestSchema.safeParse({ folder: "clubs", contentType: "image/png" })
      .success,
    false,
  );
  assert.equal(
    uploadRequestSchema.safeParse({
      folder: "clubs",
      contentType: "image/png",
      size: 20,
    }).success,
    true,
  );
  assert.deepEqual(
    linksSchema.parse({
      website: "https://example.org",
      Website: "https://example.org",
    }),
    { website: "https://example.org" },
  );
  assert.deepEqual(
    createClubSchema.parse({
      name: "New Club",
      links: { website: "https://example.org" },
    }),
    { name: "New Club", description: "" },
  );
  assert.equal(
    createEventSchema.safeParse({
      title: "Test",
      category: "academic",
      startsAt: "2030-01-01T00:00:00Z",
      priceCents: 1_000_001,
    }).success,
    false,
  );
});

test("feed query parameterizes identity/pagination and includes public followed RSVPs", () => {
  const identity = "a'; DROP TABLE event; --";
  const compiled = new PgDialect().sqlToQuery(
    feedQuery(identity, 12, 24, "https://example.org/"),
  );
  assert.equal(compiled.sql.includes(identity), false);
  assert.ok(compiled.params.includes(identity));
  assert.match(compiled.sql, /ORDER BY score DESC, starts_at, id/);
  assert.match(compiled.sql, /cancelled_at IS NULL/);
  assert.match(compiled.sql, /WHEN 2 THEN 'followed_user'/);
  assert.deepEqual(feedListQuerySchema.parse({ limit: "", offset: "" }), {
    limit: 20,
    offset: 0,
  });
  assert.equal(feedListQuerySchema.safeParse({ limit: 101 }).success, false);
});
test("form links reject executable/relative URLs and permit an empty optional link", () => {
  assert.equal(optionalHttpUrl(" "), null);
  assert.equal(
    optionalHttpUrl(" https://example.org "),
    "https://example.org/",
  );
  assert.throws(() => optionalHttpUrl("javascript:alert(1)"));
  assert.throws(() => optionalHttpUrl("/relative"));
});
test("form date conversion preserves local input and rejects reversed ranges", () => {
  const start = "2026-11-25T17:30";
  const dates = eventDates(start, "2026-11-25T19:00");
  assert.equal(localDateInput(dates.startsAt), start);
  assert.equal(eventDates(start, "").endsAt, null);
  assert.throws(() => eventDates(start, start));
  assert.throws(() => eventDates(start, "2026-11-25T16:00"));
  assert.throws(() => eventDates("", ""));
});
test("exec UI matches the owner/admin/editor permission matrix", () => {
  assert.equal(canManageClub("editor"), false);
  assert.equal(canManageClub("admin"), true);
  assert.equal(canManageClub("owner"), true);
  assert.equal(canPostEvent(undefined), false);
  for (const role of ["owner", "admin", "editor"] as const) {
    assert.equal(canPostEvent(role), true);
    assert.equal(canManageMember(role, "owner"), false);
  }
  assert.equal(canManageMember("admin", "admin"), false);
  assert.equal(canManageMember("admin", "editor"), true);
  assert.equal(canManageMember("owner", "admin"), true);
  assert.equal(canManageMember("editor", "editor"), false);
});
test("image validation rejects SVG, non-images, empty/oversized files", () => {
  validateImage({ type: "image/png", size: 1024 });
  for (const file of [
    { type: "image/svg+xml", size: 100 },
    { type: "text/plain", size: 100 },
    { type: "image/png", size: 0 },
    { type: "image/png", size: 5 * 1024 * 1024 + 1 },
  ])
    assert.throws(() => validateImage(file));
});
test("feed ranking uses highest matching reason, upcoming only, stable time/id ties", () => {
  const events = mockEvents.map((event, index) => ({
    ...event,
    id: String(index),
    startsAt: "2026-12-01T22:00:00Z",
  }));
  events.push({ ...events[0], id: "past", startsAt: "2026-10-01T22:00:00Z" });
  events.push({
    ...events[0],
    id: "cancelled",
    cancelledAt: "2026-11-01T22:00:00Z",
  });
  const ranked = rankDemoFeed(
    events,
    new Set([events[3].club.id]),
    new Set(["friend"]),
    [events[0].category],
    [
      {
        eventId: "3",
        userId: "friend",
        status: "going",
        showOnAttendeeList: true,
        isPublic: true,
      },
      {
        eventId: "4",
        userId: "friend",
        status: "interested",
        showOnAttendeeList: true,
        isPublic: true,
      },
    ],
    Date.parse("2026-11-17T00:00:00Z"),
  );
  assert.deepEqual(
    ranked.map((item) => item.id),
    ["3", "4", "0", "1", "2", "5"],
  );
  assert.deepEqual(
    ranked.slice(0, 3).map((item) => item.reason),
    ["followed_club", "followed_user", "interest"],
  );
});
test("anonymous, private-profile, and non-followed RSVPs do not influence feed", () => {
  const event = { ...mockEvents[0], startsAt: "2026-12-01T22:00:00Z" };
  for (const [showOnAttendeeList, isPublic, userId] of [
    [false, true, "friend"],
    [true, false, "friend"],
    [true, true, "stranger"],
  ] as const) {
    const result = rankDemoFeed(
      [event],
      new Set(),
      new Set(["friend"]),
      [],
      [
        {
          eventId: event.id,
          userId,
          status: "going",
          showOnAttendeeList,
          isPublic,
        },
      ],
      0,
    );
    assert.equal(result[0].reason, null);
  }
});

test("demo privacy matches production for missing profiles and silent blocks", () => {
  const event = { ...mockEvents[0], startsAt: "2099-12-01T22:00:00Z" };
  for (const blockedViewer of [false, true]) {
    const result = rankDemoFeed(
      [event],
      new Set(),
      new Set(["friend"]),
      [],
      [
        {
          eventId: event.id,
          userId: "friend",
          status: "going",
          showOnAttendeeList: true,
          isPublic: null,
          blockedViewer,
        },
      ],
    );
    assert.equal(result[0].reason, blockedViewer ? null : "followed_user");
  }
});
