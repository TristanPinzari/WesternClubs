// WHAT: One place to choose between mock events and Naksh's public events API.
// WITHOUT IT: The feed and detail page could accidentally use different data sources.
import type {
  EventDetail,
  EventListQuery,
  EventSummary,
  Paginated,
} from "@orbit/shared";
import { apiGet } from "./api";

// Opt in explicitly for frontend-only work. Never hide API failures with fake data.
// Start with: VITE_USE_MOCK_EVENTS=true npm run dev:client
export const useMockEvents = import.meta.env.VITE_USE_MOCK_EVENTS === "true";

type ListOptions = Pick<EventListQuery, "q" | "category" | "limit" | "offset">;

export async function listEvents(
  options: ListOptions,
): Promise<Paginated<EventSummary>> {
  const q = options.q?.trim() ?? "";
  if (useMockEvents) {
    const { mockEvents } = await import("../data/mockEvents");
    // Match the API: upcoming, not cancelled, soonest first; filters combine with AND.
    const items = mockEvents
      .filter(
        (event) =>
          !event.cancelledAt &&
          new Date(event.startsAt).getTime() >= Date.now() &&
          (!options.category || event.category === options.category) &&
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
  return apiGet<Paginated<EventSummary>>(`/events?${params}`);
}

export async function getEvent(id: string): Promise<EventDetail> {
  if (useMockEvents) {
    const { mockEvents } = await import("../data/mockEvents");
    const event = mockEvents.find((item) => item.id === id);
    if (!event) throw new Error("Event not found");
    return event;
  }
  return apiGet<EventDetail>(`/events/${encodeURIComponent(id)}`);
}
