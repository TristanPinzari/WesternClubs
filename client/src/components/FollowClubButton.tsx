// WHAT: One-way follow/unfollow control. No follower counts or lists are requested.
// WITHOUT IT: Students could view clubs but not prioritize them in their own feed.
import { useState } from "react";
import { followClub } from "../lib/clubs";
import RequestState from "./RequestState";

// `initialFollowing` comes from GET /clubs/:slug (ClubDetail.isFollowing), so the
// button doesn't need to download the user's whole following list.
export default function FollowClubButton({
  clubId,
  initialFollowing,
}: {
  clubId: string;
  initialFollowing: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      await followClub(clubId, !following);
      setFollowing(!following);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update follow.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <RequestState error={error} />
      <button
        type="button"
        aria-pressed={following}
        disabled={busy}
        onClick={toggle}
        className="min-h-11 rounded-lg border border-violet-700 px-4 py-2 text-violet-700 disabled:opacity-50"
      >
        {busy ? "Saving…" : following ? "Unfollow" : "Follow"}
      </button>
    </div>
  );
}
