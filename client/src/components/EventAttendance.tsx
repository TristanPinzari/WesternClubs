// WHAT: The attendance section of an event page: going/interested counts, the RSVP
//   controls (with the "Show me on the attendee list" toggle), and the attendee list.
//   Self-contained: drop <EventAttendance eventId={...} closed={...} /> onto a page.
// WITHOUT IT: Students couldn't RSVP or see who else is going.
import type {
  AttendancePurpose,
  Attendee,
  MyRsvp,
  RsvpStatus,
  RsvpSummary,
} from "@orbit/shared";
import { ATTENDANCE_PURPOSES } from "@orbit/shared";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import Avatar from "./Avatar";
import { authClient } from "../lib/auth-client";
import {
  getAttendees,
  getRsvpSummary,
  purposeLabels,
  removeRsvp,
  saveRsvp,
} from "../lib/rsvps";

const statusLabels: Record<RsvpStatus, string> = {
  going: "Going",
  interested: "Interested",
};

// A brand-new RSVP starts VISIBLE. This default is the team decision: attendee lists
// are a big part of Orbit, so you opt out (anonymous), not in.
const newDraft = (status: RsvpStatus): MyRsvp => ({
  status,
  showOnAttendeeList: true,
  purpose: null,
  lookingForBuddy: false,
});

interface Props {
  eventId: string;
  closed: boolean; // cancelled or already over: show counts, hide the RSVP controls
}

export default function EventAttendance({ eventId, closed }: Props) {
  const { data: session, isPending } = authClient.useSession();
  const userId = session?.user.id ?? null;

  const [summary, setSummary] = useState<RsvpSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // `draft` is the RSVP being edited. null = the form is closed.
  const [draft, setDraft] = useState<MyRsvp | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  // Bumped after every save/remove so the counts and attendee list reload.
  const [version, setVersion] = useState(0);

  // Reload when the event, the signed-in user, or `version` changes. (`mine` depends
  // on who's signed in, so signing in/out on this page refreshes it too.)
  useEffect(() => {
    let ignore = false;
    getRsvpSummary(eventId)
      .then((data) => {
        if (!ignore) {
          setSummary(data);
          setLoadError(null);
        }
      })
      .catch((err: Error) => !ignore && setLoadError(err.message));
    return () => {
      ignore = true;
    };
  }, [eventId, userId, version]);

  async function handleConfirm() {
    if (!draft) return;
    setSaving(true);
    setActionError(null);
    try {
      await saveRsvp(eventId, draft);
      setDraft(null);
      setVersion((v) => v + 1);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    setSaving(true);
    setActionError(null);
    try {
      await removeRsvp(eventId);
      setVersion((v) => v + 1);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not remove.");
    } finally {
      setSaving(false);
    }
  }

  const mine = summary?.mine ?? null;
  const total = summary ? summary.goingCount + summary.interestedCount : 0;

  return (
    <section
      aria-label="Attendance"
      className="mt-6 rounded-xl border border-gray-200 bg-white p-4"
    >
      <h2 className="text-xl font-semibold">Who's going</h2>
      {summary && (
        <p className="mt-1 text-sm text-gray-600">
          {summary.goingCount} going · {summary.interestedCount} interested
        </p>
      )}
      {loadError && <p className="mt-2 text-sm text-red-600">{loadError}</p>}

      <div className="mt-4">
        {closed ? (
          <p className="text-sm text-gray-600">
            RSVPs are closed for this event.
          </p>
        ) : isPending ? null : !session ? (
          <p className="text-sm text-gray-700">
            <Link
              to="/sign-in"
              className="font-medium text-violet-700 underline"
            >
              Sign in
            </Link>{" "}
            to RSVP and see who's going.
          </p>
        ) : draft ? (
          <RsvpForm
            draft={draft}
            onChange={setDraft}
            onConfirm={handleConfirm}
            onCancel={() => setDraft(null)}
            saving={saving}
          />
        ) : mine ? (
          <div>
            <p className="font-medium">
              You're {mine.status === "going" ? "going" : "interested"}
              <span className="font-normal text-gray-600">
                {" · "}
                {mine.showOnAttendeeList
                  ? "on the attendee list"
                  : "anonymously"}
              </span>
            </p>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={() => setDraft(mine)}
                className="min-h-11 rounded-lg border border-gray-300 px-4 font-medium"
              >
                Change
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={saving}
                className="min-h-11 px-2 text-sm text-gray-600 underline disabled:opacity-50"
              >
                Remove RSVP
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            {(["interested", "going"] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setDraft(newDraft(status))}
                className={
                  status === "going"
                    ? "min-h-11 flex-1 rounded-lg bg-violet-700 px-4 font-semibold text-white"
                    : "min-h-11 flex-1 rounded-lg border border-violet-700 px-4 font-semibold text-violet-700"
                }
              >
                {statusLabels[status]}
              </button>
            ))}
          </div>
        )}
        {actionError && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {actionError}
          </p>
        )}
      </div>

      {/* The list itself needs a signed-in user (the API returns 401 otherwise). */}
      {session && (
        <AttendeeList
          eventId={eventId}
          version={version}
          currentUserId={session.user.id}
          totalRsvps={total}
        />
      )}
    </section>
  );
}

// ---- The RSVP step: status, the visibility toggle, and the optional extras ----

