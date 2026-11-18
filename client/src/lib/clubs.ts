// WHAT: Client adapter for documented club endpoints; mock writes are opt-in only.
// WITHOUT IT: Every form would duplicate paths and mix demo state with real requests.
import {
  createClubSchema,
  updateClubSchema,
  createEventSchema,
  updateEventSchema,
  type ClubSummary,
  type Paginated,
  type MyFollowing,
} from "@orbit/shared";
import { apiGet, apiWrite } from "./api";
import { useMockExec } from "./demoMode";
import type {
  ClubDetails,
  ClubInput,
  EventInput,
  ExecMember,
  MyClub,
} from "./execTypes";

const demo = () => import("../data/mockExec");
export async function listClubs(q: string): Promise<Paginated<ClubSummary>> {
  if (useMockExec) {
    const items = (await demo()).demoClubs.filter((club) =>
      club.name.toLowerCase().includes(q.trim().toLowerCase()),
    );
    return { items, total: items.length };
  }
  const params = new URLSearchParams({ limit: "100" });
  if (q.trim()) params.set("q", q.trim());
  return apiGet(`/clubs?${params}`);
}
export const getClub = async (slug: string): Promise<ClubDetails> =>
  useMockExec
    ? (await demo()).demoClub(slug)
    : apiGet(`/clubs/${encodeURIComponent(slug)}`);
// These array response contracts now come from the types merged into main.
export const getMyClubs = async (): Promise<MyClub[]> =>
  useMockExec ? (await demo()).demoMyClubs() : apiGet("/me/clubs");
export const getMembers = async (id: string): Promise<ExecMember[]> =>
  useMockExec
    ? (await demo()).demoMembers(id)
    : apiGet(`/clubs/${encodeURIComponent(id)}/members`);
export async function createClub(
  input: ClubInput,
): Promise<{ club: ClubDetails; warning?: string }> {
  // Validate both steps before creating anything. POST accepts only name/description.
  const basic = createClubSchema.parse(input);
  const details = updateClubSchema.parse({
    links: input.links,
    logoKey: input.logoKey,
  });
  if (useMockExec) return { club: (await demo()).demoCreateClub(input) };
  const created = await apiWrite<ClubSummary>("/clubs", "POST", basic);
  try {
    const club = await apiWrite<ClubDetails>(
      `/clubs/${encodeURIComponent(created.id)}`,
      "PATCH",
      details,
    );
    return { club };
  } catch {
    // POST already succeeded: don't invite a retry that creates a duplicate club.
    return {
      club: { ...created, links: {}, isFollowing: false },
      warning:
        "Your club was created, but its logo or links could not be saved. Please add them again in Settings.",
    };
  }
}
export const updateClub = async (id: string, input: ClubInput) =>
  useMockExec
    ? (await demo()).demoUpdateClub(id, input)
    : apiWrite(
        `/clubs/${encodeURIComponent(id)}`,
        "PATCH",
        updateClubSchema.parse(input),
      );
export async function writeMember(
  id: string,
  action: "add" | "role" | "remove" | "transfer",
  userId: string,
  role: "admin" | "editor" = "editor",
) {
  if (useMockExec)
    return (await demo()).demoMemberWrite(id, action, userId, role);
  const base = `/clubs/${encodeURIComponent(id)}`;
  if (action === "transfer")
    return apiWrite(`${base}/transfer-ownership`, "POST", { userId });
  if (action === "add")
    return apiWrite(`${base}/members`, "POST", { email: userId, role });
  return apiWrite(
    `${base}/members/${encodeURIComponent(userId)}`,
    action === "role" ? "PATCH" : "DELETE",
    action === "role" ? { role } : undefined,
  );
}
export async function getFollowedClubIds(): Promise<string[]> {
  if (useMockExec) return (await demo()).demoFollowing();
  const result = await apiGet<MyFollowing>("/me/following");
  return result.clubs.map((club) => club.id);
}
export const followClub = async (id: string, follow: boolean) =>
  useMockExec
    ? (await demo()).demoFollow(id, follow)
    : apiWrite(
        `/clubs/${encodeURIComponent(id)}/follow`,
        follow ? "PUT" : "DELETE",
      );
export const saveEvent = async (
  clubId: string,
  input: EventInput,
  id?: string,
): Promise<{ id: string }> =>
  useMockExec
    ? (await demo()).demoSaveEvent(clubId, input, id)
    : apiWrite(
        id
          ? `/events/${encodeURIComponent(id)}`
          : `/clubs/${encodeURIComponent(clubId)}/events`,
        id ? "PATCH" : "POST",
        id ? updateEventSchema.parse(input) : createEventSchema.parse(input),
      );
export const cancelEvent = async (id: string) =>
  useMockExec
    ? (await demo()).demoCancelEvent(id)
    : apiWrite(`/events/${encodeURIComponent(id)}/cancel`, "POST");
