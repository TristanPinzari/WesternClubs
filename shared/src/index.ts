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

// ---- Sign-up is restricted to Western students ----

export const ALLOWED_EMAIL_DOMAIN = "uwo.ca";
export const EMAIL_DOMAIN_ERROR = `Sign-up is limited to Western students with an @${ALLOWED_EMAIL_DOMAIN} email address.`;

// True only if the part after the LAST "@" is exactly "uwo.ca" (any capitalization).
// Compares the whole domain, so "x@uwo.ca.evil.com" and "x@notuwo.ca" are rejected.
// The server enforces this (server/src/auth.ts); the frontend can use it too, to show
// the error before submitting.
export function isAllowedEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@").pop();
  return domain === ALLOWED_EMAIL_DOMAIN;
}

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

// Forms often send empty fields (e.g. ?q=&category=). Treat "" (or just spaces) as
// "not set", so it means "no filter" instead of failing validation with a 400.
// z.preprocess runs this BEFORE the real schema checks the value.
const emptyAsUndefined = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    schema,
  );

export const eventListQuerySchema = z.object({
  q: emptyAsUndefined(z.string().trim().optional()), // searches title, description, and club name
  category: emptyAsUndefined(z.enum(EVENT_CATEGORIES).optional()),
  clubId: emptyAsUndefined(z.uuid().optional()),
  from: emptyAsUndefined(z.coerce.date().optional()), // only events at/after this (never before now)
  limit: emptyAsUndefined(z.coerce.number().int().min(1).max(100).default(20)),
  offset: emptyAsUndefined(z.coerce.number().int().min(0).default(0)),
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

// ---- Clubs (POST /api/clubs) ----

// The request body for creating a club. The server makes the slug from the name.
export const createClubSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(2000).default(""),
});
export type CreateClubInput = z.infer<typeof createClubSchema>;

// ---- Image uploads (POST /api/uploads) ----

export const UPLOAD_FOLDERS = ["clubs", "events", "users"] as const;
export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

// No SVG on purpose: an SVG file can contain JavaScript, which runs when someone opens
// the image's URL. Use these for the file input too: <input accept={...join(",")}>.
export const IMAGE_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
export type ImageContentType = (typeof IMAGE_CONTENT_TYPES)[number];

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

export const uploadRequestSchema = z.object({
  folder: z.enum(UPLOAD_FOLDERS),
  contentType: z.enum(IMAGE_CONTENT_TYPES), // the file's type, i.e. file.type
  size: z // the file's size in bytes, i.e. file.size
    .number()
    .int()
    .min(1)
    .max(MAX_UPLOAD_BYTES, "Images must be 5 MB or smaller"),
});
export type UploadRequest = z.infer<typeof uploadRequestSchema>;

// Upload flow: PUT the file to uploadUrl (with the same Content-Type header), then save
// `key` on the club/event, or `publicUrl` as your profile picture.
export interface UploadResponse {
  key: string; // e.g. "events/3f2a...c9.png"
  uploadUrl: string; // expires after 5 minutes
  publicUrl: string; // where the image can be viewed once uploaded
}

// Accepts only keys in the exact shape POST /api/uploads makes for this folder, e.g.
// "events/<uuid>.png". So a club can't use a key from another folder, or make one up.
export const uploadKeySchema = (folder: UploadFolder) =>
  z
    .string()
    .regex(
      new RegExp(`^${folder}/[0-9a-f-]{36}\\.(jpg|png|webp|gif)$`),
      "Invalid image",
    );

// ---- Creating and editing events ----

// For optional fields that can be cleared: a form sends "" for an empty box, which
// should mean "no value" (null), not "invalid".
const emptyAsNull = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? null : value,
    schema.nullable(),
  );

// Every editable field of an event, with its rules.
const eventFields = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  description: z.string().trim().max(5000),
  category: z.enum(EVENT_CATEGORIES),
  startsAt: z.coerce.date(),
  endsAt: emptyAsNull(z.coerce.date()),
  location: z.string().trim().max(200),
  priceCents: z.number().int().min(0).max(1_000_000), // up to $10,000
  eligibility: z.string().trim().max(500),
  // http(s) only. Otherwise someone could save "javascript:..." as the link, and
  // clicking "Register" on the event page would run their code.
  registrationUrl: emptyAsNull(z.url({ protocol: /^https?$/ }).max(2000)),
  // From POST /api/uploads. Must be in the events/ folder, so nobody can point their
  // event's image at another club's logo or someone's profile picture.
  imageKey: emptyAsNull(uploadKeySchema("events")),
});

// POST /api/clubs/:clubId/events. Title, category, and startsAt are required; anything
// left out gets the database default ("" for text, 0 for price, null for the rest).
export const createEventSchema = eventFields.partial({
  description: true,
  endsAt: true,
  location: true,
  priceCents: true,
  eligibility: true,
  registrationUrl: true,
  imageKey: true,
});
export type CreateEventInput = z.infer<typeof createEventSchema>;

// PATCH /api/events/:id. Send only the fields you want to change. There's no clubId
// field, so an event can never be moved to another club (unknown keys are dropped).
export const updateEventSchema = eventFields.partial();
export type UpdateEventInput = z.infer<typeof updateEventSchema>;

// ---- Links (on clubs, and on profiles) ----

export const LINK_KINDS = [
  "website",
  "instagram",
  "linkedin",
  "discord",
  "github",
] as const;
export type LinkKind = (typeof LINK_KINDS)[number];
export type Links = Partial<Record<LinkKind, string>>; // e.g. { instagram: "https://..." }

// http(s) only, so a link can never be "javascript:..." (see registrationUrl above).
const httpUrl = z.url({ protocol: /^https?$/ }).max(500);
const optionalLink = emptyAsUndefined(httpUrl.optional()); // "" = no link

// Unknown kinds are dropped. Sending links REPLACES all of them, so to remove one,
// send the object without it.
export const linksSchema = z.object({
  website: optionalLink,
  instagram: optionalLink,
  linkedin: optionalLink,
  discord: optionalLink,
  github: optionalLink,
});

// ---- Club settings (PATCH /api/clubs/:clubId) and GET /api/me/clubs ----

// GET /api/clubs/:slug and PATCH /api/clubs/:clubId return this.
export interface ClubDetail extends ClubSummary {
  links: Links;
  isFollowing: boolean; // does the signed-in user follow this club? (false if signed out)
}

// Send only what changed. There's no slug field: renaming keeps the old URL working.
export const updateClubSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    description: z.string().trim().max(2000),
    logoKey: emptyAsNull(uploadKeySchema("clubs")), // null removes the logo
    links: linksSchema,
  })
  .partial();
export type UpdateClubInput = z.infer<typeof updateClubSchema>;

// A club I'm an exec of. Use `role` to decide which buttons to show (the server
// still checks permissions on every request).
export interface MyClub extends ClubSummary {
  role: ClubRole;
}

// ---- Following ----

// A student as shown in lists: just enough for a name and a picture.
export interface UserSummary {
  id: string;
  name: string;
  image: string | null; // profile picture URL
}

// GET /api/me/following. Only you can see who you follow. There's deliberately no
// endpoint for followers or follower counts.
export interface MyFollowing {
  clubs: ClubSummary[];
  users: UserSummary[];
}

// TODO: add schemas and types as you build each endpoint in docs/API.md
