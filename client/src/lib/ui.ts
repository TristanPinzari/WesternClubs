// WHAT: The app's few shared button styles, as Tailwind class strings. Use these for any
//   standalone action or destination (a <button> or a <Link>), so they all look alike.
// WITHOUT IT: Every page invented its own button, and many actions ended up as plain
//   underlined text. Keep underlined links only for links INSIDE a sentence.

const base =
  "inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700 [&>svg]:h-4 [&>svg]:w-4";

// The main action on a screen: Create a club, Post event, Save.
export const btnPrimary = `${base} bg-violet-700 text-white hover:bg-violet-800`;

// Everything else: navigation (My clubs, Followers), Try again, Clear filters.
export const btnSecondary = `${base} border border-gray-300 bg-white text-gray-700 hover:border-violet-300 hover:text-violet-700`;

// Destructive actions: Block, Remove.
export const btnDanger = `${base} border border-red-200 bg-white text-red-700 hover:border-red-300 hover:bg-red-50`;

// Low-emphasis actions that sit next to a bigger one: Skip, Cancel.
export const btnQuiet =
  "inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 disabled:pointer-events-none disabled:opacity-50 [&>svg]:h-4 [&>svg]:w-4";

// "← Back to …" links at the top of a page.
export const backLink =
  "-ml-1 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 text-sm font-medium text-gray-600 hover:text-violet-700 [&>svg]:h-4 [&>svg]:w-4";

// The letter shown on a club or person's placeholder tile. Array.from splits by real
// characters, so a name starting with an emoji or accented letter isn't cut in half.
export const initialOf = (name: string) =>
  (Array.from(name.trim())[0] ?? "?").toUpperCase();

// A link inside a sentence (the only place an underline belongs).
export const textLink =
  "font-medium text-violet-700 underline underline-offset-2 hover:text-violet-800";
