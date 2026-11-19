// WHAT: Profile and follow API calls, plus labels, in one place.
// WITHOUT IT: Every profile page would build its own URLs and labels, and they'd drift.
import type {
  LinkKind,
  Paginated,
  PersonSummary,
  Profile,
  UpdateProfileInput,
} from "@orbit/shared";
import { apiGet, apiWrite } from "./api";

// Everyone with a public profile (A to Z), or a search by name or program.
export function searchPeople(q: string, limit: number, offset: number) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  if (q.trim()) params.set("q", q.trim());
  return apiGet<Paginated<PersonSummary>>(`/users?${params}`);
}

// Up to 10 people who share your interests and you don't follow yet.
export const getSuggestions = () =>
  apiGet<PersonSummary[]>("/users/suggestions");

// 404 for both "doesn't exist" and "is private" (on purpose, see ProfilePage).
export const getProfile = (userId: string) =>
  apiGet<Profile>(`/profiles/${encodeURIComponent(userId)}`);

// Send only the fields you're changing; the rest stay as they were.
export const saveMyProfile = (body: UpdateProfileInput) =>
  apiWrite("/me/profile", "PUT", body);

export const setFollowing = (userId: string, follow: boolean) =>
  apiWrite(
    `/users/${encodeURIComponent(userId)}/follow`,
    follow ? "PUT" : "DELETE",
  );

// ---- Labels ----

// Typed by LinkKind, so adding a link kind in shared makes TypeScript ask for a label.
export const linkLabels: Record<LinkKind, string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
  github: "GitHub",
  discord: "Discord",
  website: "Website",
};

export const yearLabel = (year: number) =>
  year >= 5 ? "Year 5+" : `Year ${year}`;
