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
