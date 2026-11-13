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

// TODO: add schemas and types as you build each endpoint in docs/API.md, e.g.
//   - createClubSchema       (name, description)
//   - createEventSchema      (title, category, startsAt, ... see the event table notes)
//   - eventListQuerySchema   (q, category, clubId, from, limit, offset)
//   - EventSummary / EventDetail response types
