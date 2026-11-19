<!--
  WHAT: Rokyo's task list, in priority order. Tick boxes off as you go.
  WITHOUT IT: It would be unclear what to work on next, and in what order.
-->

# Rokyo: RSVPs & the Personal Dashboard (Full Stack)

You'll build one complete feature through every layer: the database table, the API endpoint, and the page. By the end you'll understand how a button click in the browser turns into a row in the database and back.

**Read first, in this order.** Follow the clubs example top to bottom:

1. [`server/src/db/schema.ts`](../../server/src/db/schema.ts): how a table is defined (`club`)
2. [`server/src/routes/clubs.ts`](../../server/src/routes/clubs.ts): how the API reads that table
3. [`client/src/pages/ClubsPage.tsx`](../../client/src/pages/ClubsPage.tsx): how the page calls the API and shows the result

## The one rule

**You must be able to explain every line you commit.** Using AI to write code is fine, but before you commit, read it and be ready to walk Tristan through it. If you can't explain a line, ask the AI "explain this line by line" until you can.

## 0. Warm-up (no dependencies)

- [ ] Get the app running locally (README → Getting Started)
- [ ] Open `npm run db:studio` and find the clubs in the database
- [ ] Visit http://localhost:3000/api/clubs in your browser. That's the raw data the Clubs page uses.
- [ ] Make a small change to `ClubsPage.tsx` (e.g. show the club's slug) and watch it update

## 1. Sign up and sign in pages

- [x] `/sign-up` and `/sign-in` pages using `authClient` (examples in `client/src/lib/auth-client.ts`)
- [x] Show the signed-in user's name in the header, with a sign-out button
- [ ] Look in `db:studio`: where did your new user go? (the `user` table)

## 2. The RSVP table (wait until Naksh has added the `event` table)

- [x] Add `event_rsvp` and `saved_event` to `schema.ts` using the design notes in that file, then run `npm run db:push` _(`event_rsvp` done; `saved_event` skipped because Save isn't planned)_
- [ ] Ask yourself: why is the primary key `(eventId, userId)`? What would go wrong without it?

## 3. The RSVP API

- [x] Create `server/src/routes/rsvps.ts`
- [x] `PUT /api/events/:id/rsvp` and `DELETE /api/events/:id/rsvp`. Both need `requireAuth`.
- [ ] `PUT` / `DELETE /api/events/:id/save`
- [x] You'll need an `apiPut` / `apiDelete` helper in `client/src/lib/api.ts` (see the TODO there)

## 4. The buttons

- [ ] "Interested", "Going", and "Save" buttons on Aryan's event detail page (coordinate with Aryan)
- [x] Ask whether to show you on the attendee list (`showOnAttendeeList`) and why you're going (`purpose`)

## 5. The dashboard

- [x] `GET /api/me/events`: my RSVPs and saved events, upcoming first
- [x] A `/me` page listing them, grouped into Going / Interested / Saved

## 6. Stretch goals

- [x] `GET /api/events/:id/attendees` and an attendee list on the event page. Never show people who RSVP'd anonymously!

## Tips

- When something breaks, check three places: the browser console, the Network tab in DevTools (what did the API return?), and the terminal running the server.
- Ask questions early. Being stuck for 30 minutes means it's time to ask.

---

## New tasks (added Nov 16)

Your sections 0–5 still stand, with these changes:

- **RSVPs are visible by default, with an option to RSVP anonymously.** In section 4, put a toggle labelled **"Show me on the attendee list"** right inside the RSVP step, switched **on** by default, so students see it every time and can turn it off. When you build the `event_rsvp` table, make `showOnAttendeeList` default to **true** (the design note in `schema.ts` says so).
- **The attendee list (section 6) is now required, not a stretch goal.** Build it **before** the dashboard (section 5). "See who else is going" is a big part of our pitch.
- **Save is now low priority.** "Interested" already covers it. Build Save last, or skip it if time runs out.

Then, after sections 0–6:

### A. Profile pages [needs Naksh's task F]

- [x] `/me/profile`: an edit form for program, year, bio, links, public/private, and **interests**. Show interests as clickable chips from `EVENT_CATEGORIES` (a fixed list, so the "For you" feed can match them).
- [ ] **Profile picture:** reuse Aryan's `ImageUpload` component, then save the `publicUrl` with `authClient.updateUser({ image })`
- [x] `/profile/:userId`: someone's public profile, with a **Follow** button
- [x] Make names on the attendee list link to profiles
- [x] Show the user's picture in the header menu

### B. Following people [needs Naksh's task E]

- [x] The Follow / Unfollow button on profiles (`PUT` / `DELETE /api/users/:userId/follow`)
- [ ] A "Following" page (`GET /api/me/following`) listing the clubs and people I follow
- [x] **Don't show follower counts or follower lists anywhere.** That's a team decision.

### C. Onboarding [needs profiles and club follows]

- [ ] Right after sign-up: one screen to **pick your interests** and **follow a few clubs**, then go to the feed. Without it, a brand-new user's "For you" feed would be empty.

Until Naksh's endpoints land, you can build these pages with fake data, the way Aryan did for the event feed.

---

## Final tasks (added Nov 18): do these in order

All the backend you need is merged, so nothing here waits on anyone else.

### 1. ⭐ Mount the RSVP panel (do this first: the demo depends on it)

Right now nobody can RSVP in the app: `EventAttendance` exists, but the event page still shows a placeholder.

- [ ] In `client/src/pages/EventDetailPage.tsx`, replace the `TODO(Rokyo)` placeholder (around line 197) with:
  ```tsx
  <EventAttendance key={event.id} eventId={event.id} closed={...} />
  ```
  - `key={event.id}` makes React start fresh when you go from one event to another, so the old event's form never carries over.
  - `closed` should be true if the event is cancelled or has already ended.
- [ ] Test it: RSVP Going, switch to Interested, RSVP anonymously from a second account, and check the attendee list and counts update.

### 2. Onboarding after sign-up

- [x] A `/welcome` page: pick interests (the same chips as the profile page; save with `PUT /api/me/profile` sending just `{ interests }`), then follow a few clubs (list from `GET /api/clubs`, Follow buttons like the club page's), then a "Done" button that goes to `/`.
- [x] Send new users there from `SignUpPage.tsx` (the `TODO(Rokyo)` there) instead of `/`.
- [ ] Without this, a brand-new user's "For you" feed is empty during the demo.

### 3. Profile picture upload

- [x] On `/me/profile`, replace the "coming soon" text (the `TODO(Rokyo)` on the edit page) with Aryan's `ImageUpload` component, using the `users` folder.
- [x] After it uploads, save the picture with `authClient.updateUser({ image: publicUrl })`. The header and profile already show `user.image`.

### 4. "Following" page

- [x] `/me/following`: the clubs and people you follow (`GET /api/me/following`), each linking to its page, with an Unfollow button. Link to it from the header menu or `/me`.

### 5. Clean-ups

- [x] `lib/profiles.ts`: use `categoryLabels` from `lib/eventDisplay.ts` instead of `interestLabels` (the `TODO(Rokyo)` there)
- [x] `MyEventsPage.tsx`: use `formatEventDate` / `formatEventTime` from `lib/eventDisplay.ts` (the `TODO(Rokyo)` there)

### Not planned

- **Save** (bookmarks) is on hold. "Interested" covers it for the demo, so skip the Save items above unless Tristan says otherwise.
