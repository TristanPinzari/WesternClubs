// WHAT: The Clubs page ("/clubs"): a searchable list of clubs from GET /api/clubs.
//   EXAMPLE PAGE: fetches from the API and handles loading, error, and empty states.
// WITHOUT IT: The Clubs tab would show nothing, and the team would lose its working
//   reference for how a page talks to the API.
import type { ClubSummary } from "@orbit/shared";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { listClubs } from "../lib/clubs";
import { useDebouncedValue } from "../hooks/useDebouncedValue";

export default function ClubsPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [clubs, setClubs] = useState<ClubSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Re-runs whenever `search` changes.
  useEffect(() => {
    let ignore = false; // avoids showing a stale response if the user keeps typing
    setLoading(true);
    listClubs(debouncedSearch)
      .then((data) => {
        if (!ignore) {
          setClubs(data.items);
          setError(null);
        }
      })
      .catch((err: Error) => !ignore && setError(err.message))
      .finally(() => !ignore && setLoading(false));

    return () => {
      ignore = true;
    };
  }, [debouncedSearch]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Clubs</h1>
      <div className="mt-3 flex flex-wrap gap-4 text-violet-700 underline">
        <Link to="/clubs/new" className="inline-flex min-h-11 items-center">
          Create a club
        </Link>
        <Link to="/me/clubs" className="inline-flex min-h-11 items-center">
          My clubs
        </Link>
      </div>

      <label htmlFor="club-search" className="sr-only">
        Search clubs
      </label>
      <input
        id="club-search"
        type="search"
        placeholder="Search clubs"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mt-4 w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
      />

      {error && <p className="mt-4 text-red-600">{error}</p>}
      {!error && !loading && clubs.length === 0 && (
        <p className="mt-4 text-gray-600">No clubs found.</p>
      )}

      <ul className="mt-4 space-y-3">
        {clubs.map((club) => (
          <li
            key={club.id}
            className="rounded-xl border border-gray-200 bg-white p-4"
          >
            <Link
              to={`/clubs/${club.slug}`}
              className="flex min-h-11 items-center gap-3 font-semibold text-violet-700 underline"
            >
              {club.logoUrl && (
                <img
                  src={club.logoUrl}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover"
                />
              )}
              <h2>{club.name}</h2>
            </Link>
            <p className="mt-1 text-sm text-gray-600">{club.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
