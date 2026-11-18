// WHAT: Paginated discovery with debounced search and an optional personalized tab.
// WITHOUT IT: Students cannot find events. Keep the last successful page while updating.
import {
  EVENT_CATEGORIES,
  type EventCategory,
  type EventSummary,
  type Paginated,
} from "@orbit/shared";
import { useEffect, useState } from "react";
import EventCard from "../components/EventCard";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useViewer } from "../hooks/useViewer";
import { categoryLabels } from "../lib/eventDisplay";
import { listEvents, listForYou, useMockEvents } from "../lib/events";
import type { FeedEvent } from "../lib/execTypes";

const PAGE_SIZE = 12;
type FeedResult = Paginated<EventSummary | FeedEvent> & {
  page: number;
  scope: string;
};

export default function HomePage() {
  const viewer = useViewer();
  const [tab, setTab] = useState<"all" | "for-you">("all");
  const forYou = tab === "for-you" && !!viewer.user;
  const scope = forYou ? viewer.user!.id : "public";
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());
  const [category, setCategory] = useState<EventCategory | "">("");
  // Tie pagination to the applied filters. Resetting on every keystroke would
  // accidentally fetch page one of the OLD search before the debounce finishes.
  const filterKey = JSON.stringify([
    scope,
    forYou ? "" : debouncedSearch,
    forYou ? "" : category,
  ]);
  const [pagination, setPagination] = useState({ key: filterKey, page: 0 });
  const page = pagination.key === filterKey ? pagination.page : 0;
  const [result, setResult] = useState<FeedResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const waitingForSearch = !forYou && search.trim() !== debouncedSearch;

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(null);
    // Ignore the old response immediately; don't send a partially typed query.
    if (waitingForSearch)
      return () => {
        ignore = true;
      };
    const request = forYou
      ? listForYou(PAGE_SIZE, page * PAGE_SIZE)
      : listEvents({
          q: debouncedSearch,
          category: category || undefined,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        });
    request
      .then((data) => {
        if (!ignore) setResult({ ...data, page, scope });
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
  }, [debouncedSearch, category, page, retry, forYou, scope, waitingForSearch]);

  // Never retain personalized results after signing out or switching identities.
  const visible = result?.scope === scope ? result : null;
  const updating = loading || waitingForSearch;
  const goToPage = (next: number) =>
    setPagination({ key: filterKey, page: next });
  function clearFilters() {
    setSearch("");
    setCategory("");
    goToPage(0);
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
      {viewer.user && (
        <div
          role="group"
          aria-label="Choose event feed"
          className="mt-4 flex gap-2"
        >
          {(["all", "for-you"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={tab === value}
              onClick={() => {
                setTab(value);
                setPagination({ key: "", page: 0 });
              }}
              className={`min-h-11 rounded-lg px-4 py-2 ${tab === value ? "bg-violet-700 text-white" : "bg-white ring-1 ring-gray-300"}`}
            >
              {value === "all" ? "All events" : "For you"}
            </button>
          ))}
        </div>
      )}
      {!forYou && (
        <>
          <label
            htmlFor="event-search"
            className="mt-5 block text-sm font-medium"
          >
            Search events
          </label>
          <input
            id="event-search"
            type="search"
            placeholder="Search events, clubs, or topics"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (e.target.value.trim() !== search.trim())
                setPagination({ key: "", page: 0 });
            }}
            className="mt-2 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus-visible:outline-2 focus-visible:outline-violet-700"
          />
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
                  setPagination({ key: "", page: 0 });
                }}
                className={`min-h-11 rounded-full px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700 ${category === item ? "bg-violet-700 text-white" : "bg-white text-gray-700 ring-1 ring-gray-300"}`}
              >
                {item ? categoryLabels[item] : "All"}
              </button>
            ))}
          </div>
        </>
      )}
      <div className="mt-6" aria-busy={updating}>
        {updating && (
          <p role="status" className="mb-3 text-gray-600">
            {visible ? "Updating…" : "Loading events…"}
          </p>
        )}
        {error && (
          <div
            role="alert"
            className="mb-3 rounded-lg border border-red-200 bg-red-50 p-4"
          >
            <p className="text-red-700">Could not load events: {error}</p>
            {forYou && (
              <p className="mt-2 text-sm">
                All events remains available while we retry your personalized
                feed.
              </p>
            )}
            <button
              type="button"
              onClick={() => setRetry((value) => value + 1)}
              className="mt-2 min-h-11 font-semibold text-violet-700 underline"
            >
              Try again
            </button>
          </div>
        )}
        {visible && (
          <>
            <p role="status" className="mb-3 text-sm text-gray-600">
              {error
                ? "Showing the last successful results."
                : visible.total === 0
                  ? !updating
                    ? "No events found."
                    : ""
                  : `Showing ${visible.page * PAGE_SIZE + 1}–${visible.page * PAGE_SIZE + visible.items.length} of ${visible.total} events`}
            </p>
            {visible.items.length === 0 && !updating && !error && (
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-gray-600">
                  Try another search or category, or check back for new events.
                </p>
                {!forYou && (search || category) && (
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
                    onClick={() => goToPage(0)}
                    className="mt-2 block min-h-11 text-violet-700 underline"
                  >
                    Back to first page
                  </button>
                )}
              </div>
            )}
            <ul className={`space-y-3 ${updating ? "opacity-60" : ""}`}>
              {visible.items.map((event) => (
                <li key={event.id}>
                  <EventCard
                    event={event}
                    reason={"reason" in event ? event.reason : null}
                  />
                </li>
              ))}
            </ul>
            {(visible.total > PAGE_SIZE || page > 0) && (
              <nav
                aria-label="Event pages"
                className="mt-5 flex items-center justify-between gap-3"
              >
                <button
                  type="button"
                  disabled={updating || !!error || page === 0}
                  onClick={() => goToPage(page - 1)}
                  className="min-h-11 rounded-lg border bg-white px-4 py-2 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {visible.page + 1}
                </span>
                <button
                  type="button"
                  disabled={
                    updating ||
                    !!error ||
                    (page + 1) * PAGE_SIZE >= visible.total
                  }
                  onClick={() => goToPage(page + 1)}
                  className="min-h-11 rounded-lg border bg-white px-4 py-2 disabled:opacity-40"
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