interface RsvpFormProps {
  draft: MyRsvp;
  onChange: (draft: MyRsvp) => void;
  onConfirm: () => void;
  onCancel: () => void;
  saving: boolean;
}

function RsvpForm({
  draft,
  onChange,
  onConfirm,
  onCancel,
  saving,
}: RsvpFormProps) {
  // Copies the draft with one field changed, e.g. update({ purpose: "networking" }).
  const update = (changes: Partial<MyRsvp>) =>
    onChange({ ...draft, ...changes });

  return (
    <div className="space-y-4">
      <div className="flex gap-2" role="group" aria-label="RSVP status">
        {(["interested", "going"] as const).map((status) => (
          <button
            key={status}
            type="button"
            aria-pressed={draft.status === status}
            onClick={() => update({ status })}
            className={`min-h-11 flex-1 rounded-lg border px-4 font-semibold ${
              draft.status === status
                ? "border-violet-700 bg-violet-700 text-white"
                : "border-gray-300 text-gray-700"
            }`}
          >
            {statusLabels[status]}
          </button>
        ))}
      </div>

      {/* The visibility toggle lives inside the RSVP step on purpose, switched on by
          default, so every student sees the choice before confirming. */}
      <label className="flex items-start justify-between gap-4 rounded-lg bg-gray-50 p-3">
        <span>
          <span className="block font-medium">
            Show me on the attendee list
          </span>
          <span className="block text-sm text-gray-600">
            {draft.showOnAttendeeList
              ? "Other students can see you're going and find you."
              : "You'll be counted, but your name won't be shown."}
          </span>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={draft.showOnAttendeeList}
          onChange={(e) => update({ showOnAttendeeList: e.target.checked })}
          className="peer sr-only"
        />
        {/* A visual switch. The real (hidden) checkbox above handles clicks and keyboard. */}
        <span
          aria-hidden="true"
          className="relative mt-1 h-6 w-11 shrink-0 rounded-full bg-gray-300 transition-colors peer-checked:bg-violet-700 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-violet-700 after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5"
        />
      </label>

      <fieldset>
        <legend className="text-sm font-medium">
          Why are you going? <span className="text-gray-500">(optional)</span>
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {ATTENDANCE_PURPOSES.map((purpose: AttendancePurpose) => (
            <button
              key={purpose}
              type="button"
              aria-pressed={draft.purpose === purpose}
              // Clicking the selected chip again clears it.
              onClick={() =>
                update({ purpose: draft.purpose === purpose ? null : purpose })
              }
              className={`min-h-9 rounded-full border px-3 text-sm ${
                draft.purpose === purpose
                  ? "border-violet-700 bg-violet-50 text-violet-800"
                  : "border-gray-300 text-gray-700"
              }`}
            >
              {purposeLabels[purpose]}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={draft.lookingForBuddy}
          onChange={(e) => update({ lookingForBuddy: e.target.checked })}
          className="h-4 w-4 accent-violet-700"
        />
        I'm looking for someone to go with
      </label>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onConfirm}
          disabled={saving}
          className="min-h-11 flex-1 rounded-lg bg-violet-700 px-4 font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Confirm RSVP"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 px-3 text-gray-600 underline"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ---- The attendee list ----

interface AttendeeListProps {
  eventId: string;
  version: number;
  currentUserId: string;
  totalRsvps: number;
}

function AttendeeList({
  eventId,
  version,
  currentUserId,
  totalRsvps,
}: AttendeeListProps) {
  const [attendees, setAttendees] = useState<Attendee[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    getAttendees(eventId)
      .then((data) => {
        if (!ignore) {
          setAttendees(data);
          setError(null);
        }
      })
      .catch((err: Error) => !ignore && setError(err.message));
    return () => {
      ignore = true;
    };
  }, [eventId, version]);

  if (error) return <p className="mt-4 text-sm text-red-600">{error}</p>;
  if (!attendees) return null;

  // People who RSVP'd anonymously are counted in totalRsvps but never sent to us,
  // so the difference is how many chose not to be shown. No names, just a number.
  const hidden = Math.max(0, totalRsvps - attendees.length);

  return (
    <div className="mt-5 border-t border-gray-100 pt-4">
      {attendees.length === 0 ? (
        <p className="text-sm text-gray-600">
          Nobody's on the attendee list yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {attendees.map((a) => (
            <li key={a.userId} className="flex items-center gap-3">
              <Avatar name={a.name} image={a.image} />
              <div className="min-w-0">
                {/* Names open the person's profile, where you can follow them. */}
                <p className="truncate font-medium">
                  <Link
                    to={`/profile/${a.userId}`}
                    className="hover:text-violet-700 hover:underline"
                  >
                    {a.name}
                  </Link>
                  {a.userId === currentUserId && (
                    <span className="font-normal text-gray-500"> (you)</span>
                  )}
                </p>
                <p className="text-sm text-gray-600">
                  {statusLabels[a.status]}
                  {a.purpose && ` · ${purposeLabels[a.purpose]}`}
                  {a.lookingForBuddy && (
                    <span className="ml-2 inline-block whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                      Looking for a buddy
                    </span>
                  )}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {hidden > 0 && (
        <p className="mt-3 text-sm text-gray-500">
          + {hidden} {hidden === 1 ? "person" : "people"} RSVP'd privately
        </p>
      )}
    </div>
  );
}
