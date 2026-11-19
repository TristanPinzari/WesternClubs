// WHAT: Form validation and date/money conversion, independent of React and the DB.
// WITHOUT IT: Forms could submit fractional cents, invalid dates, or unsafe links.
import { registrationLink } from "./eventDisplay";
import { btnPrimary } from "./ui";
export const inputClass =
  "mt-1 min-h-11 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 transition focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100";
// Form submit buttons use the app's primary button style (lib/ui.ts).
export const buttonClass = btnPrimary;

export function priceToCents(value: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim()))
    throw new Error("Enter a non-negative price with at most two decimals.");
  const cents = Math.round(Number(value) * 100);
  if (!Number.isSafeInteger(cents) || cents > 1_000_000)
    throw new Error("Price must be $10,000 CAD or less.");
  return cents;
}
export function optionalHttpUrl(value: string): string | null {
  if (!value.trim()) return null;
  const url = registrationLink(value.trim());
  if (!url) throw new Error("Links must be complete http:// or https:// URLs.");
  return url;
}
export function localDateInput(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export function eventDates(start: string, end: string) {
  const startsAt = new Date(start);
  const endsAt = end ? new Date(end) : null;
  if (
    !start ||
    !Number.isFinite(startsAt.getTime()) ||
    (endsAt && !Number.isFinite(endsAt.getTime()))
  )
    throw new Error("Enter a valid date and time.");
  if (endsAt && endsAt <= startsAt)
    throw new Error("End time must be after start time.");
  return {
    startsAt: startsAt.toISOString(),
    endsAt: endsAt?.toISOString() ?? null,
  };
}
