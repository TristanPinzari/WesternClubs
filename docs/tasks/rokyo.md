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

- [ ] `/sign-up` and `/sign-in` pages using `authClient` (examples in `client/src/lib/auth-client.ts`)
- [ ] Show the signed-in user's name in the header, with a sign-out button
- [ ] Look in `db:studio`: where did your new user go? (the `user` table)

## 2. The RSVP table (wait until Naksh has added the `event` table)

- [ ] Add `event_rsvp` and `saved_event` to `schema.ts` using the design notes in that file, then run `npm run db:push`
- [ ] Ask yourself: why is the primary key `(eventId, userId)`? What would go wrong without it?

## 3. The RSVP API

- [ ] Create `server/src/routes/rsvps.ts`
- [ ] `PUT /api/events/:id/rsvp` and `DELETE /api/events/:id/rsvp`. Both need `requireAuth`.
- [ ] `PUT` / `DELETE /api/events/:id/save`
- [ ] You'll need an `apiPut` / `apiDelete` helper in `client/src/lib/api.ts` (see the TODO there)

## 4. The buttons

- [ ] "Interested", "Going", and "Save" buttons on Aryan's event detail page (coordinate with Aryan)
- [ ] Ask whether to show you on the attendee list (`showOnAttendeeList`) and why you're going (`purpose`)

## 5. The dashboard

- [ ] `GET /api/me/events`: my RSVPs and saved events, upcoming first
- [ ] A `/me` page listing them, grouped into Going / Interested / Saved

## 6. Stretch goals

- [ ] `GET /api/events/:id/attendees` and an attendee list on the event page. Only show people who opted in!

## Tips

- When something breaks, check three places: the browser console, the Network tab in DevTools (what did the API return?), and the terminal running the server.
- Ask questions early. Being stuck for 30 minutes means it's time to ask.
