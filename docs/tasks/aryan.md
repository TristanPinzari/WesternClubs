<!--
  WHAT: Aryan's task list, in priority order. Tick boxes off as you go.
  WITHOUT IT: It would be unclear what to work on next, and in what order.
-->

# Aryan: Event Discovery (Frontend)

You own what students see first: the event feed, search and filters, and the event detail page. You also own the demo data, so the app looks alive during the demo.

**Updated November 18, 2026 against main `26997ef`.** See
[the implementation walkthrough and PR steps](aryan-implementation.md) for the
audit, real integration tests, review fixes, and outstanding RSVP dependencies.
The Nov 16 tasks below supersede the original stretch-goal priorities.

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
branch now includes updated main commit `26997ef` (merged into the feature branch,
not the other way around).

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

- [x] Club detail page (`/clubs/:slug`) listing that club's events (now required; see B)
- [ ] "Recommended for you" based on a student's interests. This is where your AI/ML background shines, and it's in the README's Future Improvements.

The old recommendation stretch goal is superseded by G, not a separate remaining task.

## Tips

- Before writing code, sketch the screen on paper and split it into components.
- When you copy a pattern from `ClubsPage.tsx`, make sure you understand _why_ each piece is there, especially `useEffect` and the `ignore` flag.

---

## New tasks (added Nov 16)

Your event discovery work is done. Nothing changes there. Next, you own the **club exec side** of Orbit, which is the core of our pitch ("club execs post events, students find them"), plus the **"For you" feed**, which replaces the "Recommended for you" stretch goal.

Do these in order. Anything that depends on Naksh's backend can start with fake data, like you did for the feed.

### A. Finish PR #18

- [x] The review changes: debounce the search, keep old results while loading, show the real seed error, and fix the broken link (local changes; include the walkthrough file when committing)
- [x] Reserve scrollbar space with `html { scrollbar-gutter: stable; }`

Not pushed or re-requested for review yet. The online PR only changes after a
feature-branch commit and push; do not push to main.

### B. Club detail page `/clubs/:slug` (was a stretch goal, now required)

- [x] Club info and logo, plus its upcoming events (`GET /api/events?clubId=...`)
- [x] Link each club on the Clubs page to it
- [x] A **Follow** button, once Naksh's follow endpoint lands
- [x] For that club's execs only: **Post event** and **Settings** buttons. Use `GET /api/me/clubs` to know the user's role. Hiding the buttons is just UX; the server enforces the real permissions.

Verified with real signed-in users and Naksh's merged endpoints. Editor/admin/owner
controls match their roles; direct unauthorized API writes return 403.

### C. Create a club

- [x] A `/clubs/new` page with a form calling `POST /api/clubs`, which redirects to the new club's page
- [x] A link to it, e.g. on the Clubs page

Verified real creation and redirect. POST sends name/description, then PATCH saves
logo/links. A partial save redirects with a warning instead of inviting duplicate creation.

### D. Event forms [needs Naksh's task B]

- [x] Post an event: title, category, date and time, location, price, description, eligibility, registration link, image
- [x] Edit an event, and cancel it (with an "Are you sure?" confirmation)

Verified real post/edit/cancel, persisted detail refresh, integer prices, date
validation, registration fields, and an actual uploaded event image.

### E. Image upload component [needs Naksh's task C]

- [x] A reusable `ImageUpload` component: ask `POST /api/uploads` for a URL, `PUT` the file to it, then hand back `key` and `publicUrl`. **Rokyo will reuse it for profile pictures**, so keep it generic.
- [x] Use it for club logos and event images

Uploads use shared types/limits and send the required file size. Real club-logo
and event-image uploads passed, including browser PUT/CORS and public image loading.
Intercepted tests also cover failure/retry. Temporary uploaded test images were removed.

### F. Club settings page [needs Naksh's task D]

- [x] Edit name, description, links, and logo. Renaming doesn't change the URL.
- [x] Manage execs: list them with roles, add by email, change role, remove, and **transfer ownership** (with a strong confirmation)
- [x] A "My clubs" page (`GET /api/me/clubs`) so execs can find their clubs

Verified real settings, stable renamed URLs, adding/promoting/removing execs,
ownership transfer, and My clubs. Public exec responses do not expose emails.
Club links use the shared supported kinds, not arbitrary labels.

### G. "For you" feed (uses your data skills)

- [ ] Backend: `GET /api/feed`. Read the ranking rules in `docs/API.md` first. It's one SQL query with a score. **Privacy:** only count RSVPs where `showOnAttendeeList = true`.
- [x] Frontend: "For you" and "All events" tabs on the home page (signed-out visitors only get "All events"), and show the `reason` on each card ("From a club you follow")
- [ ] This needs Naksh's follows and profiles plus Rokyo's RSVP table. Build the query as each piece lands.

- [x] Incremental real `/api/feed`: followed clubs, profile interests, other events,
      stable pagination, correct totals, auth/input errors, and frontend integration.
- [ ] Add the followed-person/public-RSVP ranking group once Rokyo's table merges.

The SQL endpoint uses the tables already merged into main. The full task above
stays unchecked: it intentionally does not query RSVPs yet. User choice on Nov 18:
stay on merged main; do not import Rokyo's unmerged RSVP PR #20.

### H. Demo data for the social features

- [ ] Demo student accounts that follow clubs and each other, plus some public RSVPs, so the feed and attendee lists aren't empty in the demo. Create users through Better Auth (`auth.api.signUpEmail`) so their passwords are hashed properly.

The follows/profile tables are now merged, but the full social seed (including
public RSVPs) still awaits the RSVP table. No persistent social seed was run.
Temporary Better Auth test accounts were cleaned up and do not satisfy this task.

### Later polish

- [ ] Keep search, category, and page in the URL (`useSearchParams`) so they survive going back from an event

---

## Final tasks (added Nov 18): do these in order

Rokyo's RSVP table and profile privacy are merged, so the feed can be finished. **Task H (demo accounts) has moved to Naksh**, so you can focus on the feed.

### 1. Feed rule 2: "People you follow are going"

- [ ] In `server/src/queries/feed.ts`, add a score-2 group between followed clubs (3) and interests (1): the event has an RSVP from someone the user follows (`user_follow.follower_id` = the user, `followee_id` = the RSVP's `user_id`).
- [ ] **Privacy, both rules:**
  - Only count RSVPs with `show_on_attendee_list = true`, so anonymous RSVPs are never revealed.
  - Only count people whose profile is public. Left-join `profile` and allow `is_public IS NULL OR is_public = true`, the same rule as `routes/rsvps.ts`.
- [ ] Return `reason: "followed_user"`, and show "People you follow are going" on the card. **Never** say _which_ people.
- [ ] Update the feed row in `docs/API.md` to ✅, and remove the "waits for Rokyo's RSVP table" note.
- [ ] Test with two accounts: A follows B, B RSVPs publicly, so the event moves up A's feed. Then B switches to anonymous, or makes their profile private, and the event drops back down.

### 2. Keep filters in the URL (was "Later polish")

- [ ] Search, category, page, and the For you / All tab in the URL (`useSearchParams`), so going back from an event keeps your place, and filtered feeds can be shared.

### 3. Demo prep

- [ ] With Tristan: plan the part of the demo that shows the feed. Which account to sign in as, and which events should appear first, and why.

The "Recommended for you" stretch goal in section 5 is covered by the feed, so there's nothing separate to build.
