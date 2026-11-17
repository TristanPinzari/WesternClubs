<!--
  WHAT: Tristan's checklist: team setup, coordination, and pre-demo deployment.
  WITHOUT IT: Setup and deployment steps would be easy to forget, especially right before the demo.
-->

# Tristan: Lead, Mentor & Coordinator

## Setup (before the team starts)

- [ ] Commit and push the skeleton
- [ ] Invite everyone to the GitHub repo
- [ ] Invite everyone to the Neon project, and have each person create their own branch
- [ ] Privately send the `orbit-server` AWS key to whoever needs uploads (Naksh)
- [ ] Walk everyone through README → Getting Started until the Clubs tab works on their machine

## Order of work (dependencies)

- Naksh's `event` table and `GET /api/events` **unblock** Aryan (real data) and Rokyo (RSVP table). Make sure this lands first.
- Aryan starts with fake data and Rokyo starts with the sign-in pages, so nobody waits on day one.
- Rokyo's RSVP buttons go on Aryan's event detail page, so they'll need to coordinate.

## Ongoing

- [ ] Review PRs. Ask Rokyo to walk through the code line by line, and ask Naksh how each endpoint could be abused.
- [ ] Keep `docs/API.md` status checkmarks up to date as endpoints land
- [ ] Unblock people. Check in with each person daily.

## Before the demo

- [ ] Create a Vercel project (root directory `client`) and a Railway service (start command `npm run start -w server`)
- [ ] Put the Railway URL in `client/vercel.json`, and set Railway's env vars (`APP_URL` = the Vercel URL)
- [ ] Add the Vercel URL to the S3 bucket's CORS rule
- [ ] Seed the production database with Aryan's demo data
- [ ] Do a full dry run of the demo on a phone

---

## New tasks (added Nov 16)

### Plan changes to announce to the team

- Following (clubs **and** people, one-way) replaces connections. No follower counts or follower lists.
- RSVPs appear on the attendee list by default, with an option to RSVP anonymously. The attendee list is now required.
- Profile pictures for clubs and users, so uploads are now required.
- A "For you" feed and an onboarding step.
- New owners: Aryan has the club exec pages and the feed, Rokyo has profiles and onboarding, and Naksh has the backend for all of it.

### New dependency order

- Naksh **B** (event writes) → Aryan **D** (event forms)
- Naksh **C** (uploads) → Aryan **E** (`ImageUpload`) → Rokyo **A** (profile pictures)
- Naksh **D** (club edit, `/me/clubs`) → Aryan **B** and **F** (exec buttons, settings)
- Naksh **E** and **F** (follows, profiles) → Rokyo **A**–**C** and Aryan **G** (feed)
- Rokyo's RSVP table → Aryan **G** (feed rule 2) and **H** (demo data)

Watch Naksh's queue the most. Everyone's new work depends on it, so review Naksh's PRs first.

### If time runs short, cut from the bottom

1. Club exec pages + posting events (the pitch depends on these)
2. RSVPs + the attendee list
3. Follow clubs + the "For you" feed (follow-club rule only)
4. Profiles, following people, onboarding
5. Profile pictures and uploads
6. Save

### The pitch

- [ ] Slides, the demo script, and who presents
- [ ] The demo story: an exec creates a club and posts an event, then a student finds it in "For you", RSVPs, and sees who's going
- [ ] With Aryan: demo accounts (one exec, a few students) so the social parts aren't empty
