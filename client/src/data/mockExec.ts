// WHAT: In-memory club-exec fixtures, loaded only with VITE_USE_MOCK_EXEC=true.
// WITHOUT IT: Offline frontend testing would need a database. Refresh resets all edits;
// these demo identities are NOT real accounts and no database writes happen here.
import type { ClubRole, EventDetail } from "@orbit/shared";
import type {
  ClubDetails,
  ClubInput,
  EventInput,
  ExecMember,
  MyClub,
} from "../lib/execTypes";
import { rankDemoFeed } from "../lib/demoFeed";
import { mockEvents } from "./mockEvents";

export const demoEvents: EventDetail[] = structuredClone(mockEvents);
export const demoClubs: ClubDetails[] = mockEvents.map((event) => ({
  ...event.club,
  description: `Fictional ${event.club.name} club for frontend testing.`,
  logoUrl: null,
  links: {},
  isFollowing: false,
}));
const roles = new Map<string, ClubRole>(
  demoClubs
    .slice(0, 3)
    .map((club, index) => [
      club.id,
      (["owner", "admin", "editor"] as const)[index],
    ]),
);
const members = new Map<string, ExecMember[]>(
  demoClubs.map((club) => [
    club.id,
    [
      {
        userId: "demo-owner",
        name: "Demo executive",
        image: null,
        role: roles.get(club.id) ?? "editor",
      },
      {
        userId: "demo-other",
        name: "Demo teammate",
        image: null,
        role: "editor",
      },
    ],
  ]),
);
const followed = new Set([demoClubs[0].id]);
const images = new Map<string, string>();
export const rememberDemoImage = (key: string, url: string) =>
  images.set(key, url);
export const demoMyClubs = (): MyClub[] =>
  demoClubs.flatMap((club) => {
    const role = roles.get(club.id);
    return role ? [{ ...club, role }] : [];
  });
export function demoClub(slug: string) {
  const club = demoClubs.find((item) => item.slug === slug);
  if (!club) throw new Error("Club not found.");
  return { ...club, isFollowing: followed.has(club.id) };
}
export function demoCreateClub(input: ClubInput) {
  const base =
    input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "club";
  let slug = base;
  for (let suffix = 2; demoClubs.some((club) => club.slug === slug); suffix++)
    slug = `${base}-${suffix}`;
  const club = {
    id: crypto.randomUUID(),
    slug,
    isFollowing: false,
    ...input,
    logoUrl: input.logoKey ? (images.get(input.logoKey) ?? null) : null,
  };
  demoClubs.push(club);
  roles.set(club.id, "owner");
  members.set(club.id, [
    {
      userId: "demo-owner",
      name: "Demo executive",
      image: null,
      role: "owner",
    },
  ]);
  return club;
}
export function demoUpdateClub(id: string, input: ClubInput) {
  const club = demoClubs.find((item) => item.id === id);
  if (!club) throw new Error("Club not found.");
  Object.assign(
    club,
    input,
    input.logoKey === undefined
      ? {}
      : { logoUrl: input.logoKey ? (images.get(input.logoKey) ?? null) : null },
  );
  // A renamed club keeps its slug, and embedded event names must refresh too.
  for (const event of demoEvents)
    if (event.club.id === id) event.club.name = club.name;
  return { ...club };
}
// Mirrors the server's cascade: the club's events, memberships and follows go with it.
export function demoDeleteClub(id: string) {
  const index = demoClubs.findIndex((item) => item.id === id);
  if (index === -1) throw new Error("Club not found.");
  if (roles.get(id) !== "owner")
    throw new Error("Only the owner can delete this club.");
  demoClubs.splice(index, 1);
  for (let i = demoEvents.length - 1; i >= 0; i--)
    if (demoEvents[i].club.id === id) demoEvents.splice(i, 1);
  roles.delete(id);
  members.delete(id);
  followed.delete(id);
}
export const demoMembers = (id: string) =>
  structuredClone(members.get(id) ?? []);
export function demoMemberWrite(
  id: string,
  action: "add" | "role" | "remove" | "transfer",
  userId: string,
  role: "admin" | "editor" = "editor",
) {
  const list = members.get(id) ?? [];
  if (action === "add") {
    if (list.some((member) => member.userId === `demo-${userId.toLowerCase()}`))
      throw new Error("This exec is already a member.");
    list.push({
      userId: `demo-${userId.toLowerCase()}`,
      name: userId.split("@")[0],
      image: null,
      role,
    });
  } else {
    const target = list.find((member) => member.userId === userId);
    if (!target) throw new Error("Exec not found.");
    if (action === "transfer") {
      for (const member of list)
        if (member.role === "owner") member.role = "admin";
      target.role = "owner";
      roles.set(id, "admin");
    } else if (action === "remove") {
      list.splice(list.indexOf(target), 1);
      if (userId === "demo-owner") roles.delete(id);
    } else {
      target.role = role;
      if (userId === "demo-owner") roles.set(id, role);
    }
  }
  members.set(id, list);
}
export function demoSaveEvent(clubId: string, input: EventInput, id?: string) {
  const club = demoClubs.find((item) => item.id === clubId);
  if (!club) throw new Error("Club not found.");
  const existing = id ? demoEvents.find((event) => event.id === id) : undefined;
  if (id && !existing) throw new Error("Event not found.");
  const saved: EventDetail = {
    id: id ?? crypto.randomUUID(),
    cancelledAt: existing?.cancelledAt ?? null,
    ...input,
    description: input.description ?? "",
    location: input.location ?? "",
    eligibility: input.eligibility ?? "",
    priceCents: input.priceCents ?? 0,
    registrationUrl: input.registrationUrl ?? null,
    club: { id: club.id, name: club.name, slug: club.slug },
    imageUrl:
      input.imageKey === undefined
        ? (existing?.imageUrl ?? null)
        : input.imageKey
          ? (images.get(input.imageKey) ?? null)
          : null,
  };
  if (existing) Object.assign(existing, saved);
  else demoEvents.push(saved);
  return saved;
}
export function demoCancelEvent(id: string) {
  const event = demoEvents.find((item) => item.id === id);
  if (!event) throw new Error("Event not found.");
  event.cancelledAt = new Date().toISOString();
}
export const demoFollowing = () => [...followed];
export function demoFollow(id: string, follow: boolean) {
  if (follow) followed.add(id);
  else followed.delete(id);
}
export function demoFeed() {
  return rankDemoFeed(
    demoEvents,
    followed,
    new Set(["demo-friend"]),
    ["arts_culture"],
    [
      {
        eventId: mockEvents[1].id,
        userId: "demo-friend",
        status: "going",
        showOnAttendeeList: true,
        isPublic: true,
      },
      {
        eventId: mockEvents[2].id,
        userId: "demo-friend",
        status: "interested",
        showOnAttendeeList: false,
        isPublic: true,
      },
    ],
  );
}
