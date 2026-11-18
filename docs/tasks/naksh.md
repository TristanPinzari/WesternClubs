<!--
  WHAT: Naksh's task list, in priority order. Tick boxes off as you go.
  WITHOUT IT: It would be unclear what to work on next, and in what order.
-->

# Naksh: Backend, Auth & Permissions

You own the database schema, the API, and the security of Orbit: who is allowed to do what.

**Read first:** [`server/src/db/schema.ts`](../../server/src/db/schema.ts), [`server/src/routes/clubs.ts`](../../server/src/routes/clubs.ts), [`server/src/middleware.ts`](../../server/src/middleware.ts), [`docs/API.md`](../API.md)

**Useful docs:** [Drizzle](https://orm.drizzle.team/docs/overview) · [Express 5](https://expressjs.com/en/guide/routing.html) · [Better Auth](https://www.better-auth.com/docs) · [Zod](https://zod.dev)

## 1. The `event` table and `GET /api/events` (do this first, because Aryan and Rokyo need it)

- [x] Add the `event` table to `schema.ts` using the design notes in that file, then run `npm run db:push`
- [x] Add `eventListQuerySchema` and an `EventSummary` type to `shared/src/index.ts`
- [x] Create `server/src/routes/events.ts` with `GET /api/events` and `GET /api/events/:id`, copying the pattern in `clubs.ts`
  - Only return upcoming, not-cancelled events, soonest first
  - Join with `club` so each event includes its club's name and slug
- [x] Mount the router in `server/src/index.ts`
- [x] Tell Aryan and Rokyo when it's merged

## 2. Restrict sign-up to `@uwo.ca`

- [x] Follow the TODO in `server/src/auth.ts`
- [x] Test it: signing up with a gmail address should fail, and a `@uwo.ca` address should work

## 3. Club creation and permissions (the core security work)

- [x] `POST /api/clubs`: the creator becomes the owner, inside a transaction
- [x] Write the `requireClubRole(...roles)` middleware (see the TODO in `middleware.ts`)
- [x] `POST /api/clubs/:clubId/events`: only owners, admins, and editors
- [x] Member management: add, change role, remove
- [x] Transfer ownership
- [x] Enforce **every** rule in the "Club permissions" section of `docs/API.md`

**Think like an attacker.** For each endpoint, ask: what happens if someone who isn't allowed calls it directly, without using our UI? Try it with curl or Postman. Can an editor promote themselves? Can someone edit another club's event by changing the `:clubId` in the URL?

## 4. Remaining tables

- [x] `profile`, `club_follow`, `connection`: designs are in `schema.ts` _(connection cancelled Nov 16; built `user_follow` instead)_
- [x] The `TODO(advanced)` items: the one-owner-per-club index, the duplicate-connection index, and the event indexes. Research these or ask your AI assistant to _explain_ them, not just write them. _(One owner: partial unique index. Duplicate connections: replaced by `user_follow`'s primary key. Event indexes: on `startsAt` and `clubId`.)_

## 5. Stretch goals

- [x] Image uploads (`server/src/s3.ts` TODO plus `POST /api/uploads`). Only allow image content types.
- [x] Profile and connection endpoints _(following instead of connections)_

## Tips

- Run `npm run db:studio` to look at your data in the browser.
- Everyone builds on your schema, so post in the group chat whenever you change a table.

---

## New tasks (added Nov 16)

The plan changed on Nov 16. Nothing you've already built is affected. What changed:

- **Connections are cancelled.** Students now **follow** each other one-way, like following a club, with no requests or approvals. Skip the `connection` table and the connection endpoints. Their replacement, `user_follow`, is below.
- **Uploads and profiles are no longer stretch goals.** Club logos, event images, and profile pictures all depend on them.
- **No follower counts or follower lists anywhere.** The API must never return them.

Do these in order. Each one unblocks a teammate, noted in brackets.

### A. Finish PR #17

- [x] Slug suffix (`western-ai-2`) instead of the 409, as requested in the review

### B. Creating and editing events [unblocks Aryan's event forms]

- [x] `createEventSchema` in `shared/src/index.ts` (use the `event` table columns)
- [x] `POST /api/clubs/:clubId/events`: owners, admins, editors (`requireClubRole`)
- [x] `PATCH /api/events/:id` and `POST /api/events/:id/cancel`. **Security:** look up the event's own `clubId` in the database and check the role in _that_ club. Never trust a `clubId` from the request body.

### C. Image uploads [unblocks Aryan's image upload component and Rokyo's profile pictures]

- [x] `presignUpload()` in `server/src/s3.ts` (the TODO there)
- [x] `POST /api/uploads`: `folder` is `clubs`, `events`, or `users`, and image content types only. Returns `{ key, uploadUrl, publicUrl }`.
- [x] TODO(advanced): a size limit. A presigned PUT can't limit file size; look up S3 _presigned POST_ with `content-length-range`, or accept the risk for the hackathon and note it. _(Done with the presigned PUT: the size is signed as `Content-Length`, so S3 rejects a bigger file.)_

### D. Editing and deleting clubs [unblocks Aryan's club settings page]

- [x] `PATCH /api/clubs/:clubId`: owner and admin. Name, description, `logoKey`, links. **Don't change the slug.** Check that `logoKey` starts with `clubs/`.
- [x] `DELETE /api/clubs/:clubId`: owner only
- [x] `GET /api/me/clubs`: clubs I'm an exec of, with my role. Aryan needs it to decide when to show the "Post event" and "Settings" buttons.
- [x] Then section 3's member management and ownership transfer, still as planned

### E. Following [unblocks Aryan's follow button and feed, and Rokyo's profiles]

- [x] `club_follow` table, plus `PUT` / `DELETE /api/clubs/:clubId/follow`
- [x] `user_follow` table (design in `schema.ts`), plus `PUT` / `DELETE /api/users/:userId/follow`. Return 400 if someone tries to follow themselves, and 404 if the profile isn't public.
- [x] `GET /api/me/following`: `{ clubs, users }`

### F. Profiles [unblocks Rokyo's profile pages]

- [x] `profile` table (design in `schema.ts`). Interests must be values from `EVENT_CATEGORIES`; validate with Zod.
- [x] `GET /api/profiles/:userId` (includes `isFollowing`) and `PUT /api/me/profile`
- [x] Profile pictures live in `user.image` as a full URL (see `docs/API.md`). Nothing to build for that beyond uploads.

**Think like an attacker, again:** can someone follow a private profile by calling the API directly? Can an editor change a club's logo through `PATCH`? Can someone set their club's `logoKey` to another club's image?

---

## Final tasks (added Nov 18): do these in order

All your planned backend work is done. These are new, and the demo needs the first two.

### 1. ⭐ Demo accounts and social data (moved over from Aryan's task H)

Without this, the feed and attendee lists are empty during the demo.

- [ ] A seed step (in `server/src/db/seed.ts`, or a separate `npm run db:seed:demo`) that creates:
  - **One club exec**, the owner of one of the demo clubs (a `club_member` row with role `owner`)
  - **4–5 students** with profiles and interests. Make at least one profile **private**, to show it stays off attendee lists.
  - **Follows:** students following clubs and each other
  - **RSVPs** on upcoming demo events, mostly public, plus at least one **anonymous**
- [ ] Create users through Better Auth (`auth.api.signUpEmail`) so passwords are hashed properly. Make it **safe to run twice**: skip accounts that already exist.
- [ ] Read the demo password from an env var (e.g. `DEMO_PASSWORD`). **Don't commit it.** These accounts will exist on the deployed site.
- [ ] Write the demo logins (emails only) in the README or the pitch notes, so whoever presents knows which account to use.

### 2. Help Tristan deploy

- [ ] The Railway service: start command `npm run start -w server`, and env vars copied from `server/.env`, with a **new** `BETTER_AUTH_SECRET` for production and `APP_URL` set to the Vercel URL.
- [ ] Production database: `npm run db:push`, then the seeds, run with production's `DATABASE_URL`.
- [ ] A smoke test on the deployed site: sign up, create a club, post an event, upload an image, RSVP.

### 3. Optional, if there's time

- [ ] **Non-Latin club names:** a name like "한국 학생회" gets a 400 because the slug comes out empty. Fall back to a random slug (e.g. `club-<short id>`).
- [ ] **Copied profile pictures:** put the user's id in upload keys (`users/<userId>/...`) and check it when saving `user.image`, so nobody can use someone else's picture.
