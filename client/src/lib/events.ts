// WHAT: One place to choose between mock events and Naksh's public events API.
// WITHOUT IT: The feed and detail page could accidentally use different data sources.
import type {
  EventDetail,
  EventListQuery,
  EventSummary,
  Paginated,
} from "@orbit/shared";
import { apiGet } from "./api";
import { useMockExec } from "./demoMode";
import type { FeedEvent } from "./execTypes";

// Opt in explicitly for frontend-only work. Never hide API failures with fake data.
// Start with: VITE_USE_MOCK_EVENTS=true npm run dev:client
export const useMockEvents =
  import.meta.env.VITE_USE_MOCK_EVENTS === "true" || useMockExec;

type ListOptions = Pick<
  EventListQuery,
  "q" | "category" | "clubId" | "limit" | "offset"
>;

async function demoEvents() {
  return useMockExec
    ? (await import("../data/mockExec")).demoEvents
    : (await import("../data/mockEvents")).mockEvents;
}

export async function listEvents(
  options: ListOptions,
): Promise<Paginated<EventSummary>> {
  const q = options.q?.trim() ?? "";
  if (useMockEvents) {
    const mockEvents = await demoEvents();
    // Match the API: upcoming, not cancelled, soonest first; filters combine with AND.
    const items = mockEvents
      .filter(
        (event) =>
          !event.cancelledAt &&
          new Date(event.startsAt).getTime() >= Date.now() &&
          (!options.category || event.category === options.category) &&
          (!options.clubId || event.club.id === options.clubId) &&
          (!q ||
            `${event.title} ${event.description} ${event.club.name}`
              .toLowerCase()
              .includes(q.toLowerCase())),
      )
      .sort(
        (a, b) =>
          a.startsAt.localeCompare(b.startsAt) || a.id.localeCompare(b.id),
      );
    return {
      items: items.slice(options.offset, options.offset + options.limit),
      total: items.length,
    };
  }

  // apiGet already adds /api; using /api/events here would produce /api/api/events.
  const params = new URLSearchParams({
    limit: String(options.limit),
    offset: String(options.offset),
  });
  if (q) params.set("q", q);
  if (options.category) params.set("category", options.category);
  if (options.clubId) params.set("clubId", options.clubId);
  return apiGet<Paginated<EventSummary>>(`/events?${params}`);
}

export async function getEvent(id: string): Promise<EventDetail> {
  if (useMockEvents) {
    const mockEvents = await demoEvents();
    const event = mockEvents.find((item) => item.id === id);
    if (!event) throw new Error("Event not found");
    return event;
  }
  return apiGet<EventDetail>(`/events/${encodeURIComponent(id)}`);
}

export async function listForYou(
  limit: number,
  offset: number,
): Promise<Paginated<FeedEvent>> {
  if (useMockExec) {
    const items = (await import("../data/mockExec")).demoFeed();
    return { items: items.slice(offset, offset + limit), total: items.length };
  }
  // The feed contract has pagination, not q/category. All-events filters stay on that tab.
  return apiGet(
    `/feed?${new URLSearchParams({ limit: String(limit), offset: String(offset) })}`,
  );
}
