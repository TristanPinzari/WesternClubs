// WHAT: The Clubs page ("/clubs"): a searchable list of clubs from GET /api/clubs.
//   EXAMPLE PAGE: fetches from the API and handles loading, error, and empty states.
// WITHOUT IT: The Clubs tab would show nothing, and the team would lose its working
//   reference for how a page talks to the API.
import type { ClubSummary, Paginated } from "@orbit/shared";
import { useEffect, useState } from "react";
import { apiGet } from "../lib/api";

export default function ClubsPage() {
  const [search, setSearch] = useState("");
  const [clubs, setClubs] = useState<ClubSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Re-runs whenever `search` changes.
  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());

    let ignore = false; // avoids showing a stale response if the user keeps typing
    setLoading(true);
    apiGet<Paginated<ClubSummary>>(`/clubs?${params}`)
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
  }, [search]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Clubs</h1>

      <input
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
            <h2 className="font-semibold">{club.name}</h2>
            <p className="mt-1 text-sm text-gray-600">{club.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
