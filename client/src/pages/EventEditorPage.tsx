// WHAT: Load the event's own club before showing editing/cancellation controls.
// WITHOUT IT: An unrelated club URL could accidentally determine the user's UI permissions.
import { useCallback, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import EventForm from "../components/EventForm";
import RequestState from "../components/RequestState";
import { useClubAccess } from "../hooks/useClubAccess";
import { useResource } from "../hooks/useResource";
import { cancelEvent, getClub, saveEvent } from "../lib/clubs";
import { getEvent } from "../lib/events";
import { canPostEvent } from "../lib/execTypes";

export default function EventEditorPage() {
  const { id, slug } = useParams();
  return <EventEditor key={id ?? slug} id={id} slug={slug} />;
}
function EventEditor({ id, slug }: { id?: string; slug?: string }) {
  const navigate = useNavigate();
  const state = useResource(
    useCallback(async () => {
      if (id) {
        const event = await getEvent(id);
        return { club: event.club, event };
      }
      return { club: await getClub(slug ?? ""), event: undefined };
    }, [id, slug]),
  );
  const access = useClubAccess(state.data?.club.id);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function cancel() {
    if (
      !id ||
      busy ||
      saving ||
      !window.confirm(
        "Are you sure you want to cancel this event? Students will see that registration is closed.",
      )
    )
      return;
    setBusy(true);
    setError(null);
    try {
      await cancelEvent(id);
      navigate(`/events/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel event.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      {state.data && (
        <Link
          className="inline-flex min-h-11 items-center text-violet-700 underline"
          to={`/clubs/${state.data.club.slug}`}
        >
          ← {state.data.club.name}
        </Link>
      )}
      <h1 className="text-2xl font-bold">{id ? "Edit event" : "Post event"}</h1>
      <RequestState {...state} />
      <RequestState
        loading={access.loading}
        error={access.viewer.error || access.error}
        retry={access.retry}
      />
      <RequestState error={error} />
      {!access.loading && state.data && !canPostEvent(access.role) && (
        <p className="mt-4">
          Only this club's execs can post or edit its events.
        </p>
      )}
      {!access.loading && state.data && canPostEvent(access.role) && (
        <>
          {state.data.event?.cancelledAt ? (
            <p className="mt-4">
              This event is cancelled. It cannot be reopened here.
            </p>
          ) : (
            <fieldset disabled={busy} className="min-w-0">
              <EventForm
                initial={state.data.event}
                onBusyChange={setSaving}
                onSave={async (input) => {
                  const saved = await saveEvent(state.data!.club.id, input, id);
                  navigate(`/events/${id ?? saved.id}`);
                }}
              />
            </fieldset>
          )}
          {id && !state.data.event?.cancelledAt && (
            <button
              type="button"
              disabled={busy || saving}
              onClick={cancel}
              className="mt-6 min-h-11 rounded-lg border border-red-700 px-4 py-2 text-red-700"
            >
              {busy ? "Cancelling…" : "Cancel event"}
            </button>
          )}
        </>
      )}
    </section>
  );
}
