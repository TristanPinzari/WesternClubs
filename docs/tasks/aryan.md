<!--
  WHAT: Aryan's task list, in priority order. Tick boxes off as you go.
  WITHOUT IT: It would be unclear what to work on next, and in what order.
-->

# Aryan: Event Discovery (Frontend)

You own what students see first: the event feed, search and filters, and the event detail page. You also own the demo data, so the app looks alive during the demo.

**Core work reverified against updated main on November 16, 2026.** See
[the implementation walkthrough and PR steps](aryan-implementation.md) for the
15-milestone audit, compatibility recheck, and PR steps targeting `main`.
Stretch goals remain optional and are not included in this PR.

**Read first:** [`client/src/pages/ClubsPage.tsx`](../../client/src/pages/ClubsPage.tsx), [`client/src/App.tsx`](../../client/src/App.tsx), [`client/src/lib/api.ts`](../../client/src/lib/api.ts)

**Useful docs:** [React](https://react.dev/learn) (start with "Thinking in React") · [Tailwind](https://tailwindcss.com/docs) · [React Router](https://reactrouter.com/start/declarative/routing)

## 1. Build the UI with fake data (start now, no backend needed)

Naksh is building `GET /api/events`. Until that's ready, hard-code a few events in an array so you're not blocked.

- [x] An `EventCard` component in `client/src/components/` showing title, club name, date and time, location, and price ("Free" when it's 0)
- [x] The feed on `HomePage.tsx`: a list of `EventCard`s
- [x] Category filter chips using `EVENT_CATEGORIES` from `@orbit/shared`
- [x] A search box (copy the one in `ClubsPage.tsx`)
- [x] Check it on a phone-sized screen (DevTools → device toolbar). Mobile is the priority.

Mock mode: `VITE_USE_MOCK_EVENTS=true npm run dev:client`. This uses a typed array
in `client/src/data/mockEvents.ts` and makes no event API requests. Mobile checks
used headless Chrome at 320, 375, and 390 pixels wide; desktop checks used 768 and 1440.

## 2. Connect it to the real API

- [x] Once `GET /api/events` exists, swap the fake data for `apiGet(...)`, the way `ClubsPage` does it
- [x] Pass the search text and selected category as query params
- [x] Handle loading, error, and "no events found" states

Live API mode is the default. It uses Naksh's types and endpoints, not a second
backend implementation. Naksh's API is now merged into `main`, and this feature
branch is based on the updated main commit `fbaf86e`.

## 3. Event detail page

- [x] Route `/events/:id` (use `useParams()`), calling `GET /api/events/:id`
- [x] Show everything: description, eligibility, price, location, and a **Register** button linking to `registrationUrl`
- [x] Make each `EventCard` link to its detail page
- [x] Leave space for Rokyo's "Interested / Going" buttons

## 4. Demo data (uses your data skills)

- [x] Extend `server/src/db/seed.ts` with 20–40 realistic Western events across all categories, dates spread over the next few weeks, a mix of free and paid
- [x] More clubs, so the Clubs tab looks full too

The seed contains 24 upcoming fictional events (four per category), two past/cancelled
test fixtures, and nine clubs. Stable IDs prevent repeated runs from duplicating
the new demo rows. Existing unrelated rows are not deleted.

## 5. Stretch goals

- [ ] Club detail page (`/clubs/:slug`) listing that club's events
- [ ] "Recommended for you" based on a student's interests. This is where your AI/ML background shines, and it's in the README's Future Improvements.

## Tips

- Before writing code, sketch the screen on paper and split it into components.
- When you copy a pattern from `ClubsPage.tsx`, make sure you understand _why_ each piece is there, especially `useEffect` and the `ignore` flag.
