// WHAT: The Clubs page ("/clubs"): a searchable list of clubs from GET /api/clubs.
//   EXAMPLE PAGE: fetches from the API and handles loading, error, and empty states.
// WITHOUT IT: The Clubs tab would show nothing, and the team would lose its working
//   reference for how a page talks to the API.
import type { ClubSummary } from "@orbit/shared";
import { ChevronRight, Plus, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { listClubs } from "../lib/clubs";
import { btnPrimary, btnSecondary, initialOf } from "../lib/ui";
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Clubs</h1>
        <div className="flex flex-wrap gap-2">
          <Link to="/me/clubs" className={btnSecondary}>
            <ShieldCheck aria-hidden="true" />
            My clubs
          </Link>
          <Link to="/clubs/new" className={btnPrimary}>
            <Plus aria-hidden="true" />
            Create a club
          </Link>
        </div>
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
          <li key={club.id}>
            {/* The whole card is the link, like the event cards. */}
            <Link
              to={`/clubs/${club.slug}`}
              className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 transition hover:border-violet-300 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700"
            >
              {club.logoUrl ? (
                <img
                  src={club.logoUrl}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-xl border border-gray-200 object-cover"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-lg font-bold text-violet-700"
                >
                  {initialOf(club.name)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold group-hover:text-violet-800">
                  {club.name}
                </h2>
                {club.description && (
                  <p className="mt-0.5 line-clamp-2 text-sm text-gray-600">
                    {club.description}
                  </p>
                )}
              </div>
              <ChevronRight
                aria-hidden="true"
                className="h-5 w-5 shrink-0 text-gray-300 group-hover:text-violet-500"
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
