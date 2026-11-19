<!--
  WHAT: Aryan's task list, in priority order. Tick boxes off as you go.
  WITHOUT IT: It would be unclear what to work on next, and in what order.
-->

# Aryan: Event Discovery (Frontend)

You own what students see first: the event feed, search and filters, and the event detail page, plus the club exec UI and demo event listings. **Social demo accounts (Task H) belong to Naksh.**

**Updated November 19, 2026:** latest `origin/main` `3f62f04` is merged locally
into the feature branch at `9deb823`. The RSVP, profile, block, and settings
dependencies are merged. Typecheck, production build, 24 isolated SQL/unit tests,
and intercepted-API Chrome regression checks pass. The
[older implementation walkthrough](aryan-implementation.md) records earlier work;
its dependency and Git instructions are historical, not the current task plan.

**Remaining:** rehearse with the existing presentation accounts and review the
[prepared feed demo plan](aryan-feed-demo.md) with Tristan. The plan has not yet
been reviewed or rehearsed with him; no coordination is recorded as completed.

**Read first:** [`client/src/pages/ClubsPage.tsx`](../../client/src/pages/ClubsPage.tsx), [`client/src/App.tsx`](../../client/src/App.tsx), [`client/src/lib/api.ts`](../../client/src/lib/api.ts)

