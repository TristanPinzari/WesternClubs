<!--
  WHAT: Naksh's task list, in priority order. Tick boxes off as you go.
  WITHOUT IT: It would be unclear what to work on next, and in what order.
-->

# Naksh: Backend, Auth & Permissions

You own the database schema, the API, and the security of Orbit: who is allowed to do what.

**Read first:** [`server/src/db/schema.ts`](../../server/src/db/schema.ts), [`server/src/routes/clubs.ts`](../../server/src/routes/clubs.ts), [`server/src/middleware.ts`](../../server/src/middleware.ts), [`docs/API.md`](../API.md)

**Useful docs:** [Drizzle](https://orm.drizzle.team/docs/overview) · [Express 5](https://expressjs.com/en/guide/routing.html) · [Better Auth](https://www.better-auth.com/docs) · [Zod](https://zod.dev)

## 1. The `event` table and `GET /api/events` (do this first, because Aryan and Rokyo need it)

- [ ] Add the `event` table to `schema.ts` using the design notes in that file, then run `npm run db:push`
- [ ] Add `eventListQuerySchema` and an `EventSummary` type to `shared/src/index.ts`
- [ ] Create `server/src/routes/events.ts` with `GET /api/events` and `GET /api/events/:id`, copying the pattern in `clubs.ts`
  - Only return upcoming, not-cancelled events, soonest first
  - Join with `club` so each event includes its club's name and slug
- [ ] Mount the router in `server/src/index.ts`
- [ ] Tell Aryan and Rokyo when it's merged

## 2. Restrict sign-up to `@uwo.ca`

- [ ] Follow the TODO in `server/src/auth.ts`
- [ ] Test it: signing up with a gmail address should fail, and a `@uwo.ca` address should work

## 3. Club creation and permissions (the core security work)

- [ ] `POST /api/clubs`: the creator becomes the owner, inside a transaction
- [ ] Write the `requireClubRole(...roles)` middleware (see the TODO in `middleware.ts`)
- [ ] `POST /api/clubs/:clubId/events`: only owners, admins, and editors
- [ ] Member management: add, change role, remove
- [ ] Transfer ownership
- [ ] Enforce **every** rule in the "Club permissions" section of `docs/API.md`

**Think like an attacker.** For each endpoint, ask: what happens if someone who isn't allowed calls it directly, without using our UI? Try it with curl or Postman. Can an editor promote themselves? Can someone edit another club's event by changing the `:clubId` in the URL?

## 4. Remaining tables

- [ ] `profile`, `club_follow`, `connection`: designs are in `schema.ts`
- [ ] The `TODO(advanced)` items: the one-owner-per-club index, the duplicate-connection index, and the event indexes. Research these or ask your AI assistant to _explain_ them, not just write them.

## 5. Stretch goals

- [ ] Image uploads (`server/src/s3.ts` TODO plus `POST /api/uploads`). Only allow image content types.
- [ ] Profile and connection endpoints

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

- [ ] Slug suffix (`western-ai-2`) instead of the 409, as requested in the review

### B. Creating and editing events [unblocks Aryan's event forms]

- [ ] `createEventSchema` in `shared/src/index.ts` (use the `event` table columns)
- [ ] `POST /api/clubs/:clubId/events`: owners, admins, editors (`requireClubRole`)
- [ ] `PATCH /api/events/:id` and `POST /api/events/:id/cancel`. **Security:** look up the event's own `clubId` in the database and check the role in _that_ club. Never trust a `clubId` from the request body.

### C. Image uploads [unblocks Aryan's image upload component and Rokyo's profile pictures]

- [ ] `presignUpload()` in `server/src/s3.ts` (the TODO there)
- [ ] `POST /api/uploads`: `folder` is `clubs`, `events`, or `users`, and image content types only. Returns `{ key, uploadUrl, publicUrl }`.
- [ ] TODO(advanced): a size limit. A presigned PUT can't limit file size; look up S3 _presigned POST_ with `content-length-range`, or accept the risk for the hackathon and note it.

### D. Editing and deleting clubs [unblocks Aryan's club settings page]

- [ ] `PATCH /api/clubs/:clubId`: owner and admin. Name, description, `logoKey`, links. **Don't change the slug.** Check that `logoKey` starts with `clubs/`.
- [ ] `DELETE /api/clubs/:clubId`: owner only
- [ ] `GET /api/me/clubs`: clubs I'm an exec of, with my role. Aryan needs it to decide when to show the "Post event" and "Settings" buttons.
- [ ] Then section 3's member management and ownership transfer, still as planned

### E. Following [unblocks Aryan's follow button and feed, and Rokyo's profiles]

- [ ] `club_follow` table, plus `PUT` / `DELETE /api/clubs/:clubId/follow`
- [ ] `user_follow` table (design in `schema.ts`), plus `PUT` / `DELETE /api/users/:userId/follow`. Return 400 if someone tries to follow themselves, and 404 if the profile isn't public.
- [ ] `GET /api/me/following`: `{ clubs, users }`

### F. Profiles [unblocks Rokyo's profile pages]

- [ ] `profile` table (design in `schema.ts`). Interests must be values from `EVENT_CATEGORIES`; validate with Zod.
- [ ] `GET /api/profiles/:userId` (includes `isFollowing`) and `PUT /api/me/profile`
- [ ] Profile pictures live in `user.image` as a full URL (see `docs/API.md`). Nothing to build for that beyond uploads.

**Think like an attacker, again:** can someone follow a private profile by calling the API directly? Can an editor change a club's logo through `PATCH`? Can someone set their club's `logoKey` to another club's image?
