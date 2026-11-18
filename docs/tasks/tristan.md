<!--
  WHAT: Tristan's checklist: team setup, coordination, and pre-demo deployment.
  WITHOUT IT: Setup and deployment steps would be easy to forget, especially right before the demo.
-->

# Tristan: Lead, Mentor & Coordinator

## Setup (before the team starts)

- [x] Commit and push the skeleton
- [x] Invite everyone to the GitHub repo
- [x] Invite everyone to the Neon project, and have each person create their own branch
- [x] Privately send the `orbit-server` AWS key to whoever needs uploads (Naksh)
- [x] Walk everyone through README → Getting Started until the Clubs tab works on their machine

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
- [ ] With Aryan: demo accounts (one exec, a few students) so the social parts aren't empty _(moved to Naksh on Nov 18)_

---

## Final tasks (added Nov 18)

All PRs through #22 are merged. What's left, in priority order across the team:

| #   | Task                                                     | Owner              | Why it matters                                      |
| --- | -------------------------------------------------------- | ------------------ | --------------------------------------------------- |
| 1   | Mount the RSVP panel on the event page                   | Rokyo              | **Blocks the demo:** nobody can RSVP in the app yet |
| 2   | Demo accounts and social data                            | Naksh              | The feed and attendee lists are empty without it    |
| 3   | Deploy (below)                                           | Tristan + Naksh    | The demo runs on the real site                      |
| 4   | Feed rule 2: "People you follow are going"               | Aryan              | The headline social feature of the feed             |
| 5   | Onboarding after sign-up                                 | Rokyo              | A new user's feed is empty without it               |
| 6   | Profile pictures, the Following page, filters in the URL | Rokyo, Aryan       | Polish                                              |
| —   | Pitch prep                                               | Tristan + everyone | In parallel the whole time                          |

If time runs short, cut from the bottom.

### Deploy

- [ ] **Railway (backend):** a service from the repo root, start command `npm run start -w server`. Copy the env vars from `server/.env`, but use a **new** `BETTER_AUTH_SECRET`, production's `DATABASE_URL` (Neon's `main` branch), and `APP_URL` = the Vercel URL.
- [ ] **Vercel (frontend):** root directory `client`. Replace `REPLACE-WITH-RAILWAY-URL` in `client/vercel.json` with the Railway URL, then redeploy.
- [ ] **S3:** add the Vercel URL to the bucket's CORS `AllowedOrigins`, or image uploads fail in production.
- [ ] **Production database:** `npm run db:push`, `npm run db:seed`, then Naksh's demo seed, all with production's `DATABASE_URL`.
- [ ] **Smoke test** on a phone: sign up, create a club, post an event, upload an image, RSVP, check the attendee list and "For you".

### Decisions to make

- [ ] **Save (bookmarks):** never built. Recommendation: drop it officially (remove it from `docs/API.md` and the README), since "Interested" covers it.

### Before presenting

- [ ] Full dry run of the demo on the deployed site, on a phone
- [ ] Have the demo logins written down (from Naksh's seed)
- [ ] Have a backup plan if the venue Wi-Fi fails, e.g. a screen recording of the demo
