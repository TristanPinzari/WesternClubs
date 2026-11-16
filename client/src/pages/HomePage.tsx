// WHAT: The event feed at "/", with search, categories, and paginated results.
// WITHOUT IT: Students would have no place to discover upcoming campus events.
import {
  EVENT_CATEGORIES,
  type EventCategory,
  type EventSummary,
  type Paginated,
} from "@orbit/shared";
import { useEffect, useState } from "react";
import EventCard from "../components/EventCard";
import { categoryLabels } from "../lib/eventDisplay";
import { listEvents, useMockEvents } from "../lib/events";

// Fetch a page at a time so events beyond the API's default first 20 remain reachable.
const PAGE_SIZE = 12;

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<EventCategory | "">("");
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<Paginated<EventSummary>>({
    items: [],
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    // A slow earlier request must not overwrite a newer search or update an unmounted page.
    // Cleanup flips this flag; it ignores the result, not the underlying HTTP request.
    let ignore = false;
    setLoading(true);
    setError(null);
    setResult({ items: [], total: 0 });
    listEvents({
      q: search,
      category: category || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    })
      .then((data) => {
        if (!ignore) setResult(data);
      })
      .catch((err: unknown) => {
        if (!ignore)
          setError(
            err instanceof Error ? err.message : "Could not load events.",
          );
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [search, category, page, retry]);

  function clearFilters() {
    setSearch("");
    setCategory("");
    setPage(0);
  }

  return (
    <section aria-labelledby="events-heading">
      <h1 id="events-heading" className="text-2xl font-bold">
        Upcoming events
      </h1>
      <p className="mt-2 text-gray-600">
        Find your next workshop, club social, or campus adventure.
      </p>
      {useMockEvents && (
        <p className="mt-2 text-sm text-violet-700">
          Demo events — sample listings, not real registrations.
        </p>
      )}

      <label htmlFor="event-search" className="mt-5 block text-sm font-medium">
        Search events
      </label>
      <input
        id="event-search"
        type="search"
        placeholder="Search events, clubs, or topics"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(0);
        }}
        className="mt-2 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus-visible:outline-2 focus-visible:outline-violet-700"
      />
      {/* Wrapping chips keeps every category reachable without horizontal scrolling. */}
      <div
        role="group"
        aria-label="Filter by category"
        className="mt-3 flex flex-wrap gap-2"
      >
        {(["", ...EVENT_CATEGORIES] as const).map((item) => (
          <button
            key={item || "all"}
            type="button"
            aria-pressed={category === item}
            onClick={() => {
              setCategory(item);
              setPage(0);
            }}
            className={`min-h-11 rounded-full px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700 ${category === item ? "bg-violet-700 text-white" : "bg-white text-gray-700 ring-1 ring-gray-300"}`}
          >
            {item ? categoryLabels[item] : "All"}
          </button>
        ))}
      </div>

      <div className="mt-6" aria-busy={loading}>
        {loading && (
          <p role="status" className="text-gray-600">
            Loading events…
          </p>
        )}
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4"
          >
            <p className="text-red-700">Could not load events: {error}</p>
            <button
              type="button"
              onClick={() => setRetry((value) => value + 1)}
              className="mt-2 min-h-11 font-semibold text-violet-700 underline"
            >
              Try again
            </button>
          </div>
        )}
        {/* The previous query's cards are hidden while loading or after a failure. */}
        {!loading && !error && (
          <>
            <p role="status" className="mb-3 text-sm text-gray-600">
              {result.total === 0
                ? "No events found."
                : `Showing ${page * PAGE_SIZE + 1}–${page * PAGE_SIZE + result.items.length} of ${result.total} events`}
            </p>
            {result.items.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-gray-600">
                  Try another search or category, or check back for new events.
                </p>
                {(search || category) && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-2 min-h-11 font-semibold text-violet-700 underline"
                  >
                    Clear filters
                  </button>
                )}
                {page > 0 && (
                  <button
                    type="button"
                    onClick={() => setPage(0)}
                    className="mt-2 block min-h-11 font-semibold text-violet-700 underline"
                  >
                    Back to first page
                  </button>
                )}
              </div>
            ) : (
              <ul className="space-y-3">
                {result.items.map((event) => (
                  <li key={event.id}>
                    <EventCard event={event} />
                  </li>
                ))}
              </ul>
            )}
            {(result.total > PAGE_SIZE || page > 0) && (
              <nav
                aria-label="Event pages"
                className="mt-5 flex items-center justify-between gap-3"
              >
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((value) => value - 1)}
                  className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 py-2 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">Page {page + 1}</span>
                <button
                  type="button"
                  disabled={(page + 1) * PAGE_SIZE >= result.total}
                  onClick={() => setPage((value) => value + 1)}
                  className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 py-2 disabled:opacity-40"
                >
                  Next
                </button>
              </nav>
            )}
          </>
        )}
      </div>
    </section>
  );
}
