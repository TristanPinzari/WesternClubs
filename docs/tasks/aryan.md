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

---

## New tasks (added Nov 16)

Your event discovery work is done. Nothing changes there. Next, you own the **club exec side** of Orbit, which is the core of our pitch ("club execs post events, students find them"), plus the **"For you" feed**, which replaces the "Recommended for you" stretch goal.

Do these in order. Anything that depends on Naksh's backend can start with fake data, like you did for the feed.

### A. Finish PR #18

- [ ] The review changes: debounce the search, keep old results while loading, show the real seed error, and fix the broken link

### B. Club detail page `/clubs/:slug` (was a stretch goal, now required)

- [ ] Club info and logo, plus its upcoming events (`GET /api/events?clubId=...`)
- [ ] Link each club on the Clubs page to it
- [ ] A **Follow** button, once Naksh's follow endpoint lands
- [ ] For that club's execs only: **Post event** and **Settings** buttons. Use `GET /api/me/clubs` to know the user's role. Hiding the buttons is just UX; the server enforces the real permissions.

### C. Create a club

- [ ] A `/clubs/new` page with a form calling `POST /api/clubs`, which redirects to the new club's page
- [ ] A link to it, e.g. on the Clubs page

### D. Event forms [needs Naksh's task B]

- [ ] Post an event: title, category, date and time, location, price, description, eligibility, registration link, image
- [ ] Edit an event, and cancel it (with an "Are you sure?" confirmation)

### E. Image upload component [needs Naksh's task C]

- [ ] A reusable `ImageUpload` component: ask `POST /api/uploads` for a URL, `PUT` the file to it, then hand back `key` and `publicUrl`. **Rokyo will reuse it for profile pictures**, so keep it generic.
- [ ] Use it for club logos and event images

### F. Club settings page [needs Naksh's task D]

- [ ] Edit name, description, links, and logo. Renaming doesn't change the URL.
- [ ] Manage execs: list them with roles, add by email, change role, remove, and **transfer ownership** (with a strong confirmation)
- [ ] A "My clubs" page (`GET /api/me/clubs`) so execs can find their clubs

### G. "For you" feed (uses your data skills)

- [ ] Backend: `GET /api/feed`. Read the ranking rules in `docs/API.md` first. It's one SQL query with a score. **Privacy:** only count RSVPs where `showOnAttendeeList = true`.
- [ ] Frontend: "For you" and "All events" tabs on the home page (signed-out visitors only get "All events"), and show the `reason` on each card ("From a club you follow")
- [ ] This needs Naksh's follows and profiles plus Rokyo's RSVP table. Build the query as each piece lands.

### H. Demo data for the social features

- [ ] Demo student accounts that follow clubs and each other, plus some public RSVPs, so the feed and attendee lists aren't empty in the demo. Create users through Better Auth (`auth.api.signUpEmail`) so their passwords are hashed properly.

### Later polish

- [ ] Keep search, category, and page in the URL (`useSearchParams`) so they survive going back from an event
