// WHAT: Re-export Naksh's shared API types and define UI-only form/permission helpers.
// WITHOUT IT: Local copies could drift from real request validation and response fields.
import type {
  ClubRole,
  CreateEventInput,
  UpdateClubInput,
  UploadResponse,
} from "@orbit/shared";

export type {
  ClubDetail as ClubDetails,
  MyClub,
  ClubMember as ExecMember,
  UploadFolder,
} from "@orbit/shared";
export type ClubInput = Required<
  Pick<UpdateClubInput, "name" | "description" | "links">
> &
  Pick<UpdateClubInput, "logoKey">;
// Form dates are ISO strings; the shared schema coerces them to Dates on the server.
export type EventInput = Omit<CreateEventInput, "startsAt" | "endsAt"> & {
  startsAt: string;
  endsAt: string | null;
};
export type { FeedReason, FeedEvent } from "@orbit/shared";
export type UploadedImage = Pick<UploadResponse, "key" | "publicUrl">;

// These are presentation rules only. Every write still requires server authorization.
export const canManageClub = (role?: ClubRole) =>
  role === "owner" || role === "admin";
export const canPostEvent = (role?: ClubRole) => !!role;
export const canManageMember = (actor: ClubRole, target: ClubRole) =>
  target !== "owner" &&
  (actor === "owner" || (actor === "admin" && target === "editor"));
