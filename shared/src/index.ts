// WHAT: Code shared by client and server: enums, request validation (Zod), and response
//   types. Both sides import from "@orbit/shared". Zod docs: https://zod.dev
// WITHOUT IT: The client and server would each define their own copies of these types.
//   If one changed and the other didn't, the app would break at runtime instead of
//   failing the typecheck.

import { z } from "zod";

// ---- Enums (the DB enums in server/src/db/schema.ts are built from these) ----

export const EVENT_CATEGORIES = [
  "academic",
  "social",
  "networking",
  "sports_recreation",
  "technology",
  "arts_culture",
] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export const CLUB_ROLES = ["owner", "admin", "editor"] as const;
export type ClubRole = (typeof CLUB_ROLES)[number];

export const RSVP_STATUSES = ["interested", "going"] as const;
export type RsvpStatus = (typeof RSVP_STATUSES)[number];

export const ATTENDANCE_PURPOSES = [
  "meet_people",
  "networking",
  "find_teammates",
  "just_attending",
] as const;
export type AttendancePurpose = (typeof ATTENDANCE_PURPOSES)[number];

export const CONNECTION_STATUSES = ["pending", "accepted"] as const;
export type ConnectionStatus = (typeof CONNECTION_STATUSES)[number];

// ---- EXAMPLE: validating query params (used by GET /api/clubs) ----

export const clubListQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20), // query params arrive as strings, so coerce
  offset: z.coerce.number().int().min(0).default(0),
});
export type ClubListQuery = z.infer<typeof clubListQuerySchema>;

// ---- EXAMPLE: response type ----

export interface ClubSummary {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string | null;
}

export interface Paginated<T> {
  items: T[];
  total: number;
}

// ---- Events (GET /api/events, GET /api/events/:id) ----

export const eventListQuerySchema = z.object({
  q: z.string().trim().min(1).optional(), // searches title, description, and club name
  category: z.enum(EVENT_CATEGORIES).optional(),
  clubId: z.uuid().optional(),
  from: z.coerce.date().optional(), // only events starting at/after this; defaults to now
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type EventListQuery = z.infer<typeof eventListQuerySchema>;

// The club info embedded in each event, so the UI can show "by Western AI" without a 2nd request.
export interface EventClub {
  id: string;
  name: string;
  slug: string;
}

// One event in a list. Dates are ISO strings (e.g. "2026-11-20T23:00:00.000Z") because
// JSON has no date type. Use `new Date(event.startsAt)` on the frontend to format them.
export interface EventSummary {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  startsAt: string;
  endsAt: string | null;
  location: string;
  priceCents: number; // 1500 = $15.00, 0 = free
  imageUrl: string | null;
  club: EventClub;
}

// The full event, for the detail page.
export interface EventDetail extends EventSummary {
  eligibility: string;
  registrationUrl: string | null;
  cancelledAt: string | null; // the detail page still loads cancelled events, so show a banner
  // TODO: goingCount / interestedCount once the event_rsvp table exists
}

// TODO: add schemas and types as you build each endpoint in docs/API.md, e.g.
//   - createClubSchema       (name, description)
//   - createEventSchema      (title, category, startsAt, ... see the event table notes)
