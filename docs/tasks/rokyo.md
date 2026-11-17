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

- [ ] Add `event_rsvp` and `saved_event` to `schema.ts` using the design notes in that file, then run `npm run db:push`
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

- [ ] `GET /api/me/events`: my RSVPs and saved events, upcoming first
- [ ] A `/me` page listing them, grouped into Going / Interested / Saved

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

- [ ] `/me/profile`: an edit form for program, year, bio, links, public/private, and **interests**. Show interests as clickable chips from `EVENT_CATEGORIES` (a fixed list, so the "For you" feed can match them).
- [ ] **Profile picture:** reuse Aryan's `ImageUpload` component, then save the `publicUrl` with `authClient.updateUser({ image })`
- [ ] `/profile/:userId`: someone's public profile, with a **Follow** button
- [ ] Make names on the attendee list link to profiles
- [ ] Show the user's picture in the header menu

### B. Following people [needs Naksh's task E]

- [ ] The Follow / Unfollow button on profiles (`PUT` / `DELETE /api/users/:userId/follow`)
- [ ] A "Following" page (`GET /api/me/following`) listing the clubs and people I follow
- [ ] **Don't show follower counts or follower lists anywhere.** That's a team decision.

### C. Onboarding [needs profiles and club follows]

- [ ] Right after sign-up: one screen to **pick your interests** and **follow a few clubs**, then go to the feed. Without it, a brand-new user's "For you" feed would be empty.

Until Naksh's endpoints land, you can build these pages with fake data, the way Aryan did for the event feed.
