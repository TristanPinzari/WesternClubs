// WHAT: "/me/followers": who follows me (only I can see this), with a Block button, plus
//   the people I've blocked, with Unblock.
// WITHOUT IT: You'd have no idea who's following you, and no way to stop someone from
//   seeing where you're going. A block is silent: to them you look like a private profile.
import type { UserSummary } from "@orbit/shared";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import Avatar from "../components/Avatar";
import FollowTabs from "../components/FollowTabs";
import { authClient } from "../lib/auth-client";
import { getBlocked, getFollowers, setBlocked } from "../lib/profiles";
import { btnDanger, btnSecondary, textLink } from "../lib/ui";

export default function FollowersPage() {
  const { data: session, isPending } = authClient.useSession();
  const [followers, setFollowers] = useState<UserSummary[] | null>(null);
  const [blocked, setBlockedList] = useState<UserSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    let ignore = false;
    Promise.all([getFollowers(), getBlocked()])
      .then(([f, b]) => {
        if (ignore) return;
        setFollowers(f);
        setBlockedList(b);
      })
      .catch((err: Error) => !ignore && setError(err.message));
    return () => {
      ignore = true;
    };
  }, [userId]);

  async function block(person: UserSummary) {
    if (
      !window.confirm(
        `Block ${person.name}? They'll stop following you and won't be able to see your profile, find you in search, or see you on attendee lists. They won't be told.`,
      )
    )
      return;
    setBusyId(person.id);
    setError(null);
    try {
      await setBlocked(person.id, true);
      setFollowers((list) => list?.filter((p) => p.id !== person.id) ?? null);
      setBlockedList((list) =>
        [...(list ?? []), person].sort((a, b) => a.name.localeCompare(b.name)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not block.");
    } finally {
      setBusyId(null);
    }
  }

  async function unblock(person: UserSummary) {
    setBusyId(person.id);
    setError(null);
    try {
      await setBlocked(person.id, false);
      setBlockedList((list) => list?.filter((p) => p.id !== person.id) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not unblock.");
    } finally {
      setBusyId(null);
    }
  }

  if (isPending) return null;
  if (!session) {
    return (
      <p className="text-gray-700">
        <Link to="/sign-in" className={textLink}>
          Sign in
        </Link>{" "}
        to see your followers.
      </p>
    );
  }

  return (
    <div>
      <FollowTabs />
      <h1 className="mt-5 text-2xl font-bold">Followers</h1>
      <p className="mt-1 text-gray-600">
        Only you can see this list. Nobody else can see who follows you, or how
        many.
      </p>
      {error && (
        <p role="alert" className="mt-4 text-red-600">
          {error}
        </p>
      )}
      {!followers && !error && <p className="mt-4 text-gray-600">Loading…</p>}

      {followers && (
        <section className="mt-6">
          {followers.length === 0 ? (
            <p className="text-sm text-gray-600">Nobody follows you yet.</p>
          ) : (
            <ul className="space-y-3">
              {followers.map((person) => (
                <PersonRow
                  key={person.id}
                  person={person}
                  action="Block"
                  danger
                  busy={busyId === person.id}
                  onAction={() => block(person)}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      {blocked && blocked.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Blocked</h2>
          <p className="text-sm text-gray-600">
            They can't see your profile or find you. Unblocking doesn't bring
            back their follow.
          </p>
          <ul className="mt-3 space-y-3">
            {blocked.map((person) => (
              <PersonRow
                key={person.id}
                person={person}
                action="Unblock"
                busy={busyId === person.id}
                onAction={() => unblock(person)}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function PersonRow({
  person,
  action,
  danger = false,
  busy,
  onAction,
}: {
  person: UserSummary;
  action: string;
  danger?: boolean;
  busy: boolean;
  onAction: () => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
      <Link
        to={`/profile/${person.id}`}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <Avatar name={person.name} image={person.image} />
        <span className="truncate font-medium">{person.name}</span>
      </Link>
      <button
        type="button"
        onClick={onAction}
        disabled={busy}
        aria-label={`${action} ${person.name}`}
        className={danger ? btnDanger : btnSecondary}
      >
        {busy ? "Saving…" : action}
      </button>
    </li>
  );
}
