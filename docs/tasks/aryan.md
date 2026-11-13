<!--
  WHAT: Aryan's task list, in priority order. Tick boxes off as you go.
  WITHOUT IT: It would be unclear what to work on next, and in what order.
-->

# Aryan: Event Discovery (Frontend)

You own what students see first: the event feed, search and filters, and the event detail page. You also own the demo data, so the app looks alive during the demo.

**Read first:** [`client/src/pages/ClubsPage.tsx`](../../client/src/pages/ClubsPage.tsx), [`client/src/App.tsx`](../../client/src/App.tsx), [`client/src/lib/api.ts`](../../client/src/lib/api.ts)

**Useful docs:** [React](https://react.dev/learn) (start with "Thinking in React") · [Tailwind](https://tailwindcss.com/docs) · [React Router](https://reactrouter.com/start/declarative/routing)

## 1. Build the UI with fake data (start now, no backend needed)

Naksh is building `GET /api/events`. Until that's ready, hard-code a few events in an array so you're not blocked.

- [ ] An `EventCard` component in `client/src/components/` showing title, club name, date and time, location, and price ("Free" when it's 0)
- [ ] The feed on `HomePage.tsx`: a list of `EventCard`s
- [ ] Category filter chips using `EVENT_CATEGORIES` from `@orbit/shared`
- [ ] A search box (copy the one in `ClubsPage.tsx`)
- [ ] Check it on a phone-sized screen (DevTools → device toolbar). Mobile is the priority.

## 2. Connect it to the real API

- [ ] Once `GET /api/events` exists, swap the fake data for `apiGet(...)`, the way `ClubsPage` does it
- [ ] Pass the search text and selected category as query params
- [ ] Handle loading, error, and "no events found" states

## 3. Event detail page

- [ ] Route `/events/:id` (use `useParams()`), calling `GET /api/events/:id`
- [ ] Show everything: description, eligibility, price, location, and a **Register** button linking to `registrationUrl`
- [ ] Make each `EventCard` link to its detail page
- [ ] Leave space for Rokyo's "Interested / Going" buttons

## 4. Demo data (uses your data skills)

- [ ] Extend `server/src/db/seed.ts` with 20–40 realistic Western events across all categories, dates spread over the next few weeks, a mix of free and paid
- [ ] More clubs, so the Clubs tab looks full too

## 5. Stretch goals

- [ ] Club detail page (`/clubs/:slug`) listing that club's events
- [ ] "Recommended for you" based on a student's interests. This is where your AI/ML background shines, and it's in the README's Future Improvements.

## Tips

- Before writing code, sketch the screen on paper and split it into components.
- When you copy a pattern from `ClubsPage.tsx`, make sure you understand _why_ each piece is there, especially `useEffect` and the `ignore` flag.
