// WHAT: The RSVP API calls and display labels, in one place for the RSVP panel, the
//   attendee list, and (later) the dashboard.
// WITHOUT IT: Each component would build these URLs and labels itself, and they'd drift.
import type {
  AttendancePurpose,
  Attendee,
  MyRsvp,
  RsvpBody,
  RsvpSummary,
} from "@orbit/shared";
import { apiGet, apiWrite } from "./api";

const rsvpPath = (eventId: string) =>
  `/events/${encodeURIComponent(eventId)}/rsvp`;

export const getRsvpSummary = (eventId: string) =>
  apiGet<RsvpSummary>(rsvpPath(eventId));

export const saveRsvp = (eventId: string, body: RsvpBody) =>
  apiWrite<MyRsvp>(rsvpPath(eventId), "PUT", body);

export const removeRsvp = (eventId: string) =>
  apiWrite(rsvpPath(eventId), "DELETE");

export const getAttendees = (eventId: string) =>
  apiGet<Attendee[]>(`/events/${encodeURIComponent(eventId)}/attendees`);

export const purposeLabels: Record<AttendancePurpose, string> = {
  meet_people: "Meeting new people",
  networking: "Networking",
  find_teammates: "Finding teammates",
  just_attending: "Just attending",
};
