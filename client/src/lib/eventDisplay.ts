// WHAT: Shared labels and formatting for the event feed and detail page.
// WITHOUT IT: Each page could show a different category, currency, or time zone.
import type { EventCategory } from "@orbit/shared";

export const categoryLabels: Record<EventCategory, string> = {
  academic: "Academic",
  social: "Social",
  networking: "Networking",
  sports_recreation: "Sports & recreation",
  technology: "Technology",
  arts_culture: "Arts & culture",
};

// Western events use London, Ontario time, even if a student browses from elsewhere.
// Intl also handles the switch between EST and EDT for the event's date.
export function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function formatEventTime(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}

// Pieces of an event date for the calendar-style tile ("NOV" / "20") and the card's
// "Thu" label. `year` lets a card show the year only when it isn't this year.
export function eventDateParts(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    month: get("month").replace(".", ""),
    day: get("day"),
    weekday: get("weekday").replace(".", ""),
    year: get("year"),
  };
}

export function formatPrice(priceCents: number) {
  if (priceCents === 0) return "Free";
  // The API stores whole cents. Only convert to dollars when displaying the price.
  return `${new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(priceCents / 100)} CAD`;
}

export function registrationLink(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    // A registration link must open a website, not execute a javascript: URL.
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
