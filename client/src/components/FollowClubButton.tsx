// WHAT: One-way follow/unfollow control. No follower counts or lists are requested.
// WITHOUT IT: Students could view clubs but not prioritize them in their own feed.
import { useCallback, useState } from "react";
import { followClub, getFollowedClubIds } from "../lib/clubs";
import { useResource } from "../hooks/useResource";
import RequestState from "./RequestState";

export default function FollowClubButton({ clubId }: { clubId: string }) {
  const state = useResource(useCallback(getFollowedClubIds, []));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const following = state.data?.includes(clubId) ?? false;
  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      await followClub(clubId, !following);
      state.retry();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update follow.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <RequestState error={state.error || error} retry={state.retry} />
      <button
        type="button"
        aria-pressed={following}
        disabled={state.loading || !state.data || busy}
        onClick={toggle}
        className="min-h-11 rounded-lg border border-violet-700 px-4 py-2 text-violet-700 disabled:opacity-50"
      >
        {busy ? "Saving…" : following ? "Unfollow" : "Follow"}
      </button>
    </div>
  );
}
