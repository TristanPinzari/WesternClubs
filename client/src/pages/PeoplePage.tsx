// WHAT: "/people": find other students. Search by name or program, see suggestions
//   (people who share your interests), browse everyone, and follow them.
// WITHOUT IT: The only way to find a friend was to spot their name on an event's
//   attendee list. Only PUBLIC profiles ever appear here (the server enforces it).
import type { PersonSummary } from "@orbit/shared";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import Avatar from "../components/Avatar";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { authClient } from "../lib/auth-client";
import { categoryLabels } from "../lib/eventDisplay";
import {
  getSuggestions,
  searchPeople,
  setFollowing,
  yearLabel,
} from "../lib/profiles";

const PAGE_SIZE = 20;

export default function PeoplePage() {
  const { data: session, isPending } = authClient.useSession();
  const [search, setSearch] = useState("");
  const query = useDebouncedValue(search.trim());

  const [people, setPeople] = useState<PersonSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<PersonSummary[]>([]);

  const userId = session?.user.id;

  // First page of results whenever the (debounced) search changes.
  useEffect(() => {
    if (!userId) return;
    let ignore = false; // a slow older search must not overwrite a newer one
    setLoading(true);
    setError(null);
    searchPeople(query, PAGE_SIZE, 0)
      .then((page) => {
        if (ignore) return;
        setPeople(page.items);
        setTotal(page.total);
      })
      .catch((err: Error) => !ignore && setError(err.message))
      .finally(() => !ignore && setLoading(false));
    return () => {
      ignore = true;
    };
  }, [userId, query]);

  useEffect(() => {
    if (!userId) return;
    let ignore = false;
    getSuggestions()
      .then((list) => !ignore && setSuggestions(list))
      .catch(() => {
        // Suggestions are a bonus: if they fail, the search below still works.
      });
    return () => {
      ignore = true;
    };
  }, [userId]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const page = await searchPeople(query, PAGE_SIZE, people.length);
      setPeople((current) => [...current, ...page.items]);
      setTotal(page.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load more.");
    } finally {
      setLoadingMore(false);
    }
  }

  if (isPending) return null;
  if (!session) {
    return (
      <p className="text-gray-700">
        <Link to="/sign-in" className="font-medium text-violet-700 underline">
          Sign in
        </Link>{" "}
        to find other students.
      </p>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">People</h1>
      <p className="mt-1 text-gray-600">
        Find friends and classmates, and follow them to see the events they're
        going to.
      </p>

      <label htmlFor="people-search" className="mt-5 block text-sm font-medium">
        Search people
      </label>
      <input
        id="people-search"
        type="search"
        placeholder="Search by name or program"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mt-2 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
      />

      {/* Suggestions only when not searching, so results aren't pushed down. */}
      {!query && suggestions.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold">Suggested for you</h2>
          <p className="text-sm text-gray-600">
            People who share your interests.
          </p>
          <ul className="mt-3 space-y-3">
            {suggestions.map((person) => (
              <PersonCard key={person.id} person={person} />
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-lg font-semibold">
          {query ? "Results" : "Everyone"}
        </h2>
        {error && (
          <p role="alert" className="mt-2 text-red-600">
            {error}
          </p>
        )}
        {loading && people.length === 0 && (
          <p role="status" className="mt-2 text-gray-600">
            Loading…
          </p>
        )}
        {!loading && !error && people.length === 0 && (
          <p className="mt-2 text-gray-600">
            {query
              ? `Nobody matches "${query}". Private profiles never appear in search.`
              : "Nobody else is here yet."}
          </p>
        )}
        <ul
          className={`mt-3 space-y-3 ${loading && people.length > 0 ? "opacity-60" : ""}`}
        >
          {people.map((person) => (
            <PersonCard key={person.id} person={person} />
          ))}
        </ul>
        {people.length < total && (
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="mt-4 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-4 font-medium disabled:opacity-50"
          >
            {loadingMore ? "Loading…" : "Show more"}
          </button>
        )}
      </section>
    </div>
  );
}

// One person: picture and name (linking to their profile), program and year, shared
// interests, and a Follow button. No follower counts, by design.
function PersonCard({ person }: { person: PersonSummary }) {
  const [following, setFollowingState] = useState(person.isFollowing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      await setFollowing(person.id, !following);
      setFollowingState(!following);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update.");
    } finally {
      setBusy(false);
    }
  }

  const details = [
    person.program,
    person.yearOfStudy && yearLabel(person.yearOfStudy),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
      <Link
        to={`/profile/${person.id}`}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <Avatar name={person.name} image={person.image} />
        <span className="min-w-0">
          <span className="block truncate font-medium">{person.name}</span>
          {details && (
            <span className="block truncate text-sm text-gray-600">
              {details}
            </span>
          )}
          {person.sharedInterests.length > 0 && (
            <span className="block truncate text-xs text-violet-700">
              You both like{" "}
              {person.sharedInterests
                .map((interest) => categoryLabels[interest])
                .join(", ")}
            </span>
          )}
        </span>
      </Link>
      <div className="shrink-0 text-right">
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          aria-pressed={following}
          aria-label={`${following ? "Unfollow" : "Follow"} ${person.name}`}
          className={`min-h-11 rounded-lg px-4 text-sm font-semibold disabled:opacity-50 ${
            following
              ? "border border-gray-300 text-gray-800"
              : "bg-violet-700 text-white"
          }`}
        >
          {following ? "Following" : "Follow"}
        </button>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    </li>
  );
}