**Useful docs:** [React](https://react.dev/learn) (start with "Thinking in React") · [Tailwind](https://tailwindcss.com/docs) · [React Router](https://reactrouter.com/start/declarative/routing)

## 1. Build the UI with fake data (start now, no backend needed)

This initial mock-first stage is complete; Naksh's event API is merged.

- [x] An `EventCard` component in `client/src/components/` showing title, club name, date and time, location, and price ("Free" when it's 0)
- [x] The feed on `HomePage.tsx`: a list of `EventCard`s
- [x] Category filter chips using `EVENT_CATEGORIES` from `@orbit/shared`
- [x] A search box (copy the one in `ClubsPage.tsx`)
- [x] Check it on a phone-sized screen (DevTools → device toolbar). Mobile is the priority.

Mock mode: `VITE_USE_MOCK_EVENTS=true npm run dev:client`. This uses a typed array
in [mockEvents.ts](../../client/src/data/mockEvents.ts) and makes no event API requests.
Use live mode for the social feed demo.

## 2. Connect it to the real API

- [x] Once `GET /api/events` exists, swap the fake data for `apiGet(...)`, the way `ClubsPage` does it
- [x] Pass the search text and selected category as query params
- [x] Handle loading, error, and "no events found" states

Live API mode is the default and uses Naksh's merged types and endpoints. The
feature branch includes main `3f62f04` through local merge `9deb823`.

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
- [x] "Recommended for you" based on a student's interests: covered by the implemented For you feed in G.

The old recommendation stretch goal is superseded by G, not a separate remaining task.

## Tips

- Before writing code, sketch the screen on paper and split it into components.
- When you copy a pattern from `ClubsPage.tsx`, make sure you understand _why_ each piece is there, especially `useEffect` and the `ignore` flag.

---

## New tasks (added Nov 16)

Your event discovery work is done. Nothing changes there. Next, you own the **club exec side** of Orbit, which is the core of our pitch ("club execs post events, students find them"), plus the **"For you" feed**, which replaces the "Recommended for you" stretch goal.

These implementation tasks now use the merged backend. Current remaining work is
listed in the final tasks below.

### A. Finish PR #18

- [x] The review changes: debounce the search, keep old results while loading, show the real seed error, and fix the broken link (local changes; include the walkthrough file when committing)
- [x] Reserve scrollbar space with `html { scrollbar-gutter: stable; }`

These changes remain local to the feature branch; nothing was pushed to main.

### B. Club detail page `/clubs/:slug` (was a stretch goal, now required)

- [x] Club info and logo, plus its upcoming events (`GET /api/events?clubId=...`)
- [x] Link each club on the Clubs page to it
- [x] A **Follow** button, once Naksh's follow endpoint lands
- [x] For that club's execs only: **Post event** and **Settings** buttons. Use `GET /api/me/clubs` to know the user's role. Hiding the buttons is just UX; the server enforces the real permissions.

Editor/admin/owner controls use the merged role endpoints; server middleware
enforces write permissions independently of visible buttons.

### C. Create a club

- [x] A `/clubs/new` page with a form calling `POST /api/clubs`, which redirects to the new club's page
- [x] A link to it, e.g. on the Clubs page

POST sends name/description, then PATCH saves
logo/links. A partial save redirects with a warning instead of inviting duplicate creation.

### D. Event forms (Naksh's task B merged)

- [x] Post an event: title, category, date and time, location, price, description, eligibility, registration link, image
- [x] Edit an event, and cancel it (with an "Are you sure?" confirmation)

Forms include post/edit/cancel, integer prices, date validation, registration
fields, and event image uploads.

### E. Image upload component (Naksh's task C merged)

- [x] A reusable `ImageUpload` component: ask `POST /api/uploads` for a URL, `PUT` the file to it, then hand back `key` and `publicUrl`. **Rokyo will reuse it for profile pictures**, so keep it generic.
- [x] Use it for club logos and event images

Uploads use shared types/limits and send the required file size.

### F. Club settings page (Naksh's task D and settings fix merged)

- [x] Edit name, description, links, and logo. Renaming doesn't change the URL.
- [x] Manage execs: list them with roles, add by email, change role, remove, and **transfer ownership** (with a strong confirmation)
- [x] A "My clubs" page (`GET /api/me/clubs`) so execs can find their clubs

The settings-preservation fix is merged and browser-tested after saves and
ownership transfers, including unsaved fields, messages, and updated permissions.
The form and exec list now have distinct stable keys. Public exec responses omit
emails. Club links use the shared supported kinds.

### G. "For you" feed (uses your data skills)

- [x] Backend: `GET /api/feed`, using all four ranking groups in [the API contract](../API.md). One parameterized SQL query returns the page and total.
- [x] Frontend: "For you" and "All events" tabs on the home page (signed-out visitors only get "All events"), and show the `reason` on each card ("From a club you follow")
- [x] Followed clubs (3), public RSVPs by followed people (2), profile interests (1), and other events (0), with stable pagination and totals.

The follows, profiles, RSVPs, and silent blocks are all merged. Score 2 includes
both `interested` and `going`, requires `show_on_attendee_list = true`, left-joins
profiles allowing `is_public IS NULL OR is_public = true`, and excludes anyone
who blocked the viewer. Cards use exactly "People you follow are going", without
identities. Production SQL tests verify each signal and privacy transition against
the actual schema in isolated PostgreSQL, including stale follows and missing profiles.

### H. Demo data for the social features — moved to Naksh

Naksh owns Task H; it is not an outstanding Aryan implementation task. His
[demo account seed](../../server/src/db/seedDemoUsers.ts) is merged, with one exec,
five students, profiles, follows, public RSVPs, an anonymous RSVP, and a private
profile. See [Naksh's task list](naksh.md). Aryan's demo plan uses those existing
accounts and [demo event definitions](../../server/src/db/demoData.ts); no new
accounts or seed execution are part of this documentation update. Availability
and current state in the presentation environment still need verification.

### Later polish

- [x] Keep `q`, `category`, one-based `page`, and `tab=all|for-you` in the URL with `useSearchParams`; preserve the originating query in the detail page's Back to events link. Automated browser regressions pass; live rehearsal remains pending.

---

## Final tasks (added Nov 18): do these in order

The feed and URL implementation is complete against merged main. **Task H (demo
accounts) belongs to Naksh.** Outstanding work below is live rehearsal and review.

### 1. Feed rule 2: "People you follow are going"

- [x] Add score 2 in [feed.ts](../../server/src/queries/feed.ts) for public `interested` and `going` RSVPs by followed users, between clubs (3) and interests (1).
- [x] Require public RSVP visibility, allow a missing/public profile via LEFT JOIN, and exclude the RSVP user when they blocked the viewer.
- [x] Return `reason: "followed_user"`, and show exactly "People you follow are going". Never include attendee identities in the feed.
- [x] Mark the feed complete in [API.md](../API.md) and remove the obsolete RSVP dependency.
- [ ] Verify with two existing accounts: following and public RSVPs promote events; anonymity, profile privacy, and a block by the followed person remove their contribution. Confirm both RSVP statuses and the generic label.
- [x] Isolated production SQL checks: two-account public/anonymous/private/blocked transitions, missing profiles, stale follows, highest-score precedence, duplicate prevention, pagination/totals, parameterized identity. Shared query validation tests also pass. These do not claim a hosted auth/API test run.

### 2. Keep filters in the URL (was "Later polish")

- [x] Store search (`q`), `category`, one-based `page`, and `tab=all|for-you` using `useSearchParams`; carry the query to the detail back link.
- [x] Browser regressions verify direct links, refresh, Back/Forward, detail return links, page resets, invalid/out-of-range pages, delayed sessions and sign-out, debounce/race handling, and 320/375/768/1440px layouts with intercepted APIs. See [the runbook](aryan-feed-demo.md).

### 3. Demo prep

- [x] Prepare [the feed demo runbook](aryan-feed-demo.md) for Tristan's review: existing logins, exact ordered seed groups, two-account privacy steps, and URL checks.
- [ ] Tristan reviews the plan and the team rehearses it in the presentation environment. This has not been coordinated or completed by this documentation update.

**Privacy demo gotchas:** club or interest ranking can mask a drop; use the
runbook's Jordan/Alex event instead. Going private removes followers, so returning
public requires Jordan to follow Alex again. Unblocking also does not restore a
follow. Automated checks passed; hosted two-account rehearsal and Tristan's review
remain pending. No seed was run and no `.env` file was edited.

The "Recommended for you" stretch goal in section 5 is covered by the feed, so there's nothing separate to build.
