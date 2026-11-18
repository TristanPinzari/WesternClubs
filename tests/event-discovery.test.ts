// WHAT: Small, database-free checks for event formatting and demo-data requirements.
// WITHOUT IT: Missing categories, duplicate IDs, or unsafe registration links could regress.
// Run: node --import tsx --test tests/event-discovery.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { EVENT_CATEGORIES } from "@orbit/shared";
import { mockEvents } from "../client/src/data/mockEvents";
import {
  formatEventTime,
  formatPrice,
  registrationLink,
} from "../client/src/lib/eventDisplay";
import {
  demoClubs,
  demoEvents,
  demoEventId,
  demoStartsAt,
} from "../server/src/db/demoData";

test("prices distinguish free from paid and display integer cents correctly", () => {
  assert.equal(formatPrice(0), "Free");
  assert.equal(formatPrice(1500), "$15.00 CAD");
  assert.equal(formatPrice(599), "$5.99 CAD");
});

test("event times use Ontario time in both winter and summer", () => {
  assert.match(formatEventTime("2026-11-20T22:00:00Z"), /5:00.*EST/);
  assert.match(formatEventTime("2026-07-20T22:00:00Z"), /6:00.*EDT/);
});

test("registration only accepts complete HTTP(S) links", () => {
  assert.equal(
    registrationLink("https://example.org/register"),
    "https://example.org/register",
  );
  assert.equal(
    registrationLink("http://example.org/register"),
    "http://example.org/register",
  );
  for (const value of [
    null,
    "",
    "not a url",
    "javascript:alert(1)",
    "data:text/html,test",
    "/register",
  ]) {
    assert.equal(registrationLink(value), null);
  }
});

test("mock data covers every category and both free and paid events", () => {
  assert.deepEqual(
    new Set(mockEvents.map((event) => event.category)),
    new Set(EVENT_CATEGORIES),
  );
  assert.equal(
    new Set(mockEvents.map((event) => event.id)).size,
    mockEvents.length,
  );
  assert.ok(mockEvents.some((event) => event.priceCents === 0));
  assert.ok(mockEvents.some((event) => event.priceCents > 0));
  for (const event of mockEvents) {
    assert.ok(new Date(event.startsAt).getTime() > Date.now());
    assert.ok(
      event.title &&
        event.club.name &&
        event.description &&
        event.eligibility &&
        event.location,
    );
  }
});

test("database demos meet the 20–40 events requirement with all categories and more clubs", () => {
  assert.ok(demoEvents.length >= 20 && demoEvents.length <= 40);
  assert.deepEqual(
    new Set(demoEvents.map((event) => event.category)),
    new Set(EVENT_CATEGORIES),
  );
  assert.ok(demoClubs.length > 3);
  assert.ok(demoEvents.some((event) => event.priceCents === 0));
  assert.ok(demoEvents.some((event) => event.priceCents > 0));
  const slugs = new Set<string>(demoClubs.map((club) => club.slug));
  const keys = [...demoEvents.map((event) => event.key), 101, 102];
  assert.equal(new Set(keys.map(demoEventId)).size, keys.length);
  const now = new Date("2026-11-14T07:00:00Z");
  for (const event of demoEvents) {
    assert.ok(slugs.has(event.clubSlug));
    assert.ok(Number.isInteger(event.priceCents) && event.priceCents >= 0);
    assert.ok(event.daysFromNow >= 1 && event.daysFromNow <= 28);
    assert.ok(demoStartsAt(event.daysFromNow, now).getTime() > now.getTime());
    assert.match(
      demoEventId(event.key),
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  }
});
